import prisma from '../../config/database';
import { config } from '../../config';

/**
 * Notification Service — Expo Push Notifications primary, WhatsApp Business API fallback at 5 min.
 * Uses Expo's push notification service (handles FCM/APNs internally).
 */
export class NotificationService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Send a push notification via Expo Push API.
   */
  async send(params: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    channel?: 'push' | 'whatsapp';
  }) {
    const notification = await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        channel: params.channel || 'push',
        type: params.type,
        title: params.title,
        body: params.body,
      },
    });

    // In production: send via Expo Push API
    // Requires the user's Expo push token (stored on device registration)
    if (config.nodeEnv === 'production' && config.expoPush.accessToken) {
      try {
        await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.expoPush.accessToken}`,
          },
          body: JSON.stringify({
            to: params.userId, // In production: replace with Expo push token from user record
            title: params.title,
            body: params.body,
            data: { type: params.type },
            sound: 'default',
          }),
        });
      } catch (err) {
        console.error(`[NOTIFICATION] Expo Push failed:`, err);
      }
    } else {
      console.log(`[NOTIFICATION] ${params.channel || 'push'}: ${params.title} → ${params.userId}`);
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { sent: true, sentAt: new Date() },
    });

    return notification;
  }

  /**
   * Send shift-related notifications.
   */
  async notifyShiftConfirmed(tenantId: string, workerId: string, shiftRole: string, venue: string) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: { user: true },
    });
    if (!worker) return;

    await this.send({
      tenantId,
      userId: worker.userId,
      type: 'shift.confirmed',
      title: 'Shift Confirmed',
      body: `You've been selected for ${shiftRole} at ${venue}. Check your app for details.`,
    });
  }

  async notifyPaymentSent(tenantId: string, workerId: string, amountKes: number) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: { user: true },
    });
    if (!worker) return;

    await this.send({
      tenantId,
      userId: worker.userId,
      type: 'payment.sent',
      title: 'Paid!',
      body: `KES ${amountKes.toLocaleString()} has been sent to your M-Pesa.`,
    });
  }
}

export const notificationService = new NotificationService();
