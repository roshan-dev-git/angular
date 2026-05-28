import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbManager } from './db';
import { apiRouter } from './routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS with support for headers
app.use(cors({
  origin: '*', // Allow frontend dev server requests
  allowedHeaders: ['Content-Type', 'Authorization', 'x-username', 'x-role', 'x-delay']
}));

app.use(express.json());

// Log incoming API calls
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: dbManager.provider.name });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Handler] Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize database and start the server
const startServer = async () => {
  try {
    const provider = await dbManager.initialize();
    console.log(`Database initialized using provider: ${provider.name}`);
    
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Backend Server running at http://localhost:${PORT}`);
      console.log(`API endpoints accessible under http://localhost:${PORT}/api`);
      console.log(`Press Ctrl+C to terminate`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
};

startServer();
