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
import { requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// CI/CD reload — bảo vệ bằng DEPLOY_SECRET, không dùng JWT admin
router.post('/reload', reloadApp);

// Mọi API admin còn lại bắt buộc đăng nhập role=admin
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/scans', getAdminScans);
router.get('/notifications', getAdminNotifications);
router.post('/notifications', createAdminNotification);
router.delete('/notifications/:id', deleteAdminNotification);
router.delete('/clean-all', clearAllData);

export default router;
