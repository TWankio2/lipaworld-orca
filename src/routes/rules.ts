// Create new file: src/routes/rules.ts
import express, { Request, Response } from 'express';
import { orcaService } from '../services/orcaService';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /oapi/rules:
 *   get:
 *     summary: Get all active rules
 *     description: Retrieve all active rules for your organization from Orca
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft]
 *         description: Filter by rule status (default: all)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *           maximum: 100
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Rules retrieved successfully
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
 *                     rules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "rule_123456"
 *                           name:
 *                             type: string
 *                             example: "High Value Transaction"
 *                           riskLevel:
 *                             type: string
 *                             enum: [low, medium_low, medium, high, very_high]
 *                             example: "medium"
 *                           status:
 *                             type: string
 *                             enum: [active, inactive, draft]
 *                             example: "active"
 *                           createdAt:
 *                             type: number
 *                             example: 1734167723000
 *                           updatedAt:
 *                             type: number
 *                             example: 1734167723000
 *                     total:
 *                       type: number
 *                       example: 24
 *                     page:
 *                       type: number
 *                       example: 1
 *                     limit:
 *                       type: number
 *                       example: 20
 *                 timestamp:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    // Validate query parameters
    if (limit && (Number(limit) > 100 || Number(limit) < 1)) {
      return res.status(400).json({
        status: 'ERROR',
        error: {
          code: 'INVALID_REQUEST',
          message: 'limit must be between 1 and 100'
        },
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    const rules = await orcaService.getRules({
      status: status as string,
      page: Number(page),
      limit: Number(limit)
    });
    
    res.json({
      status: 'SUCCESS',
      data: rules,
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error: any) {
    logger.error('Failed to get rules', { error: error.message, query: req.query });
    res.status(500).json({
      status: 'ERROR',
      error: {
        code: 'RULES_ERROR',
        message: error.message
      },
      timestamp: Date.now()
    } as ApiResponse);
  }
});

export default router;