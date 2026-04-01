import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  tenantId: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface ComplianceCalculation {
  grossKes: number;
  payeKes: number;
  nssfTier1Kes: number;
  nssfTier2Kes: number;
  shifKes: number;
  ahlKes: number;
  netKes: number;
  employerNssfKes: number;
  employerAhlKes: number;
  nitaKes: number;
}

export interface Section37Check {
  workerEmployerDays: number;
  warning: boolean;
  acknowledgementRequired: boolean;
  blocked: boolean;
  message: string;
}
