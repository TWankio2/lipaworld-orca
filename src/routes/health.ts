// src/routes/health.ts
import express, { Request, Response } from 'express';
import { config } from '../config/config';
import { orcaService } from '../services/orcaService';

const router = express.Router();
const startTime = Date.now();

// GET /oapi/health
router.get('/', async (req: Request, res: Response) => {
  try {
    // Basic health check
    let orcaConnection = 'CONNECTED';
    
    try {
      // Simple ping to Orca API (you might need to implement a health endpoint)
      await orcaService.onboardUser({
        userId: 'health_check_' + Date.now(),
        registrationTimestamp: Date.now()
      });
    } catch (error) {
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

// GET /oapi/health/metrics
router.get('/metrics', (req: Request, res: Response) => {
  // In production, these would come from actual metrics storage
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