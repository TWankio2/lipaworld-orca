# Lipaworld Orca Fraud Detection Service

A microservice that integrates with Orca API to provide real-time fraud detection for transactions across KotaniPay, HiFi, and voucher systems.

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer lipaworld_orca_service_key_12345_secure
```

## Core Endpoints

### 1. Pre-Transaction Risk Check
**POST** `/oapi/pre/transaction/check`

Check transaction risk before processing payment.

**Request:**
```json
{
  "transactionId": "kotani_txn_123",
  "userId": "user_456",
  "amount": 1000,
  "currencyCode": "KES",
  "direction": "payin",
  "actionType": "topup",
  "provider": "kotanipay",
  "paymentMethod": "wallet",
  "transactionType": "onramp",
  "metadata": {
    "recipientPhone": "+254700000000",
    "chain": "ethereum",
    "token": "USDC"
  }
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "decision": "ALLOW",
    "riskScore": 25,
    "riskLevel": "LOW",
    "reasons": [],
    "checkId": "check_1703251200_abc123",
    "internalCheckId": "internal_1703251200_xyz789"
  },
  "timestamp": 1703251200000
}
```

**Decisions:**
- `ALLOW` - Process transaction normally
- `REVIEW` - Flag for manual review
- `BLOCK` - Reject transaction

### 2. Transaction Limits Check
**POST** `/oapi/pre/limits/check`

Validate transaction against user limits.

**Request:**
```json
{
  "userId": "user_123456",
  "amount": 5000,
  "currencyCode": "KES",
  "timeWindow": "DAILY"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "data": {
    "withinLimits": true,
    "limits": {
      "dailyLimit": 100000,
      "dailyUsed": 15000,
      "dailyRemaining": 85000,
      "transactionLimit": 50000
    },
    "decision": "ALLOW"
  }
}
```

### 3. User Onboarding
**POST** `/oapi/users/onboard`

Register new user with Orca for risk profiling.

**Request:**
```json
{
  "userId": "user_123456",
  "email": "john.doe@example.com",
  "phone": "+254700000000",
  "registrationTimestamp": 1703251200000,
  "metadata": {
    "kycStatus": "PENDING",
    "accountType": "INDIVIDUAL"
  }
}
```

### 4. Transaction Reporting
**POST** `/oapi/post/transaction/report`

Report final transaction outcome to Orca.

**Request:**
```json
{
  "transactionId": "txn_123456",
  "checkId": "check_1703251200_abc123",
  "finalStatus": "COMPLETED",
  "actualAmount": 1000,
  "provider": "kotanipay",
  "transactionType": "onramp",
  "providerResponse": {
    "status": "success",
    "referenceId": "ref_789",
    "transactionHash": "0x123abc..."
  },
  "timestamp": 1703251200000
}
```

### 5. User Management
**GET** `/oapi/users/{userId}` - Get user details
**PUT** `/oapi/users/{userId}/block` - Block user
**PUT** `/oapi/users/{userId}/unblock` - Unblock user
**GET** `/oapi/users/blocked` - Get blocked users list

### 6. Rules Management
**GET** `/oapi/rules` - Get active fraud detection rules

## Provider-Specific Examples

### KotaniPay Integration
```json
{
  "transactionId": "kotani_txn_123",
  "provider": "kotanipay",
  "paymentMethod": "wallet",
  "direction": "payin",
  "actionType": "topup",
  "transactionType": "onramp"
}
```

### HiFi Integration
```json
{
  "transactionId": "hifi_txn_789",
  "provider": "hifi",
  "paymentMethod": "crypto",
  "direction": "payout",
  "actionType": "withdrawal",
  "transactionType": "offramp"
}
```

### Voucher System
```json
{
  "transactionId": "voucher_txn_456",
  "provider": "voucher",
  "paymentMethod": "vas",
  "direction": "payout",
  "actionType": "purchase",
  "transactionType": "voucher_purchase",
  "metadata": {
    "productId": "airtime_mtn"
  }
}
```

## Error Handling

All endpoints return consistent error format:
```json
{
  "status": "ERROR",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "transactionId, userId, and amount are required"
  },
  "timestamp": 1703251200000
}
```

## Health Check
**GET** `/oapi/health` - Service health status

## API Documentation
Full Swagger documentation available at: `http://localhost:3000/api-docs`

## Integration Flow

1. **User Registration** → Call `/oapi/users/onboard`
2. **Before Transaction** → Call `/oapi/pre/transaction/check`
3. **Check Limits** → Call `/oapi/pre/limits/check` (optional)
4. **Process Payment** → Use your payment provider
5. **Report Outcome** → Call `/oapi/post/transaction/report`

## Support
For integration questions, contact the Lipaworld development team.