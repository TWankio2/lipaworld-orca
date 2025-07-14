// src/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lipaworld Orca Fraud Integration API',
      version: '1.0.0',
      description: 'API for fraud detection and risk assessment using Orca',
      contact: {
        name: 'Lipaworld Development Team',
        email: 'dev@lipaworld.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://your-api-domain.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API_KEY'
        }
      },
      schemas: {
        OrcaTransaction: {
          type: 'object',
          required: ['transactionId', 'userId', 'amount', 'currencyCode', 'direction', 'provider'],
          properties: {
            transactionId: {
              type: 'string',
              description: 'Unique transaction identifier',
              example: 'test_txn_123'
            },
            userId: {
              type: 'string', 
              description: 'User identifier',
              example: 'user_456'
            },
            amount: {
              type: 'number',
              description: 'Transaction amount',
              example: 1000
            },
            currencyCode: {
              type: 'string',
              description: 'Currency code',
              example: 'KES'
            },
            direction: {
              type: 'string',
              enum: ['payin', 'payout'],
              description: 'Transaction direction'
            },
            actionType: {
              type: 'string',
              enum: ['topup', 'withdrawal', 'purchase'],
              description: 'Type of action'
            },
            provider: {
              type: 'string',
              enum: ['kotanipay', 'hifi', 'voucher'],
              description: 'Payment provider'
            },
            paymentMethod: {
              type: 'string',
              enum: ['wallet', 'crypto', 'bank', 'vas'],
              description: 'Payment method'
            },
            transactionType: {
              type: 'string',
              enum: ['onramp', 'offramp', 'voucher_purchase'],
              description: 'Transaction type'
            }
          }
        },
        RiskResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['SUCCESS', 'ERROR']
            },
            data: {
              type: 'object',
              properties: {
                decision: {
                  type: 'string',
                  enum: ['ALLOW', 'REVIEW', 'BLOCK']
                },
                riskScore: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100
                },
                riskLevel: {
                  type: 'string',
                  enum: ['LOW', 'MEDIUM', 'HIGH']
                },
                reasons: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                checkId: {
                  type: 'string'
                }
              }
            },
            timestamp: {
              type: 'number'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts'], // Path to the API files
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Orca Fraud API Documentation'
  }));
  
  // JSON endpoint for the swagger spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};