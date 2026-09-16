import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  getAdminScans,
  getAdminNotifications,
  createAdminNotification,
  deleteAdminNotification,
  clearAllData,
  reloadApp,
} from '../controllers/admin.controller.js';

const router = Router();

// Stats & Overview
router.get('/stats', getAdminStats);

// Users Management
router.get('/users', getAdminUsers);

// Scans Gallery & History
router.get('/scans', getAdminScans);

// Notifications Broadcaster
router.get('/notifications', getAdminNotifications);
router.post('/notifications', createAdminNotification);
router.delete('/notifications/:id', deleteAdminNotification);

// Clean Database Wiping
router.delete('/clean-all', clearAllData);

// CI/CD reload (FTP deploy webhook)
router.post('/reload', reloadApp);

export default router;
