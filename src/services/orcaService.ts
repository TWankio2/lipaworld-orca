// src/services/orcaService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { OrcaUser, OrcaTransaction, OrcaRiskResponse } from '../types';

class OrcaService {
  private client: AxiosInstance;
  
  constructor() {

    //  temporary logging
  console.log('🔑 Orca API URL:', config.orcaApiUrl);
  console.log('🔑 Orca API Key (first 10 chars):', config.orcaApiKey.substring(0, 10) + '...');
  console.log('🔑 API Key length:', config.orcaApiKey.length);


    this.client = axios.create({
      baseURL: config.orcaApiUrl,
      timeout: config.orcaTimeout,
      headers: {
        'Authorization': `Bearer ${config.orcaApiKey}`,
        'Content-Type': 'application/json',
        'X-Account-ID': 'LPg4NhlCQTZN5HGgu03',
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



// Fix the testConnection method in orcaService.ts
// Full testConnection method for orcaService.ts
async testConnection(): Promise<boolean> {
  try {
    console.log('🧪 Testing Orca connection...');
    
    // Try a simple transaction test first
    const testTransactionId = 'test_connection_' + Date.now();
    const testTransaction = {
      id: testTransactionId,
      userId: 'test_user_connection',
      status: 'PENDING',
      amount: 1,
      currencyCode: 'KES',
      timestamp: Date.now(),
      paymentMethod: 'bank',
      actionType: 'PURCHASE'
    };
    
    console.log('🔍 Testing transaction endpoint:', JSON.stringify(testTransaction, null, 2));
    
    const response = await this.client.post('/v1/transaction', testTransaction);
    console.log('✅ Orca transaction test passed:', response.data);
    return true;
    
  } catch (error: any) {
    console.log('❌ Orca transaction test failed:', error.response?.status, error.response?.data);
    
    // Try user creation as fallback
    try {
      console.log('🔄 Trying user creation test...');
      
      const testUserId = 'test_user_' + Date.now();
      const testUser = {
        id: testUserId,  // Use 'id' not 'userId' - this was the key fix
        createdAt: Date.now(),
        email: {
          email: `${testUserId}@test.com`,
          isVerified: false
        },
        status: 'PENDING'
      };
      
      console.log('🔍 Testing user endpoint:', JSON.stringify(testUser, null, 2));
      
      const response = await this.client.post('/v1/user', testUser);
      console.log('✅ Orca user test passed:', response.data);
      return true;
      
    } catch (error2: any) {
      console.log('❌ Orca user test failed:', error2.response?.status, error2.response?.data);
      
      // Try rules endpoint as final fallback
      try {
        console.log('🔄 Trying rules endpoint test...');
        
        const response = await this.client.get('/v1/rules?limit=1');
        console.log('✅ Orca rules test passed:', response.data);
        return true;
        
      } catch (error3: any) {
        console.log('❌ Orca rules test failed:', error3.response?.status, error3.response?.data);
        console.log('❌ All Orca connection tests failed');
        return false;
      }
    }
  }
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

  
  // Update the checkTransaction method in orcaService.ts
async checkTransaction(transactionData: OrcaTransaction): Promise<OrcaRiskResponse> {
  try {
    const orcaPayload = this.mapToOrcaTransaction(transactionData);
    const response: AxiosResponse = await this.client.post('/v1/transaction', orcaPayload);
    
    console.log('🔍 Orca response data:', JSON.stringify(response.data, null, 2));
    
    // Map Orca's actual response format to our expected format
    const orcaData = response.data;
    
    // Orca returns: { id, recommendedAction, riskLevel, timestamp, triggered }
    // We need to map this to our format
    
    let riskScore = 0;
    let action: 'ALLOW' | 'REVIEW' | 'BLOCK' = 'ALLOW';
    
    // Map recommendedAction to our action format
    switch (orcaData.recommendedAction) {
      case 'ALLOW':
        action = 'ALLOW';
        riskScore = 10;
        break;
      case 'REVIEW':
        action = 'REVIEW';
        riskScore = 60;
        break;
      case 'BLOCK':
        action = 'BLOCK';
        riskScore = 95;
        break;
      default:
        action = 'ALLOW';
        riskScore = 0;
    }
    
    // Handle triggered rules
    const reasons = orcaData.triggered ? orcaData.triggered.map((rule: any) => 
      typeof rule === 'string' ? rule : rule.description || rule.name || 'Risk rule triggered'
    ) : [];
    
    return {
      status: 'SUCCESS',
      riskScore,
      riskLevel: this.determineRiskLevel(riskScore),
      action,
      reasons,
      recommendedActions: [], // Orca doesn't seem to return this
      checkId: orcaData.id || `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: orcaData.timestamp || Date.now()
    };
  } catch (error: any) {
    console.error('❌ Orca transaction check failed:', error.response?.data || error.message);
    
    logger.error('Failed to check transaction with Orca', { 
      transactionId: transactionData.transactionId,
      error: error.message,
      responseData: error.response?.data
    });
    
    // Return a safe default on Orca failure
    return {
      status: 'ERROR',
      riskScore: 0,
      riskLevel: 'LOW',
      action: 'ALLOW',
      reasons: ['Orca service error - defaulting to allow'],
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

  // Add this method to your orcaService.ts
async getRules(params: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  rules: any[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    const url = `/v1/rules${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    console.log('🔍 Getting rules from Orca:', url);
    
    const response: AxiosResponse = await this.client.get(url);
    
    console.log('🔍 Rules response:', JSON.stringify(response.data, null, 2));
    
    // Map Orca's response format to our expected format
    const orcaData = response.data;
    
    return {
      rules: orcaData.rules || [],
      total: orcaData.total || 0,
      page: params.page || 1,
      limit: params.limit || 20
    };
    
  } catch (error: any) {
    console.error('❌ Failed to get rules:', error.response?.data || error.message);
    
    logger.error('Failed to get rules from Orca', {
      error: error.message,
      responseData: error.response?.data,
      params
    });
    
    // Return empty rules on error
    return {
      rules: [],
      total: 0,
      page: params.page || 1,
      limit: params.limit || 20
    };
  }
}
  
private mapToOrcaTransaction(data: OrcaTransaction): any {
  // Map our internal transaction format to Orca's expected format
  return {
    id: data.transactionId,
    userId: data.userId,
    status: 'PENDING', 
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