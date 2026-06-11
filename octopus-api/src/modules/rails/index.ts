// Klokd v3 — KMV Platform Rails Module
// Single import surface for all rail clients.

export { paymentRailClient } from './payment-rail.client';
export { identityRailClient } from './identiti.client';
export { commsRailClient } from './todoku.client';
export { helpanRailClient, HELPAN_KLOKD_AGENT_ID } from './helpan.client';
export { TODOKU_TEMPLATES } from './templates';

export type { TodokuTemplateId } from './templates';
export type * from './payment-rail.dto';
export type * from './identiti.dto';
export type * from './todoku.dto';
export type * from './helpan.dto';
