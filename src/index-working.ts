// src/index-working.ts
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());

// Simple test routes to verify everything works
app.get('/', (req, res) => {
  res.json({
    service: 'Lipaworld Orca Fraud Integration',
    status: 'working',
    timestamp: Date.now()
  });
});

// Health check route
app.get('/oapi/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    timestamp: Date.now()
  });
});

// Simple transaction check route
app.post('/oapi/pre/transaction/check', (req, res) => {
  const { transactionId, userId, amount } = req.body;
  
  if (!transactionId || !userId || !amount) {
    return res.status(400).json({
      status: 'ERROR',
      error: 'transactionId, userId, and amount are required'
    });
  }
  
  // Simple decision logic
  const decision = amount > 50000 ? 'BLOCK' : amount > 10000 ? 'REVIEW' : 'ALLOW';
  
  res.json({
    status: 'SUCCESS',
    data: {
      decision,
      riskScore: amount > 50000 ? 95 : amount > 10000 ? 75 : 25,
      riskLevel: amount > 50000 ? 'HIGH' : amount > 10000 ? 'MEDIUM' : 'LOW',
      checkId: `check_${Date.now()}`,
      timestamp: Date.now()
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔍 Test: http://localhost:${PORT}/oapi/health`);
  console.log(`🧪 Test transaction: POST http://localhost:${PORT}/oapi/pre/transaction/check`);
});

export default app;