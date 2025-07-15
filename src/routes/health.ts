// src/routes/health.ts
import express, { Request, Response } from 'express';
import { config } from '../config/config';

const router = express.Router();
const startTime = Date.now();

/**
 * @swagger
 * /oapi/health:
 *   get:
 *     summary: Service health check
 *     description: Check if the service and Orca connection are healthy
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [HEALTHY, DEGRADED]
 *                   example: "HEALTHY"
 *                 orcaConnection:
 *                   type: string
 *                   enum: [CONNECTED, DISCONNECTED]
 *                   example: "CONNECTED"
 *                 uptime:
 *                   type: number
 *                   description: "Uptime in seconds"
 *                   example: 3600
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 timestamp:
 *                   type: number
 *                   example: 1703251200000
 *       503:
 *         description: Service is down
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "DOWN"
 *                 error:
 *                   type: string
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Basic health check - simplified for now
    let orcaConnection = 'CONNECTED';
    
    // Simple check - in production you might ping Orca API
    if (!config.orcaApiKey) {
      orcaConnection = 'DISCONNECTED';
    }
    
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const status = orcaConnection === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED';
    
    res.json({
      status,
      orcaConnection,
      uptime,
      version: '1.0.0',
      environment: config.environment,
      timestamp: Date.now()
    });
    
  } catch (error: any) {
    res.status(503).json({
      status: 'DOWN',
      orcaConnection: 'DISCONNECTED',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * @swagger
 * /oapi/health/metrics:
 *   get:
 *     summary: Service metrics
 *     description: Get performance and usage metrics for the service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 1500
 *                     success:
 *                       type: number
 *                       example: 1450
 *                     errors:
 *                       type: number
 *                       example: 50
 *                     averageResponseTime:
 *                       type: number
 *                       description: "Average response time in milliseconds"
 *                       example: 120
 *                 orca:
 *                   type: object
 *                   properties:
 *                     apiCalls:
 *                       type: number
 *                       example: 800
 *                     apiErrors:
 *                       type: number
 *                       example: 5
 *                     rateLimitHits:
 *                       type: number
 *                       example: 0
 *                 decisions:
 *                   type: object
 *                   properties:
 *                     allow:
 *                       type: number
 *                       example: 1200
 *                     block:
 *                       type: number
 *                       example: 30
 *                     review:
 *                       type: number
 *                       example: 150
 *                 timestamp:
 *                   type: number
 *                   example: 1703251200000
 */
router.get('/metrics', (req: Request, res: Response) => {
  // In production, these would come from actual metrics storage (Redis, InfluxDB, etc.)
  res.json({
    requests: {
      total: 0,
      success: 0,
      errors: 0,
      averageResponseTime: 0
    },
    orca: {
      apiCalls: 0,
      apiErrors: 0,
      rateLimitHits: 0
    },
    decisions: {
      allow: 0,
      block: 0,
      review: 0
    },
    timestamp: Date.now()
  });
});

export default router;