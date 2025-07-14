// src/index.ts - Add Swagger setup
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';
import { setupSwagger } from './swagger'; // Add this import
import userRoutes from './routes/users';
import preRoutes from './routes/pre';
import postRoutes from './routes/post';
import healthRoutes from './routes/health';

const app = express();
const PORT = config.port;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Swagger UI
}));
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimitRequests, // requests per windowMs
  message: {
    status: 'ERROR',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    },
    timestamp: Date.now()
  }
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup Swagger documentation - BEFORE auth middleware
setupSwagger(app);

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Health check (no auth required)
app.use('/oapi/health', healthRoutes);

// Apply authentication to all other routes
app.use('/oapi', authMiddleware);

// Routes
app.use('/oapi/users', userRoutes);
app.use('/oapi/pre', preRoutes);
app.use('/oapi/post', postRoutes);

// Default route
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Lipaworld Orca Fraud Integration',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
    timestamp: Date.now()
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    status: 'ERROR',
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    },
    timestamp: Date.now()
  });
});

app.listen(PORT, () => {
  logger.info(`Orca Fraud Service running at http://localhost:${PORT}`);
  logger.info(`Environment: ${config.environment}`);
  logger.info(`Orca API URL: ${config.orcaApiUrl}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
});

export default app;