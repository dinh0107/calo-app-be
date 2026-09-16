import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

// ==========================================
// 1. DASHBOARD OVERVIEW & REAL STATS
// ==========================================
export async function getAdminStats(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);

    // Parallel counts for accurate real stats
    const [
      totalUsers,
      totalMeals,
      totalScans,
      totalWaterLogs,
      activeUsersToday,
      recentUsers,
      todayWaterAgg,
      recentScans,
      recentMeals,
      allScannedItems,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.meal.count(),
      prisma.scannedFoodLog.count(),
      prisma.waterLog.count(),
      prisma.user.count({
        where: {
          lastActiveAt: { gte: startOfToday },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      prisma.waterLog.aggregate({
        where: { date: todayStr },
        _sum: { amountMl: true },
      }),
      prisma.scannedFoodLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.meal.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          foodItems: true,
        },
      }),
      prisma.scannedFoodLog.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          foodName: true,
          vietnameseName: true,
          calories: true,
        },
      }),
    ]);

    // Calculate Top most scanned dishes strictly from real data
    const dishCountMap: Record<string, { count: number; name: string; calories: number }> = {};
    for (const item of allScannedItems) {
      const name = item.vietnameseName || item.foodName || 'Món ăn';
      if (!dishCountMap[name]) {
        dishCountMap[name] = { count: 0, name, calories: item.calories };
      }
      dishCountMap[name].count += 1;
    }
    const topDishes = Object.values(dishCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate real scan count for each of the last 7 days
    const days: string[] = [];
    const scanTrendData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      days.push(dayLabel);

      const dayCount = await prisma.scannedFoodLog.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
      scanTrendData.push(dayCount);
    }

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          totalMeals,
          totalScans,
          totalWaterToday: todayWaterAgg._sum.amountMl || 0,
          activeUsersToday,
        },
        chartData: {
          labels: days,
          scans: scanTrendData,
        },
        topDishes,
        recentScans,
        recentUsers,
        recentMeals,
      },
    });
  } catch (error: any) {
    console.error('Error in getAdminStats:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu thống kê quản trị.' });
  }
}

// ==========================================
// 2. USER MANAGEMENT
// ==========================================
export async function getAdminUsers(req: Request, res: Response): Promise<void> {
  try {
    const { search, role, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }
    if (role && role !== 'all') {
      where.role = String(role);
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          _count: {
            select: {
              meals: true,
              scannedLogs: true,
              waterLogs: true,
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl,
      lastActiveAt: u.lastActiveAt,
      createdAt: u.createdAt,
      stats: {
        totalMeals: u._count.meals,
        totalScans: u._count.scannedLogs,
        totalWaterDays: u._count.waterLogs,
      },
      profile: u.profile ? {
        weight: u.profile.weight,
        height: u.profile.height,
        goal: u.profile.goal,
        targetCalories: u.profile.targetCalories,
        gender: u.profile.gender,
      } : null,
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          total,
          page: pageNum,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error: any) {
    console.error('Error in getAdminUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách người dùng.' });
  }
}

// ==========================================
// 3. SCANNED FOODS HISTORY & GALLERY
// ==========================================
export async function getAdminScans(req: Request, res: Response): Promise<void> {
  try {
    const { search, limit = '50', page = '1' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (search) {
      where.OR = [
        { foodName: { contains: String(search) } },
        { vietnameseName: { contains: String(search) } },
      ];
    }

    const [total, scans] = await Promise.all([
      prisma.scannedFoodLog.count({ where }),
      prisma.scannedFoodLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        scans,
        pagination: {
          total,
          page: pageNum,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error: any) {
    console.error('Error in getAdminScans:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách món ăn đã quét.' });
  }
}

// ==========================================
// 4. NOTIFICATIONS BROADCAST CENTER
// ==========================================
export async function getAdminNotifications(req: Request, res: Response): Promise<void> {
  try {
    const notifications = await prisma.notification.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Error in getAdminNotifications:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử thông báo.' });
  }
}

export async function createAdminNotification(req: Request, res: Response): Promise<void> {
  try {
    const { userId, title, message, type = 'info', actionUrl } = req.body;

    if (!title || !message) {
      res.status(400).json({
        success: false,
        message: 'Tiêu đề (title) và nội dung (message) thông báo là bắt buộc.',
      });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: userId && userId !== 'all' ? userId : null,
        title: String(title).trim(),
        message: String(message).trim(),
        type: String(type),
        actionUrl: actionUrl ? String(actionUrl) : null,
        sentBy: 'admin',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: userId && userId !== 'all'
        ? `Đã gửi thông báo thành công đến người dùng!`
        : `Đã phát thông báo toàn hệ thống đến tất cả người dùng!`,
      data: notification,
    });
  } catch (error: any) {
    console.error('Error in createAdminNotification:', error);
    res.status(500).json({ success: false, message: 'Không thể gửi thông báo lúc này.' });
  }
}

export async function deleteAdminNotification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.notification.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Đã xóa thông báo thành công.',
    });
  } catch (error: any) {
    console.error('Error in deleteAdminNotification:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa thông báo.' });
  }
}

// ==========================================
// 5. WIPE ALL DATA CLEAN (Zero Mock Data)
// ==========================================
export async function clearAllData(req: Request, res: Response): Promise<void> {
  try {
    await prisma.scannedFoodLog.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.foodItem.deleteMany({});
    await prisma.meal.deleteMany({});
    await prisma.waterLog.deleteMany({});
    await prisma.waterReminderConfig.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.user.deleteMany({});

    res.json({
      success: true,
      message: 'Đã xóa toàn bộ dữ liệu mẫu. Hệ thống hoàn toàn sạch và sẵn sàng sử dụng thật!',
    });
  } catch (error: any) {
    console.error('Error clearing data:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa dữ liệu.' });
  }
}

/** CI/CD: FTP xong gọi endpoint này — process exit, PM2 autorestart load code mới */
export async function reloadApp(req: Request, res: Response): Promise<void> {
  const expected = process.env.DEPLOY_SECRET;
  const got = req.get('x-deploy-secret') || '';
  if (!expected || got !== expected) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  res.json({ success: true, message: 'Restarting via PM2…' });
  setTimeout(() => process.exit(0), 400);
}
