// src/routes/users.ts
import express, { Request, Response } from 'express';
import { orcaService } from '../services/orcaService';
import { OrcaUser, ApiResponse } from '../types';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /oapi/users/onboard
router.post('/onboard', async (req: Request, res: Response) => {
  try {
    const userData: OrcaUser = req.body;
    
    // Validation
    if (!userData.userId) {
      return res.status(400).json({
        status: 'ERROR',
        error: {
          code: 'INVALID_REQUEST',
          message: 'userId is required'
        },
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    const result = await orcaService.onboardUser(userData);
    
    res.json({
      status: 'SUCCESS',
      data: result,
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error: any) {
    logger.error('User onboarding failed', { error: error.message, body: req.body });
    res.status(500).json({
      status: 'ERROR',
      error: {
        code: 'ORCA_API_ERROR',
        message: error.message
      },
      timestamp: Date.now()
    } as ApiResponse);
  }
});

// POST /oapi/users/update
router.post('/update', async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    
    if (!updateData.userId) {
      return res.status(400).json({
        status: 'ERROR',
        error: {
          code: 'INVALID_REQUEST',
          message: 'userId is required'
        },
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    // Transform update data to user format
    const userData: OrcaUser = {
      userId: updateData.userId,
      ...updateData.updatedFields,
      registrationTimestamp: updateData.updateTimestamp || Date.now()
    };
    
    const result = await orcaService.onboardUser(userData);
    
    res.json({
      status: 'SUCCESS',
      data: result,
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error: any) {
    logger.error('User update failed', { error: error.message, body: req.body });
    res.status(500).json({
      status: 'ERROR',
      error: {
        code: 'ORCA_API_ERROR',
        message: error.message
      },
      timestamp: Date.now()
    } as ApiResponse);
  }
});

export default router;