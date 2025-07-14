// src/index.ts - Debugging version
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Lipaworld Orca Fraud Integration',
    version: '1.0.0',
    status: 'running - debug mode',
    timestamp: Date.now()
  });
});

// Try importing routes one by one to find the problem
console.log('🔍 Testing route imports...');

try {
  console.log('Testing health routes...');
  const healthRoutes = require('./routes/health').default;
  console.log('Health routes type:', typeof healthRoutes);
  if (typeof healthRoutes === 'function') {
    app.use('/oapi/health', healthRoutes);
    console.log('✅ Health routes loaded successfully');
  } else {
    console.log('❌ Health routes is not a function:', healthRoutes);
  }
} catch (error: any) {
  console.error('❌ Health routes failed:', error.message);
}

try {
  console.log('Testing user routes...');
  const userRoutes = require('./routes/users').default;
  console.log('User routes type:', typeof userRoutes);
  if (typeof userRoutes === 'function') {
    app.use('/oapi/users', userRoutes);
    console.log('✅ User routes loaded successfully');
  } else {
    console.log('❌ User routes is not a function:', userRoutes);
  }
} catch (error: any) {
  console.error('❌ User routes failed:', error.message);
}

try {
  console.log('Testing pre routes...');
  const preRoutes = require('./routes/pre').default;
  console.log('Pre routes type:', typeof preRoutes);
  if (typeof preRoutes === 'function') {
    app.use('/oapi/pre', preRoutes);
    console.log('✅ Pre routes loaded successfully');
  } else {
    console.log('❌ Pre routes is not a function:', preRoutes);
  }
} catch (error: any) {
  console.error('❌ Pre routes failed:', error.message);
}

try {
  console.log('Testing post routes...');
  const postRoutes = require('./routes/post').default;
  console.log('Post routes type:', typeof postRoutes);
  if (typeof postRoutes === 'function') {
    app.use('/oapi/post', postRoutes);
    console.log('✅ Post routes loaded successfully');
  } else {
    console.log('❌ Post routes is not a function:', postRoutes);
  }
} catch (error: any) {
  console.error('❌ Post routes failed:', error.message);
}

console.log('🚀 Starting server...');

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log('🔍 Check the logs above to see which route failed');
});

export default app;