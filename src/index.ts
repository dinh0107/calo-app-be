import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import mealsRoutes from './routes/meals.routes.js';
import visionRoutes from './routes/vision.routes.js';
import waterRoutes from './routes/water.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Global Middlewares
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for Admin Web Portal
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Admin Web Dashboard Root Route
app.get('/admin', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'admin', 'index.html'));
});

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'CaloVision AI Backend Server',
    version: '1.0.0',
    adminDashboard: `http://localhost:${PORT}/admin`,
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);

// 404 Route Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tồn tại trên hệ thống máy chủ.',
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error unhandled:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi xử lý yêu cầu từ máy chủ.',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CaloVision AI Backend Server is running!`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log(`📊 Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
