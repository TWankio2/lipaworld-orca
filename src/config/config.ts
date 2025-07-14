// src/config/config.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  
  // Orca API Configuration
  orcaApiUrl: process.env.ORCA_API_URL || 'https://sandbox.api-orca.com',
  orcaApiKey: process.env.ORCA_API_KEY || '',
  orcaTimeout: parseInt(process.env.ORCA_TIMEOUT || '3000'),
  
  // Service Authentication
  serviceApiKey: process.env.SERVICE_API_KEY || '',
  
  // Rate Limiting
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === 'true',
  rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
  
  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  
  // Business Rules
  riskThresholds: {
    blockThreshold: parseInt(process.env.BLOCK_THRESHOLD || '90'),
    reviewThreshold: parseInt(process.env.REVIEW_THRESHOLD || '70'),
  },
  
  // Transaction Limits
  limits: {
    dailyTransactionLimit: parseInt(process.env.DAILY_TRANSACTION_LIMIT || '100000'),
    singleTransactionLimit: parseInt(process.env.SINGLE_TRANSACTION_LIMIT || '50000'),
    hourlyTransactionCount: parseInt(process.env.HOURLY_TRANSACTION_COUNT || '10'),
  },
  
  // Defaults
  defaultVoucherCurrency: process.env.DEFAULT_VOUCHER_CURRENCY || 'ZAR',
};