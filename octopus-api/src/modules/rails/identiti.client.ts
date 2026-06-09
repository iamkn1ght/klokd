import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import type {
  IdentitiCreateAccountRequest,
  IdentitiCreateAccountResponse,
  IdentitiLookupRequest,
  IdentitiLookupResponse,
  IdentitiVerifyOtpRequest,
  IdentitiVerifyOtpResponse,
  IdentitiKycSubmitRequest,
  IdentitiKycSubmitResponse,
  IdentitiKycSummary,
  IdentitiPhoneTokenRequest,
  IdentitiPhoneTokenResponse,
  IdentitiStepUpRequest,
  IdentitiStepUpInitResponse,
  IdentitiStepUpResultResponse,
} from './identiti.dto';

// Klokd v3 — Identity Service rail client (S3-NEW-01)
// All identity concerns delegated to Identiti (AD-K02, AD-K10).
// Klokd retains only: account_uuid (primary FK) + kyc_tier (cached signal).

class IdentityRailClient {
  private get baseUrl(): string {
    return config.identiti.baseUrl;
  }

  private get apiKey(): string {
    return config.identiti.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new AppError(
        503,
        'Identiti not configured. Set IDENTITI_BASE_URL and IDENTITI_API_KEY.'
      );
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AppError(502, `Identiti ${method} ${path} failed (${res.status}): ${detail}`);
    }

    return res.json() as Promise<T>;
  }

  // ─── Accounts ────────────────────────────────────────

  async createAccount(req: IdentitiCreateAccountRequest): Promise<IdentitiCreateAccountResponse> {
    return this.request<IdentitiCreateAccountResponse>('POST', '/accounts', {
      phone: req.phone,
    });
  }

  async lookupAccount(req: IdentitiLookupRequest): Promise<IdentitiLookupResponse> {
    return this.request<IdentitiLookupResponse>('POST', '/accounts/lookup', {
      phone_token: req.phoneToken,
    });
  }

  async verifyOtp(req: IdentitiVerifyOtpRequest): Promise<IdentitiVerifyOtpResponse> {
    return this.request<IdentitiVerifyOtpResponse>('POST', '/accounts/verify-otp', {
      account_uuid: req.accountUuid,
      otp: req.otp,
    });
  }

  // ─── KYC ─────────────────────────────────────────────

  async submitKycDocuments(req: IdentitiKycSubmitRequest): Promise<IdentitiKycSubmitResponse> {
    return this.request<IdentitiKycSubmitResponse>('POST', '/kyc/documents', {
      account_uuid: req.accountUuid,
      id_front: req.idFront,
      id_back: req.idBack,
      selfie: req.selfie,
    });
  }

  async getKycSummary(accountUuid: string): Promise<IdentitiKycSummary> {
    return this.request<IdentitiKycSummary>('GET', `/accounts/${accountUuid}/kyc-summary`);
  }

  // ─── Phone tokens (per-call freshness; never cache > 15 min) ─

  async issuePhoneToken(req: IdentitiPhoneTokenRequest): Promise<IdentitiPhoneTokenResponse> {
    return this.request<IdentitiPhoneTokenResponse>('POST', '/tokens/phone', {
      account_uuid: req.accountUuid,
      audience: req.audience,
    });
  }

  // ─── Step-up ─────────────────────────────────────────

  async initiateStepUp(req: IdentitiStepUpRequest): Promise<IdentitiStepUpInitResponse> {
    return this.request<IdentitiStepUpInitResponse>('POST', '/tokens/step-up', {
      account_uuid: req.accountUuid,
      operation: req.operation,
      context_ref: req.contextRef,
    });
  }

  async getStepUpResult(challengeId: string): Promise<IdentitiStepUpResultResponse> {
    return this.request<IdentitiStepUpResultResponse>('GET', `/tokens/step-up/${challengeId}`);
  }
}

export const identityRailClient = new IdentityRailClient();
