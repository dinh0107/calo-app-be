import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import prisma from '../lib/prisma.js';

// Get notifications for current user (direct + broadcast)
export async function getUserNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: null }, // Broadcast to all
          ...(userId ? [{ userId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error('Error in getUserNotifications:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách thông báo.' });
  }
}

// Mark a single notification as read
export async function markNotificationAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
  } catch (error: any) {
    console.error('Error in markNotificationAsRead:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái thông báo.' });
  }
}

// Mark all as read
export async function markAllNotificationsAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId: null },
          ...(userId ? [{ userId }] : []),
        ],
      },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc.' });
  } catch (error: any) {
    console.error('Error in markAllNotificationsAsRead:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái thông báo.' });
  }
}

// Register Expo Push Token
export async function registerPushToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { pushToken } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
      return;
    }

    if (!pushToken) {
      res.status(400).json({ success: false, message: 'pushToken là bắt buộc.' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken, lastActiveAt: new Date() },
    });

    res.json({ success: true, message: 'Đăng ký Push Token thành công.' });
  } catch (error: any) {
    console.error('Error in registerPushToken:', error);
    res.status(500).json({ success: false, message: 'Lỗi đăng ký Push Token.' });
  }
}
