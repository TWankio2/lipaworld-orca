// src/routes/pre.ts
import express, { Request, Response } from 'express';
import { orcaService } from '../services/orcaService';
import { OrcaTransaction, LimitsCheckRequest, ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

const router = express.Router();

// In-memory storage for demo - replace with Redis/database in production
const userTransactionCache: Map<string, any[]> = new Map();

/**
 * @swagger
 * /oapi/pre/transaction/check:
 *   post:
 *     summary: Pre-transaction risk assessment
 *     description: Checks transaction risk before processing with payment providers
 *     tags: [Pre-Transaction]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionId, userId, amount, currencyCode, direction, provider]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: "Unique transaction identifier"
 *                 example: "txn_123456"
 *               userId:
 *                 type: string
 *                 description: "User identifier"
 *                 example: "user_789"
 *               amount:
 *                 type: number
 *                 description: "Transaction amount"
 *                 example: 1000
 *               currencyCode:
 *                 type: string
 *                 description: "Currency code"
 *                 example: "KES"
 *               direction:
 *                 type: string
 *                 enum: [payin, payout]
 *                 description: "Transaction direction"
 *               actionType:
 *                 type: string
 *                 enum: [topup, withdrawal, purchase]
 *                 description: "Type of action"
 *               provider:
 *                 type: string
 *                 enum: [kotanipay, hifi, voucher]
 *                 description: "Payment provider"
 *               paymentMethod:
 *                 type: string
 *                 enum: [wallet, crypto, bank, vas]
 *                 description: "Payment method"
 *               transactionType:
 *                 type: string
 *                 enum: [onramp, offramp, voucher_purchase]
 *                 description: "Transaction type"
 *               metadata:
 *                 type: object
 *                 properties:
 *                   recipientPhone:
 *                     type: string
 *                     example: "+254700000000"
 *                   chain:
 *                     type: string
 *                     example: "ethereum"
 *                   token:
 *                     type: string
 *                     example: "USDC"
 *                   productId:
 *                     type: string
 *                     example: "voucher_001"
 *           examples:
 *             kotanipay_onramp:
 *               summary: KotaniPay Onramp
 *               value:
 *                 transactionId: "kotani_txn_123"
 *                 userId: "user_456"
 *                 amount: 1000
 *                 currencyCode: "KES"
 *                 direction: "payin"
 *                 actionType: "topup"
 *                 provider: "kotanipay"
 *                 paymentMethod: "wallet"
 *                 transactionType: "onramp"
 *                 metadata:
 *                   recipientPhone: "+254700000000"
 *                   chain: "ethereum"
 *                   token: "USDC"
 *             hifi_offramp:
 *               summary: HiFi Offramp
 *               value:
 *                 transactionId: "hifi_txn_789"
 *                 userId: "user_123"
 *                 amount: 500
 *                 currencyCode: "USD"
 *                 direction: "payout"
 *                 actionType: "withdrawal"
 *                 provider: "hifi"
 *                 paymentMethod: "crypto"
 *                 transactionType: "offramp"
 *             voucher_purchase:
 *               summary: Voucher Purchase
 *               value:
 *                 transactionId: "voucher_txn_456"
 *                 userId: "user_789"
 *                 amount: 250
 *                 currencyCode: "ZAR"
 *                 direction: "payout"
 *                 actionType: "purchase"
 *                 provider: "voucher"
 *                 paymentMethod: "vas"
 *                 transactionType: "voucher_purchase"
 *                 metadata:
 *                   productId: "airtime_mtn"
 *     responses:
 *       200:
 *         description: Risk assessment completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "SUCCESS"
 *                 data:
 *                   type: object
 *                   properties:
 *                     decision:
 *                       type: string
 *                       enum: [ALLOW, REVIEW, BLOCK]
 *                       example: "ALLOW"
 *                     riskScore:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                       example: 25
 *                     riskLevel:
 *                       type: string
 *                       enum: [LOW, MEDIUM, HIGH]
 *                       example: "LOW"
 *                     reasons:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                     recommendedActions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                     checkId:
 *                       type: string
 *                       example: "check_1703251200_abc123"
 *                     internalCheckId:
 *                       type: string
 *                       example: "internal_1703251200_xyz789"
 *                 timestamp:
 *                   type: number
 *                   example: 1703251200000
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */


router.post('/transaction/check', async (req: Request, res: Response) => {

  console.log('🧪 Testing Orca connection before transaction check...');
await orcaService.testConnection();

  try {
    const transactionData: OrcaTransaction = req.body;
    
    // Validation
    if (!transactionData.transactionId || !transactionData.userId || !transactionData.amount) {
      return res.status(400).json({
        status: 'ERROR',
        error: {
          code: 'INVALID_REQUEST',
          message: 'transactionId, userId, and amount are required'
        },
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    // Internal checks first
    const internalCheck = performInternalChecks(transactionData);
    if (internalCheck.decision === 'BLOCK') {
      return res.json({
        status: 'SUCCESS',
        data: internalCheck,
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    // Orca risk check
    const orcaResult = await orcaService.checkTransaction(transactionData);
    
    // Combine internal and Orca results
    const finalDecision = combineRiskAssessments(internalCheck, orcaResult);
    
    res.json({
      status: 'SUCCESS',
      data: finalDecision,
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error: any) {
    logger.error('Transaction check failed', { error: error.message, body: req.body });
    res.status(500).json({
      status: 'ERROR',
      error: {
        code: 'TRANSACTION_CHECK_ERROR',
        message: error.message
      },
      timestamp: Date.now()
    } as ApiResponse);
  }
});

/**
 * @swagger
 * /oapi/pre/limits/check:
 *   post:
 *     summary: Check transaction limits
 *     description: Validate if transaction violates rate limits or transaction limits
 *     tags: [Pre-Transaction]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: "User identifier"
 *                 example: "user_123456"
 *               amount:
 *                 type: number
 *                 description: "Transaction amount"
 *                 example: 1000
 *               currencyCode:
 *                 type: string
 *                 description: "Currency code"
 *                 example: "KES"
 *               timeWindow:
 *                 type: string
 *                 enum: [HOURLY, DAILY, WEEKLY, MONTHLY]
 *                 description: "Time window for limit checking"
 *                 example: "DAILY"
 *           examples:
 *             daily_check:
 *               summary: Daily Limit Check
 *               value:
 *                 userId: "user_123456"
 *                 amount: 5000
 *                 currencyCode: "KES"
 *                 timeWindow: "DAILY"
 *             large_transaction:
 *               summary: Large Transaction Check
 *               value:
 *                 userId: "user_789012"
 *                 amount: 45000
 *                 currencyCode: "KES"
 *                 timeWindow: "DAILY"
 *     responses:
 *       200:
 *         description: Limits check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "SUCCESS"
 *                 data:
 *                   type: object
 *                   properties:
 *                     withinLimits:
 *                       type: boolean
 *                       example: true
 *                     limits:
 *                       type: object
 *                       properties:
 *                         dailyLimit:
 *                           type: number
 *                           example: 100000
 *                         dailyUsed:
 *                           type: number
 *                           example: 15000
 *                         dailyRemaining:
 *                           type: number
 *                           example: 85000
 *                         transactionLimit:
 *                           type: number
 *                           example: 50000
 *                         transactionCount:
 *                           type: number
 *                           example: 3
 *                         transactionCountLimit:
 *                           type: number
 *                           example: 10
 *                     decision:
 *                       type: string
 *                       enum: [ALLOW, BLOCK]
 *                       example: "ALLOW"
 *                 timestamp:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/limits/check', async (req: Request, res: Response) => {
  try {
    const limitsData: LimitsCheckRequest = req.body;
    
    if (!limitsData.userId || !limitsData.amount) {
      return res.status(400).json({
        status: 'ERROR',
        error: {
          code: 'INVALID_REQUEST',
          message: 'userId and amount are required'
        },
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    const limitsCheck = checkTransactionLimits(limitsData);
    
    res.json({
      status: 'SUCCESS',
      data: limitsCheck,
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error: any) {
    logger.error('Limits check failed', { error: error.message, body: req.body });
    res.status(500).json({
      status: 'ERROR',
      error: {
        code: 'LIMITS_CHECK_ERROR',
        message: error.message
      },
      timestamp: Date.now()
    } as ApiResponse);
  }
});

function performInternalChecks(transaction: OrcaTransaction) {
  const reasons: string[] = [];
  let decision: 'ALLOW' | 'REVIEW' | 'BLOCK' = 'ALLOW';
  
  // Amount checks
  if (transaction.amount > config.limits.singleTransactionLimit) {
    reasons.push('Amount exceeds single transaction limit');
    decision = 'BLOCK';
  }
  
  // Provider-specific checks
  if (transaction.provider === 'voucher' && transaction.amount > 10000) {
    reasons.push('High-value voucher purchase requires review');
    decision = 'REVIEW';
  }
  
  // Currency-specific checks
  if (transaction.currencyCode === 'USD' && transaction.amount > 2000) {
    reasons.push('High USD transaction requires review');
    decision = 'REVIEW';
  }
  
  return {
    status: 'SUCCESS',
    decision,
    riskScore: decision === 'BLOCK' ? 100 : decision === 'REVIEW' ? 75 : 25,
    riskLevel: decision === 'BLOCK' ? 'HIGH' : decision === 'REVIEW' ? 'MEDIUM' : 'LOW',
    reasons,
    checkId: `internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  };
}

function combineRiskAssessments(internal: any, orca: any) {
  // Take the more restrictive action
  const actions = ['ALLOW', 'REVIEW', 'BLOCK'];
  const internalActionIndex = actions.indexOf(internal.decision);
  const orcaActionIndex = actions.indexOf(orca.action);
  
  const finalAction = actions[Math.max(internalActionIndex, orcaActionIndex)];
  const maxRiskScore = Math.max(internal.riskScore, orca.riskScore);
  
  return {
    decision: finalAction,
    riskScore: maxRiskScore,
    riskLevel: maxRiskScore >= 80 ? 'HIGH' : maxRiskScore >= 50 ? 'MEDIUM' : 'LOW',
    reasons: [...(internal.reasons || []), ...(orca.reasons || [])],
    recommendedActions: orca.recommendedActions || [],
    checkId: orca.checkId,
    internalCheckId: internal.checkId,
    timestamp: Date.now()
  };
}

function checkTransactionLimits(limitsData: LimitsCheckRequest) {
  // Mock implementation - replace with actual database queries
  const userTransactions = userTransactionCache.get(limitsData.userId) || [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyTransactions = userTransactions.filter(tx => 
    new Date(tx.timestamp) >= today
  );
  
  const dailyAmount = dailyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const newDailyAmount = dailyAmount + limitsData.amount;
  
  const withinLimits = newDailyAmount <= config.limits.dailyTransactionLimit &&
                      dailyTransactions.length < config.limits.hourlyTransactionCount &&
                      limitsData.amount <= config.limits.singleTransactionLimit;
  
  return {
    withinLimits,
    limits: {
      dailyLimit: config.limits.dailyTransactionLimit,
      dailyUsed: dailyAmount,
      dailyRemaining: config.limits.dailyTransactionLimit - dailyAmount,
      transactionLimit: config.limits.singleTransactionLimit,
      transactionCount: dailyTransactions.length,
      transactionCountLimit: config.limits.hourlyTransactionCount
    },
    decision: withinLimits ? 'ALLOW' : 'BLOCK',
    timestamp: Date.now()
  };
}

export default router;