// src/services/orcaService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { OrcaUser, OrcaTransaction, OrcaRiskResponse } from '../types';

class OrcaService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: config.orcaApiUrl,
      timeout: config.orcaTimeout,
      headers: {
        'Authorization': `Bearer ${config.orcaApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Orca API Request', {
          method: config.method,
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => {
        logger.error('Orca API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Orca API Response', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
        return response;
      },
      (error) => {
        logger.error('Orca API Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }
  
  async onboardUser(userData: OrcaUser): Promise<OrcaRiskResponse> {
    try {
      const response: AxiosResponse = await this.client.post('/v1/user', userData);
   
return {
  status: 'SUCCESS',
  riskScore: response.data.riskScore || 0,
  riskLevel: response.data.riskLevel || 'LOW',
  action: this.determineAction(response.data.riskScore || 0),
  timestamp: Date.now()
};
    } catch (error: any) {
      logger.error('Failed to onboard user to Orca', { 
        userId: userData.userId,
        error: error.message 
      });
      throw new Error(`Orca API Error: ${error.message}`);
    }
  }
  
  async checkTransaction(transactionData: OrcaTransaction): Promise<OrcaRiskResponse> {
    try {
      const orcaPayload = this.mapToOrcaTransaction(transactionData);
      const response: AxiosResponse = await this.client.post('/v1/transaction', orcaPayload);
      
      const riskScore = response.data.riskScore || 0;
      const action = this.determineAction(riskScore);
      
      return {
        status: 'SUCCESS',
        riskScore,
        riskLevel: this.determineRiskLevel(riskScore),
        action,
        reasons: response.data.reasons || [],
        recommendedActions: response.data.recommendedActions || [],
        checkId: response.data.checkId || `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      };
    } catch (error: any) {
      logger.error('Failed to check transaction with Orca', { 
        transactionId: transactionData.transactionId,
        error: error.message 
      });
      
      // Return a safe default on Orca failure
      return {
        status: 'ERROR',
        riskScore: 0,
        riskLevel: 'LOW',
        action: 'ALLOW',
        reasons: ['Orca service unavailable - defaulting to allow'],
        checkId: `fallback_${Date.now()}`,
        timestamp: Date.now()
      };
    }
  }
  
  async reportTransaction(reportData: any): Promise<{ status: string; reportId: string }> {
    try {
      const response: AxiosResponse = await this.client.post('/v1/transaction', {
        ...reportData,
        type: 'final_report'
      });
      
      return {
        status: 'SUCCESS',
        reportId: response.data.reportId || `report_${Date.now()}`
      };
    } catch (error: any) {
      logger.error('Failed to report transaction to Orca', { 
        transactionId: reportData.transactionId,
        error: error.message 
      });
      throw new Error(`Orca reporting failed: ${error.message}`);
    }
  }
  
  private mapToOrcaTransaction(data: OrcaTransaction): any {
    // Map our internal transaction format to Orca's expected format
    return {
      id: data.transactionId,
      userId: data.userId,
      amount: data.amount,
      currencyCode: data.currencyCode,
      timestamp: Date.now(),
      direction: data.direction,
      actionType: data.actionType,
      provider: data.provider,
      paymentMethod: data.paymentMethod,
      metadata: data.metadata
    };
  }
  
  private determineAction(riskScore: number): 'ALLOW' | 'REVIEW' | 'BLOCK' {
    if (riskScore >= config.riskThresholds.blockThreshold) {
      return 'BLOCK';
    } else if (riskScore >= config.riskThresholds.reviewThreshold) {
      return 'REVIEW';
    }
    return 'ALLOW';
  }
  
  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (riskScore >= 80) return 'HIGH';
    if (riskScore >= 50) return 'MEDIUM';
    return 'LOW';
  }
}

export const orcaService = new OrcaService();