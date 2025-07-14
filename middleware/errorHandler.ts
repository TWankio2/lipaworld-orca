// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../src/utils/logger';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    status: 'ERROR',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? error.message : 'Internal server error',
      details: isDevelopment ? error.stack : undefined
    },
    timestamp: Date.now()
  });
};

