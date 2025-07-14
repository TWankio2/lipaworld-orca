// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    apiKey: string;
    type: 'service' | 'external';
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'ERROR',
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header'
      },
      timestamp: Date.now()
    });
  }
  
  const token = authHeader.substring(7);
  
  // Validate against service API key
  if (token === config.serviceApiKey) {
    req.user = {
      apiKey: token.substring(0, 12) + '...',
      type: 'service'
    };
    logger.info('Authenticated request', { 
      user: req.user,
      path: req.path 
    });
    return next();
  }
  
  // Add other API key validation logic here if needed
  
  logger.warn('Invalid API key attempt', { 
    apiKey: token.substring(0, 12) + '...',
    ip: req.ip,
    path: req.path 
  });
  
  return res.status(401).json({
    status: 'ERROR',
    error: {
      code: 'UNAUTHORIZED',
      message: 'Invalid API key'
    },
    timestamp: Date.now()
  });
};