// src/routes/users.ts
import express, { Request, Response } from 'express';
import { orcaService } from '../services/orcaService';
import { OrcaUser, ApiResponse } from '../types';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /oapi/users/onboard:
 *   post:
 *     summary: Onboard new user
 *     description: Send user data to Orca for initial risk assessment
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, registrationTimestamp]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: "Unique user identifier"
 *                 example: "user_123456"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "User's email address"
 *                 example: "user@example.com"
 *               phone:
 *                 type: string
 *                 description: "User's phone number in E.164 format"
 *                 example: "+254700000000"
 *               registrationTimestamp:
 *                 type: number
 *                 description: "Unix timestamp of user registration"
 *                 example: 1703251200000
 *               metadata:
 *                 type: object
 *                 properties:
 *                   kycStatus:
 *                     type: string
 *                     enum: [PENDING, COMPLETED, FAILED]
 *                     example: "PENDING"
 *                   accountType:
 *                     type: string
 *                     enum: [INDIVIDUAL, BUSINESS]
 *                     example: "INDIVIDUAL"
 *                   referralSource:
 *                     type: string
 *                     example: "social_media"
 *           examples:
 *             individual_user:
 *               summary: Individual User
 *               value:
 *                 userId: "user_123456"
 *                 email: "john.doe@example.com"
 *                 phone: "+254700000000"
 *                 registrationTimestamp: 1703251200000
 *                 metadata:
 *                   kycStatus: "PENDING"
 *                   accountType: "INDIVIDUAL"
 *             business_user:
 *               summary: Business User
 *               value:
 *                 userId: "biz_789012"
 *                 email: "contact@business.com"
 *                 phone: "+254701000000"
 *                 registrationTimestamp: 1703251200000
 *                 metadata:
 *                   kycStatus: "COMPLETED"
 *                   accountType: "BUSINESS"
 *     responses:
 *       200:
 *         description: User onboarded successfully
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
 *                     riskScore:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                       example: 25
 *                     riskLevel:
 *                       type: string
 *                       enum: [LOW, MEDIUM, HIGH]
 *                       example: "LOW"
 *                     action:
 *                       type: string
 *                       enum: [ALLOW, REVIEW, BLOCK]
 *                       example: "ALLOW"
 *                     orcaUserId:
 *                       type: string
 *                       example: "orca_user_123"
 *                     timestamp:
 *                       type: number
 *                 timestamp:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /oapi/users/update:
 *   post:
 *     summary: Update user profile
 *     description: Update user data when profile changes occur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: "Unique user identifier"
 *                 example: "user_123456"
 *               updatedFields:
 *                 type: object
 *                 description: "Fields that have been updated"
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: "newemail@example.com"
 *                   phone:
 *                     type: string
 *                     example: "+254701000000"
 *                   kycStatus:
 *                     type: string
 *                     enum: [PENDING, COMPLETED, FAILED]
 *                     example: "COMPLETED"
 *               updateTimestamp:
 *                 type: number
 *                 description: "Unix timestamp of the update"
 *                 example: 1703251200000
 *           examples:
 *             kyc_completed:
 *               summary: KYC Status Update
 *               value:
 *                 userId: "user_123456"
 *                 updatedFields:
 *                   kycStatus: "COMPLETED"
 *                 updateTimestamp: 1703251200000
 *             contact_update:
 *               summary: Contact Information Update
 *               value:
 *                 userId: "user_123456"
 *                 updatedFields:
 *                   email: "newemail@example.com"
 *                   phone: "+254701000000"
 *                 updateTimestamp: 1703251200000
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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