import { Router } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  registerPushToken,
} from '../controllers/notifications.controller.js';
import { optionalAuth, requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// User notification endpoints
router.get('/', optionalAuth, getUserNotifications);
router.put('/:id/read', optionalAuth, markNotificationAsRead);
router.put('/read-all', optionalAuth, markAllNotificationsAsRead);
router.post('/register-push', requireAuth, registerPushToken);

export default router;
