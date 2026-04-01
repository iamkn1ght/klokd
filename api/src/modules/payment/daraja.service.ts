import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';

/**
 * Daraja Service — Safaricom M-Pesa API integration.
 * Handles STK Push (C2B) for escrow funding and B2C for worker disbursement.
 *
 * In sandbox mode: simulates all calls with deterministic refs.
 * In production: calls Daraja API endpoints with OAuth2 token.
 */
export class DarajaService {
  private baseUrl: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.baseUrl = config.daraja.env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get OAuth2 access token (cached until expiry).
   */
  private async getToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    if (config.daraja.env === 'sandbox' && !config.daraja.consumerKey) {
      return 'SANDBOX-TOKEN';
    }

    const credentials = Buffer.from(
      `${config.daraja.consumerKey}:${config.daraja.consumerSecret}`
    ).toString('base64');

    const res = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${credentials}` },
    });

    if (!res.ok) throw new AppError(502, 'Daraja OAuth failed');

    const data = await res.json() as { access_token: string; expires_in: string };
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (parseInt(data.expires_in) - 60) * 1000,
    };

    return this.tokenCache.token;
  }

  /**
   * STK Push — employer funds escrow.
   */
  async stkPush(params: {
    phoneNumber: string;
    amountKes: number;
    accountRef: string;
    description: string;
    callbackUrl: string;
  }): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
    if (config.daraja.env === 'sandbox' && !config.daraja.consumerKey) {
      return {
        checkoutRequestId: `STK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        merchantRequestId: `MER-${Date.now()}`,
      };
    }

    const token = await this.getToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = Buffer.from(
      `${config.daraja.shortcode}${config.daraja.passkey}${timestamp}`
    ).toString('base64');

    const res = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: config.daraja.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: params.amountKes,
        PartyA: params.phoneNumber,
        PartyB: config.daraja.shortcode,
        PhoneNumber: params.phoneNumber,
        CallBackURL: params.callbackUrl,
        AccountReference: params.accountRef,
        TransactionDesc: params.description,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AppError(502, `STK Push failed: ${err}`);
    }

    const data = await res.json() as {
      CheckoutRequestID: string;
      MerchantRequestID: string;
    };

    return {
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
    };
  }

  /**
   * B2C — disburse payment to worker's M-Pesa.
   */
  async b2cPayment(params: {
    phoneNumber: string;
    amountKes: number;
    remarks: string;
    occasion: string;
    resultUrl: string;
    timeoutUrl: string;
  }): Promise<{ conversationId: string; originatorConversationId: string }> {
    if (config.daraja.env === 'sandbox' && !config.daraja.consumerKey) {
      return {
        conversationId: `B2C-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        originatorConversationId: `ORIG-${Date.now()}`,
      };
    }

    const token = await this.getToken();

    const res = await fetch(`${this.baseUrl}/mpesa/b2c/v3/paymentrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        OriginatorConversationID: `klokd-${Date.now()}`,
        InitiatorName: 'klokd',
        SecurityCredential: config.daraja.b2cSecurityCredential,
        CommandID: 'BusinessPayment',
        Amount: params.amountKes,
        PartyA: config.daraja.shortcode,
        PartyB: params.phoneNumber,
        Remarks: params.remarks,
        Occasion: params.occasion,
        QueueTimeOutURL: params.timeoutUrl,
        ResultURL: params.resultUrl,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AppError(502, `B2C payment failed: ${err}`);
    }

    const data = await res.json() as {
      ConversationID: string;
      OriginatorConversationID: string;
    };

    return {
      conversationId: data.ConversationID,
      originatorConversationId: data.OriginatorConversationID,
    };
  }
}

export const darajaService = new DarajaService();
