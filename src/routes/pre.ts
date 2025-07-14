// src/routes/pre.ts
import express, { Request, Response } from 'express';
import { orcaService } from '../services/orcaService';
import { OrcaTransaction, LimitsCheckRequest, ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

const router = express.Router();

// In-memory storage for demo - replace with Redis/database in production
const userTransactionCache: Map<string, any[]> = new Map();

// POST /oapi/pre/transaction/check
router.post('/transaction/check', async (req: Request, res: Response) => {
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

// POST /oapi/pre/limits/check
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