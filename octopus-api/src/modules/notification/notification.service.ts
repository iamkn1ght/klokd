import prisma from '../../config/database';
import { config } from '../../config';
import { commsRailClient, TODOKU_TEMPLATES } from '../rails';
import type { TodokuTemplateId } from '../rails';

// Klokd v3 — Notification Service (C3: revised S6-04)
// FCM/Expo Push remains a direct Klokd integration (AD-K05).
// WhatsApp + SMS fallback flow through Todoku (AD-K03) — Klokd never holds phone numbers.

const FALLBACK_DELAY_MS = 5 * 60 * 1000;

export class NotificationService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  async send(params: {
    tenantId: string;
    userId: string;
    accountUuid?: string | null;
    type: string;
    title: string;
    body: string;
    templateId?: TodokuTemplateId;
    templateVariables?: Record<string, string>;
  }) {
    const notification = await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        channel: 'push',
        type: params.type,
        title: params.title,
        body: params.body,
      },
    });

    let pushAcknowledged = false;
    if (config.expoPush.accessToken) {
      try {
        const res = await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.expoPush.accessToken}`,
          },
          body: JSON.stringify({
            to: params.userId,
            title: params.title,
            body: params.body,
            data: { type: params.type },
            sound: 'default',
          }),
        });
        pushAcknowledged = res.ok;
      } catch (err) {
        console.error('[NOTIFICATION] Expo Push failed:', err);
      }
    } else {
      console.log(`[NOTIFICATION] push: ${params.title} -> ${params.userId}`);
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { sent: true, sentAt: new Date() },
    });

    // Todoku WhatsApp fallback after 5 min if push not acknowledged AND we have a template.
    if (!pushAcknowledged && params.accountUuid && params.templateId) {
      this.scheduleTodokuFallback({
        tenantId: params.tenantId,
        accountUuid: params.accountUuid,
        templateId: params.templateId,
        variables: params.templateVariables ?? {},
      });
    }

    return notification;
  }

  private scheduleTodokuFallback(params: {
    tenantId: string;
    accountUuid: string;
    templateId: TodokuTemplateId;
    variables: Record<string, string>;
  }): void {
    setTimeout(async () => {
      try {
        const resp = await commsRailClient.sendWhatsApp(
          params.accountUuid,
          params.templateId,
          params.variables
        );
        await prisma.notificationLog.create({
          data: {
            tenantId: params.tenantId,
            accountUuid: params.accountUuid,
            channel: resp.channel,
            templateId: params.templateId,
            todokuMessageId: resp.messageId,
            status: 'SENT',
          },
        });
      } catch (err) {
        console.error('[NOTIFICATION] Todoku WhatsApp fallback failed:', err);
      }
    }, FALLBACK_DELAY_MS);
  }

  async notifyShiftConfirmed(
    tenantId: string,
    workerId: string,
    shiftRole: string,
    venue: string,
    date: string,
    time: string,
    amountKes: number
  ) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: { user: true },
    });
    if (!worker) return;

    await this.send({
      tenantId,
      userId: worker.userId,
      accountUuid: worker.accountUuid,
      type: 'shift.confirmed',
      title: 'Shift Confirmed',
      body: `You've been selected for ${shiftRole} at ${venue}. Check your app for details.`,
      // WhatsApp variant preferred; caller can swap to SHIFT_CONFIRMED_SMS if WA fails.
      templateId: TODOKU_TEMPLATES.SHIFT_CONFIRMED_WA,
      templateVariables: {
        worker_name: worker.firstName,
        role: shiftRole,
        venue,
        date,
        time,
        amount_kes: String(amountKes),
      },
    });
  }

  async notifyPaymentSent(
    tenantId: string,
    workerId: string,
    amountKes: number,
    mpesaRef: string
  ) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: { user: true },
    });
    if (!worker) return;

    await this.send({
      tenantId,
      userId: worker.userId,
      accountUuid: worker.accountUuid,
      type: 'payment.sent',
      title: 'Paid!',
      body: `KES ${amountKes.toLocaleString()} has been sent to your M-Pesa.`,
      templateId: TODOKU_TEMPLATES.PAYMENT_RECEIVED_WA,
      templateVariables: {
        worker_name: worker.firstName,
        amount_kes: String(amountKes),
        mpesa_ref: mpesaRef,
      },
    });
  }
}

export const notificationService = new NotificationService();
