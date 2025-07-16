
export interface OrcaUser {
  userId: string;
  email?: string;
  phone?: string;
  registrationTimestamp: number;
  metadata?: {
    kycStatus?: 'PENDING' | 'COMPLETED' | 'FAILED';
    accountType?: 'INDIVIDUAL' | 'BUSINESS';
    referralSource?: string;
    sourceOfIncome?: string;
  };
}

export interface OrcaTransaction {
  transactionId: string;
  userId: string;
  amount: number;
  currencyCode: string;
  direction: 'payin' | 'payout';
  actionType: 'topup' | 'withdrawal' | 'purchase';
  provider: 'kotanipay' | 'hifi' | 'voucher';
  paymentMethod: 'wallet' | 'crypto' | 'bank' | 'vas';
  transactionType: 'onramp' | 'offramp' | 'voucher_purchase';
  metadata?: {
    userRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    dailyTransactionCount?: number;
    dailyTransactionAmount?: number;
    recipientPhone?: string;
    chain?: string;
    token?: string;
    productId?: string;
  };
}

export interface OrcaRiskResponse {
  status: 'SUCCESS' | 'ERROR';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  reasons?: string[];
  recommendedActions?: string[];
  checkId?: string;
  timestamp: number;
}

export interface LimitsCheckRequest {
  userId: string;
  amount: number;
  currencyCode: string;
  timeWindow: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface TransactionReportRequest {
  transactionId: string;
  checkId: string;
  finalStatus: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  actualAmount?: number;
  processingTime?: number;
  provider: 'kotanipay' | 'hifi' | 'voucher';
  transactionType: 'onramp' | 'offramp' | 'voucher_purchase';
  providerResponse: {
    status: string;
    referenceId?: string;
    externalId?: string;
    errorCode?: string;
    transactionHash?: string;
  };
  timestamp: number;
}

export interface ApiResponse<T = any> {
  status: 'SUCCESS' | 'ERROR';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}