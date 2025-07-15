// src/routes/post.ts
import express, { Request, Response } from 'express';
import { orcaService } from '../services/orcaService';
import { TransactionReportRequest, ApiResponse } from '../types';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /oapi/post/transaction/report:
 *   post:
 *     summary: Report final transaction outcome
 *     description: Report the final status of a transaction to Orca for learning and pattern detection
 *     tags: [Post-Transaction]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionId, checkId, finalStatus]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 example: "txn_123456"
 *               checkId:
 *                 type: string
 *                 example: "check_1234567890_abc123"
 *               finalStatus:
 *                 type: string
 *                 enum: [COMPLETED, FAILED, CANCELLED]
 *                 example: "COMPLETED"
 *               actualAmount:
 *                 type: number
 *                 example: 1000
 *               processingTime:
 *                 type: number
 *                 description: "Processing time in milliseconds"
 *                 example: 2500
 *               provider:
 *                 type: string
 *                 enum: [kotanipay, hifi, voucher]
 *                 example: "kotanipay"
 *               transactionType:
 *                 type: string
 *                 enum: [onramp, offramp, voucher_purchase]
 *                 example: "onramp"
 *               providerResponse:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: "success"
 *                   referenceId:
 *                     type: string
 *                     example: "ref_789"
 *                   externalId:
 *                     type: string
 *                     example: "ext_456"
 *                   errorCode:
 *                     type: string
 *                     example: null
 *                   transactionHash:
 *                     type: string
 *                     example: "0x123abc..."
 *               timestamp:
 *                 type: number
 *                 example: 1703251200000
 *     responses:
 *       200:
 *         description: Transaction reported successfully
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
 *                     status:
 *                       type: string
 *                       example: "SUCCESS"
 *                     reportId:
 *                       type: string
 *                       example: "report_1703251200000"
 *                 timestamp:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/transaction/report', async (req: Request, res: Response) => {
  try {
    const reportData: TransactionReportRequest = req.body;
    
    // Validation
    if (!reportData.transactionId || !reportData.checkId || !reportData.finalStatus) {
      return res.status(400).json({
        status: 'ERROR',
        error: {
          code: 'INVALID_REQUEST',
          message: 'transactionId, checkId, and finalStatus are required'
        },
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    const result = await orcaService.reportTransaction(reportData);
    
    // Update internal transaction cache for limits tracking
    updateTransactionCache(reportData);
    
    res.json({
      status: 'SUCCESS',
      data: result,
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error: any) {
    logger.error('Transaction report failed', { error: error.message, body: req.body });
    res.status(500).json({
      status: 'ERROR',
      error: {
        code: 'TRANSACTION_REPORT_ERROR',
        message: error.message
      },
      timestamp: Date.now()
    } as ApiResponse);
  }
});

/**
 * @swagger
 * /oapi/post/transaction/feedback:
 *   post:
 *     summary: Provide fraud detection feedback
 *     description: Submit feedback on fraud detection accuracy for manual reviews
 *     tags: [Post-Transaction]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transactionId, checkId, actualFraud]
 *             properties:
 *               transactionId:
 *                 type: string
 *                 example: "txn_123456"
 *               checkId:
 *                 type: string
 *                 example: "check_1234567890_abc123"
 *               actualFraud:
 *                 type: boolean
 *                 description: "Was this transaction actually fraudulent?"
 *                 example: false
 *               reviewerNotes:
 *                 type: string
 *                 description: "Optional notes from manual reviewer"
 *                 example: "Transaction verified with customer via phone"
 *               reviewTimestamp:
 *                 type: number
 *                 example: 1703251200000
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/transaction/feedback', async (req: Request, res: Response) => {
  try {
    const feedbackData = req.body;
    
    if (!feedbackData.transactionId || !feedbackData.checkId || typeof feedbackData.actualFraud !== 'boolean') {
      return res.status(400).json({
        status: 'ERROR',
        error: {
          code: 'INVALID_REQUEST',
          message: 'transactionId, checkId, and actualFraud (boolean) are required'
        },
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    // Log feedback for analysis
    logger.info('Fraud feedback received', {
      transactionId: feedbackData.transactionId,
      checkId: feedbackData.checkId,
      actualFraud: feedbackData.actualFraud,
      reviewerNotes: feedbackData.reviewerNotes
    });
    
    // In a real implementation, you would send this feedback to Orca
    // For now, we'll just acknowledge receipt
    
    res.json({
      status: 'SUCCESS',
      data: {
        feedbackId: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modelUpdate: true,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error: any) {
    logger.error('Transaction feedback failed', { error: error.message, body: req.body });
    res.status(500).json({
      status: 'ERROR',
      error: {
        code: 'FEEDBACK_ERROR',
        message: error.message
      },
      timestamp: Date.now()
    } as ApiResponse);
  }
});

function updateTransactionCache(reportData: TransactionReportRequest) {
  // This would be replaced with actual database operations in production
  const userId = reportData.transactionId.split('_')[0]; // Assuming transaction ID contains user ID
  
  if (reportData.finalStatus === 'COMPLETED') {
    // In production, save to database
    logger.info('Transaction cache updated', { 
      userId, 
      transactionId: reportData.transactionId,
      amount: reportData.actualAmount,
      provider: reportData.provider
    });
  }
}

export default router;