// Klokd v3 — KMV Platform Rails Module
// Single import surface: import { paymentRailClient, identityRailClient, commsRailClient } from '../rails'

export { paymentRailClient } from './payment-rail.client';
export { identityRailClient } from './identiti.client';
export { commsRailClient } from './todoku.client';
export { TODOKU_TEMPLATES } from './templates';

export type { TodokuTemplateId } from './templates';
export type * from './payment-rail.dto';
export type * from './identiti.dto';
export type * from './todoku.dto';
