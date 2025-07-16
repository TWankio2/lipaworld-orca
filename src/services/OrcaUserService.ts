// src/services/OrcaUserService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { OrcaUser, OrcaRiskResponse } from '../types';

class OrcaUserService {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: config.orcaApiUrl,
      timeout: config.orcaTimeout,
      headers: {
        'Authorization': `Bearer ${config.orcaApiKey}`,
        'Content-Type': 'application/json',
        'X-Account-ID': config.orcaAccountId || 'LPg4NhlCQTZN5HGgu03',
      },
    });
    
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Orca User API Request', {
          method: config.method,
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => {
        logger.error('Orca User API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Orca User API Response', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
        return response;
      },
      (error) => {
        logger.error('Orca User API Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create or update a user in Orca
   */
  async onboardUser(userData: OrcaUser): Promise<OrcaRiskResponse> {
    try {
      // Map to Orca's expected user format based on the documentation
      const orcaUserPayload = {
        id: userData.userId,  // Orca expects 'id' not 'userId'
        createdAt: userData.registrationTimestamp || Date.now(),
        email: userData.email ? {
          email: userData.email,
          isVerified: false
        } : undefined,
        phone: userData.phone ? {
          phone: userData.phone,
          country: userData.phone.startsWith('+254') ? 'KE' : 'US', // Extract country from phone
          isVerified: false
        } : undefined,
        status: 'PENDING',
        ...(userData.metadata && { 
          kycDetail: {
            kycStatus: userData.metadata.kycStatus || 'PENDING',
            sourceOfIncome: userData.metadata.sourceOfIncome || 'employment'
          }
        })
      };
      
      console.log('🔍 Sending user to Orca:', JSON.stringify(orcaUserPayload, null, 2));
      
      const response: AxiosResponse = await this.client.post('/v1/user', orcaUserPayload);
      
      console.log('🔍 User onboarding response:', JSON.stringify(response.data, null, 2));
      
      // User endpoint doesn't return risk scores like transactions
      // It just confirms the user was created/updated
      return {
        status: 'SUCCESS',
        riskScore: 0,
        riskLevel: 'LOW',
        action: 'ALLOW',
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error('❌ User onboarding failed:', error.response?.data || error.message);
      
      logger.error('Failed to onboard user to Orca', { 
        userId: userData.userId,
        error: error.message,
        responseData: error.response?.data
      });
      throw new Error(`Orca API Error: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get(`/v1/users/${userId}`);
      
      console.log('🔍 Get user response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get user:', error.response?.data || error.message);
      
      logger.error('Failed to get user from Orca', {
        error: error.message,
        responseData: error.response?.data,
        userId
      });
      
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, data: { comment?: string; reviewer?: string }): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.put(`/v1/users/${userId}/block`, data);
      
      console.log('🔍 Block user response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to block user:', error.response?.data || error.message);
      
      logger.error('Failed to block user in Orca', {
        error: error.message,
        responseData: error.response?.data,
        userId
      });
      
      throw new Error(`Failed to block user: ${error.message}`);
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, data: { comment?: string; reviewer?: string }): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.put(`/v1/users/${userId}/unblock`, data);
      
      console.log('🔍 Unblock user response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to unblock user:', error.response?.data || error.message);
      
      logger.error('Failed to unblock user in Orca', {
        error: error.message,
        responseData: error.response?.data,
        userId
      });
      
      throw new Error(`Failed to unblock user: ${error.message}`);
    }
  }

  /**
   * Get blocked users with pagination
   */
  async getBlockedUsers(params: { start?: string; limit?: number }): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.start) {
        queryParams.append('start', params.start);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      
      const url = `/v1/users/blocked${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response: AxiosResponse = await this.client.get(url);
      
      console.log('🔍 Get blocked users response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get blocked users:', error.response?.data || error.message);
      
      logger.error('Failed to get blocked users from Orca', {
        error: error.message,
        responseData: error.response?.data,
        params
      });
      
      throw new Error(`Failed to get blocked users: ${error.message}`);
    }
  }

  /**
   * Submit user feedback
   */
  async submitUserFeedback(userId: string, feedbackData: {
    onboardingFeedback?: {
      id?: string;
      status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'BLOCKED';
      description?: string;
      createdAt: number;
      type?: string;
    };
    kycDetail?: {
      sourceOfIncome?: string;
      kycStatus?: string;
      kycSource?: string;
      kycStatusMessage?: string;
    };
    amlDetail?: {
      amlStatus?: string;
      amlSource?: string;
    };
  }): Promise<any> {
    try {
      const payload = {
        userId,
        ...feedbackData
      };
      
      const response: AxiosResponse = await this.client.post('/v1/user/feedback', payload);
      
      console.log('🔍 User feedback response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to submit user feedback:', error.response?.data || error.message);
      
      logger.error('Failed to submit user feedback to Orca', {
        error: error.message,
        responseData: error.response?.data,
        userId
      });
      
      throw new Error(`Failed to submit user feedback: ${error.message}`);
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, statusData: {
    status?: 'active' | 'inactive';
    completedAt?: number;
    closureType?: string;
    comment?: string;
    initiatedBy?: string;
    reason?: string;
  }): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.put(`/v1/users/${userId}/status`, statusData);
      
      console.log('🔍 Update user status response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to update user status:', error.response?.data || error.message);
      
      logger.error('Failed to update user status in Orca', {
        error: error.message,
        responseData: error.response?.data,
        userId
      });
      
      throw new Error(`Failed to update user status: ${error.message}`);
    }
  }

  /**
   * Get user by transaction ID
   */
  async getUserByTransactionId(transactionId: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.get(`/v1/users/transactions/${transactionId}`);
      
      console.log('🔍 Get user by transaction response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get user by transaction:', error.response?.data || error.message);
      
      logger.error('Failed to get user by transaction from Orca', {
        error: error.message,
        responseData: error.response?.data,
        transactionId
      });
      
      throw new Error(`Failed to get user by transaction: ${error.message}`);
    }
  }

  /**
   * Update users by attribute (bulk operations)
   */
  async updateUsersByAttribute(attributeData: {
    attribute: 'phone' | 'email' | 'ipAddress' | 'deviceFingerprint' | 'bankAccountNumber' | 'cryptoAddress' | 'walletTaxNumberId' | 'walletPhone' | 'cardFingerprint';
    value: string;
    status?: 'PENDING' | 'APPROVED' | 'DECLINED' | 'BLOCKED';
    comment?: string;
    reviewer?: string;
  }): Promise<any> {
    try {
      const response: AxiosResponse = await this.client.put('/v1/users/attributes/status', attributeData);
      
      console.log('🔍 Update users by attribute response:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to update users by attribute:', error.response?.data || error.message);
      
      logger.error('Failed to update users by attribute in Orca', {
        error: error.message,
        responseData: error.response?.data,
        attributeData
      });
      
      throw new Error(`Failed to update users by attribute: ${error.message}`);
    }
  }

  /**
   * Test user service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Orca User Service connection...');
      
      const testUserId = 'test_user_' + Date.now();
      const testUser = {
        id: testUserId,
        createdAt: Date.now(),
        email: {
          email: `${testUserId}@test.com`,
          isVerified: false
        },
        status: 'PENDING'
      };
      
      console.log('🔍 Testing user endpoint:', JSON.stringify(testUser, null, 2));
      
      const response = await this.client.post('/v1/user', testUser);
      console.log('✅ Orca User Service test passed:', response.data);
      return true;
      
    } catch (error: any) {
      console.log('❌ Orca User Service test failed:', error.response?.status, error.response?.data);
      return false;
    }
  }
}

export const orcaUserService = new OrcaUserService();