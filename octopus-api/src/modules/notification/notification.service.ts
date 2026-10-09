import prisma from '../../config/database';
import { config } from '../../config';
import { commsRailClient, TODOKU_TEMPLATES } from '../rails';
import type { TodokuTemplateId } from '../rails';

// Klokd v3 — Notification Service (C3: revised S6-04)
//
// Every notification is stored first — that row IS the in-app inbox
// (GET /me/notifications). Delivery on top of it:
//   1. Expo push to every device token the user registered (AD-K05, direct).
//   2. Todoku WhatsApp/SMS fallback after 5 min when no push was accepted and
//      the caller supplied a template (AD-K03) — Klokd never holds numbers.

const FALLBACK_DELAY_MS = 5 * 60 * 1000;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export class NotificationService {
  async send(params: {
    tenantId: string;
    userId: string;
    accountUuid?: string | null;
    type: string;
    title: string;
    body: string;
    shiftId?: string;
    templateId?: TodokuTemplateId;
    templateVariables?: Record<string, string>;
  }) {
    const notification = await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        channel: 'in_app',
        type: params.type,
        title: params.title,
        body: params.body,
        shiftId: params.shiftId,
      },
    });

    const pushAccepted = await this.push(params.userId, {
      title: params.title,
      body: params.body,
      data: { type: params.type, notificationId: notification.id, shiftId: params.shiftId ?? null },
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: pushAccepted ? { channel: 'push', sent: true, sentAt: new Date() } : { sent: true, sentAt: new Date() },
    });

    if (!pushAccepted && params.accountUuid && params.templateId) {
      this.scheduleTodokuFallback({
        tenantId: params.tenantId,
        accountUuid: params.accountUuid,
        templateId: params.templateId,
        variables: params.templateVariables ?? {},
      });
    }

    return notification;
  }

  /** Expo push to every registered device. Returns true if any device accepted it. */
  private async push(userId: string, message: { title: string; body: string; data: Record<string, unknown> }) {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return false;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(config.expoPush.accessToken ? { Authorization: `Bearer ${config.expoPush.accessToken}` } : {}),
        },
        body: JSON.stringify(tokens.map(t => ({ to: t.token, sound: 'default', ...message }))),
      });
      if (!res.ok) return false;
      const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      const tickets = json?.data ?? [];
      // Drop tokens Expo says no longer exist (app uninstalled / reinstalled).
      const dead = tickets
        .map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? tokens[i]?.token : null))
        .filter((t): t is string => !!t);
      if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
      return tickets.some(t => t.status === 'ok');
    } catch (err) {
      console.error('[NOTIFICATION] Expo push failed:', err);
      return false;
    }
  }

  async registerPushToken(userId: string, token: string, platform: string) {
    return prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  private scheduleTodokuFallback(params: {
    tenantId: string;
    accountUuid: string;
    templateId: TodokuTemplateId;
    variables: Record<string, string>;
  }): void {
    const timer = setTimeout(async () => {
      try {
        const resp = await commsRailClient.sendWhatsApp(params.accountUuid, params.templateId, params.variables);
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
        console.error('[NOTIFICATION] Todoku fallback failed:', (err as Error).message);
      }
    }, FALLBACK_DELAY_MS);
    timer.unref?.();
  }

  async notifyShiftConfirmed(
    tenantId: string,
    workerId: string,
    shiftId: string,
    shiftRole: string,
    venue: string,
    date: string,
    time: string,
    amountKes: number,
    directOffer = false
  ) {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) return;

    await this.send({
      tenantId,
      userId: worker.userId,
      accountUuid: worker.accountUuid,
      type: directOffer ? 'shift.offered' : 'shift.confirmed',
      title: directOffer ? `${venue} wants you back` : 'You got the shift',
      body: directOffer
        ? `${venue} offered you a ${shiftRole} shift on ${date}, ${time} for KES ${amountKes.toLocaleString()}. Open the app to accept or decline.`
        : `${venue} picked you for ${shiftRole} on ${date}, ${time}. Confirm in the app so they know you’re coming.`,
      shiftId,
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

  async notifyPaymentSent(tenantId: string, workerId: string, shiftId: string, amountKes: number, mpesaRef: string) {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) return;

    await this.send({
      tenantId,
      userId: worker.userId,
      accountUuid: worker.accountUuid,
      type: 'payment.sent',
      title: 'Paid',
      body: `KES ${amountKes.toLocaleString()} has been sent to your M-Pesa${mpesaRef ? ` (ref ${mpesaRef})` : ''}.`,
      shiftId,
      templateId: TODOKU_TEMPLATES.PAYMENT_RECEIVED_WA,
      templateVariables: { worker_name: worker.firstName, amount_kes: String(amountKes), mpesa_ref: mpesaRef },
    });
  }
}

export const notificationService = new NotificationService();
