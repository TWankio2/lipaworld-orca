// src/index-simple.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = 3000;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Import routes
import healthRoutes from './routes/health';
import userRoutes from './routes/users';
import preRoutes from './routes/pre';
import postRoutes from './routes/post';

// Use routes
app.use('/oapi/health', healthRoutes);
app.use('/oapi/users', userRoutes);
app.use('/oapi/pre', preRoutes);
app.use('/oapi/post', postRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'Lipaworld Orca Fraud Integration',
    version: '1.0.0',
    status: 'running',
    timestamp: Date.now()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/oapi/health`);
});

export default app;