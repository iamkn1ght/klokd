import prisma from '../../config/database';

/**
 * Notification Service — FCM primary, WhatsApp Business API fallback at 5 min.
 * Stubs for MVP development — production integration in Sprint 6.
 */
export class NotificationService {
  /**
   * Send a notification via FCM. Falls back to WhatsApp after 5 minutes.
   */
  async send(params: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    channel?: 'fcm' | 'whatsapp';
  }) {
    const notification = await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        channel: params.channel || 'fcm',
        type: params.type,
        title: params.title,
        body: params.body,
      },
    });

    // In production: send via FCM
    // If not acknowledged in 5 minutes, send via WhatsApp Business API
    console.log(`[NOTIFICATION] ${params.channel || 'fcm'}: ${params.title} → ${params.userId}`);

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
