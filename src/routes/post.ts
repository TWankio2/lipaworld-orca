// src/routes/post.ts
import express, { Request, Response } from 'express';
import { orcaService } from '../services/orcaService';
import { TransactionReportRequest, ApiResponse } from '../types';
import { logger } from '../utils/logger';
const router = express.Router();