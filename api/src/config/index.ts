import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  otp: {
    apiKey: process.env.AT_API_KEY || '',
    username: process.env.AT_USERNAME || '',
    senderId: process.env.AT_SENDER_ID || 'Klokd',
    expiryMinutes: 5,
    maxAttempts: 3,
    windowMinutes: 10,
  },

  daraja: {
    consumerKey: process.env.DARAJA_CONSUMER_KEY || '',
    consumerSecret: process.env.DARAJA_CONSUMER_SECRET || '',
    passkey: process.env.DARAJA_PASSKEY || '',
    shortcode: process.env.DARAJA_SHORTCODE || '',
    b2cSecurityCredential: process.env.DARAJA_B2C_SECURITY_CREDENTIAL || '',
    env: process.env.DARAJA_ENV || 'sandbox',
  },

  aws: {
    region: process.env.AWS_REGION || 'af-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'klokd-documents',
  },

  platform: {
    feePercent: 4,
    gpsClockInRadiusMeters: parseInt(process.env.GPS_CLOCK_IN_RADIUS_METERS || '500', 10),
    escrowAutoReleaseHours: parseInt(process.env.ESCROW_AUTO_RELEASE_HOURS || '4', 10),
    section37WarnDays: 20,
    section37AcknowledgeDays: 25,
    section37BlockDays: 30,
    minRatingsForDisplay: 3,
    dataRetentionYears: 7,
  },

  defaultTenantId: 'klokd-ke-default',
} as const;
