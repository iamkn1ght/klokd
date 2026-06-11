import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { identityRailClient } from '../rails/identiti.client';
import { commsRailClient } from '../rails/todoku.client';
import { TODOKU_TEMPLATES } from '../rails/templates';

// Klokd v3 Demo — bare-metal rail flow visualizer.
// Each endpoint wraps a single rail call and returns BOTH the rail's response
// AND the Klokd-side decisions made around it (what we passed, what we stored,
// what we deliberately did NOT store per cardinal rule).

const router = Router();

router.post('/identiti/create-customer', async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      phone: z.string(),
      nameFirst: z.string(),
      nameLast: z.string(),
      dpaConsent: z.boolean(),
      kycConsent: z.boolean(),
    });
    const data = schema.parse(req.body);

    const klokdRequest = {
      phone: data.phone,
      nameFirst: data.nameFirst,
      nameLast: data.nameLast,
      appCorrelation: `klokd_demo_${Date.now()}`,
      consent: {
        dpa_consent: data.dpaConsent,
        kyc_consent: data.kycConsent,
        marketing_consent: false,
        captured_at: new Date().toISOString(),
        captured_via: 'app_onboarding' as const,
      },
    };

    const identitiResponse = await identityRailClient.createCustomer(klokdRequest);

    res.json({
      klokdSent: klokdRequest,
      identitiReturned: identitiResponse,
      klokdStores: {
        accountUuid: identitiResponse.accountUuid,
        kycTier: parseInt(identitiResponse.tier.split('_')[1] ?? '0', 10),
      },
      klokdDoesNotStore: [
        'National ID number (Identiti handles IPRS lookup)',
        'Phone number (only as opaque lookup key, never in logs)',
        'Biometric data or ID images',
      ],
    });
  } catch (e) { next(e); }
});

router.get('/identiti/tier/:uuid', async (req: Request, res: Response, next) => {
  try {
    const tier = await identityRailClient.getTier(req.params.uuid as `acc_${string}`);
    res.json({
      klokdCalled: `GET /v1/customers/${req.params.uuid}/tier`,
      identitiReturned: tier,
    });
  } catch (e) { next(e); }
});

router.post('/identiti/step-up', async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({ accountUuid: z.string() });
    const data = schema.parse(req.body);

    const challenge = await identityRailClient.createStepUpChallenge({
      accountUuid: data.accountUuid as `acc_${string}`,
      operationAudience: 'https://api.klokd.co.ke',
      operationKind: 'klokd.login',
      operationRiskTier: 'low',
      factor: 'phone_otp',
    });
    res.json({
      klokdCalled: 'POST /v1/stepup/challenges',
      identitiReturned: challenge,
      note:
        'In sandbox, Identiti echoes otp_plaintext for dev convenience. ' +
        'In production this field is stripped — OTP arrives via Todoku SMS only.',
    });
  } catch (e) { next(e); }
});

router.post('/identiti/phone-token', async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({ accountUuid: z.string() });
    const data = schema.parse(req.body);

    const tok = await identityRailClient.issuePhoneToken({
      accountUuid: data.accountUuid as `acc_${string}`,
      audience: 'todoku',
    });
    res.json({
      klokdCalled: 'POST /v1/phone-tokens',
      identitiReturned: {
        jti: tok.jti,
        audience: tok.audience,
        expiresAt: tok.expiresAt,
        phoneTokenPreview: tok.phoneToken.slice(0, 40) + '...',
      },
      cardinalRule:
        'Klokd RECEIVES this token but NEVER caches beyond 15-min freshness window. ' +
        'Pass to Todoku, then discard. Phone number is never seen by Klokd.',
    });
  } catch (e) { next(e); }
});

router.post('/todoku/send', async (req: Request, res: Response, next) => {
  try {
    const schema = z.object({
      templateId: z.string(),
      channel: z.enum(['sms', 'whatsapp', 'voice']),
      variables: z.record(z.string(), z.string()),
    });
    const data = schema.parse(req.body);

    // Sandbox shim — Todoku's sandbox doesn't validate real Identiti JWTs yet
    // (cross-rail coordination gap, escalated to Silvia). Use synthesized
    // sandbox token until that's resolved.
    const sandboxToken = `SANDBOX_TOKEN_DELIVER_OK_klokd_demo_${Date.now()}`;

    const directBody = {
      recipient_token: sandboxToken,
      template_id: data.templateId,
      channel: data.channel,
      template_variables: data.variables,
    };

    // Call Todoku via raw HTTP so we can use the sandbox token directly.
    const crypto = await import('crypto');
    const { config } = await import('../../config');
    const serialized = JSON.stringify(directBody);
    const contentType = 'application/json; charset=utf-8';
    const timestamp = new Date().toISOString();
    const bodyHash = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
    const canonical = ['POST', '/v1/messages/send', contentType, timestamp, bodyHash].join('\n');
    const sig = crypto
      .createHmac('sha256', config.todoku.appSecret)
      .update(canonical, 'utf8')
      .digest('base64');

    const r = await fetch(`${config.todoku.baseUrl}/v1/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Todoku-HMAC-SHA256 app_id=${config.todoku.appId}, signature=${sig}`,
        'X-Todoku-Timestamp': timestamp,
        'X-Idempotency-Key': crypto.randomUUID(),
        'Content-Type': contentType,
      },
      body: serialized,
    });
    const todokuResponse = await r.json();

    res.json({
      klokdSent: {
        endpoint: 'POST /v1/messages/send',
        body: directBody,
      },
      todokuReturned: todokuResponse,
      cardinalRule:
        'Klokd passes only the recipient_token (Identiti JWT in prod). ' +
        'Phone number, M-Pesa number, or any PII never crosses this boundary.',
      sandboxNote:
        'Using SANDBOX_TOKEN_DELIVER_OK_* prefix because Todoku sandbox does ' +
        'not validate real Identiti JWTs yet. Production handles this transparently.',
    });
  } catch (e) { next(e); }
});

router.get('/templates', (_req: Request, res: Response) => {
  res.json({ todokuTemplates: TODOKU_TEMPLATES });
});

export default router;
