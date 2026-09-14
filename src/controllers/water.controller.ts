import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export async function getWaterLog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const log = await prisma.waterLog.findUnique({
      where: {
        userId_date: { userId, date },
      },
    });

    res.json({
      success: true,
      data: {
        date,
        amountMl: log?.amountMl || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi tải lượng nước uống.' });
  }
}

export async function logWater(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    const { date, amountMl } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const addAmount = Number(amountMl) || 250;

    const log = await prisma.waterLog.upsert({
      where: {
        userId_date: { userId, date: targetDate },
      },
      create: {
        userId,
        date: targetDate,
        amountMl: addAmount,
      },
      update: {
        amountMl: {
          increment: addAmount,
        },
      },
    });

    res.json({
      success: true,
      message: `Đã ghi nhận thêm +${addAmount}ml nước.`,
      data: log,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi ghi nhận lượng nước.' });
  }
}

export async function resetWater(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const log = await prisma.waterLog.upsert({
      where: {
        userId_date: { userId, date: targetDate },
      },
      create: {
        userId,
        date: targetDate,
        amountMl: 0,
      },
      update: {
        amountMl: 0,
      },
    });

    res.json({
      success: true,
      message: 'Đã đặt lại lượng nước về 0ml.',
      data: log,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi đặt lại lượng nước.' });
  }
}

export async function getReminderConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    let config = await prisma.waterReminderConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      config = await prisma.waterReminderConfig.create({
        data: {
          userId,
          enabled: true,
          startTime: '07:00',
          endTime: '21:30',
          dailyGoal: 2000,
          cupSize: 250,
          soundEnabled: true,
        },
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi tải cấu hình lịch nhắc.' });
  }
}

export async function updateReminderConfig(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    const { enabled, startTime, endTime, dailyGoal, cupSize, soundEnabled } = req.body;

    const config = await prisma.waterReminderConfig.upsert({
      where: { userId },
      create: {
        userId,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        startTime: startTime || '07:00',
        endTime: endTime || '21:30',
        dailyGoal: Number(dailyGoal) || 2000,
        cupSize: Number(cupSize) || 250,
        soundEnabled: soundEnabled !== undefined ? Boolean(soundEnabled) : true,
      },
      update: {
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(dailyGoal !== undefined && { dailyGoal: Number(dailyGoal) }),
        ...(cupSize !== undefined && { cupSize: Number(cupSize) }),
        ...(soundEnabled !== undefined && { soundEnabled: Boolean(soundEnabled) }),
      },
    });

    res.json({
      success: true,
      message: 'Đã lưu cấu hình lịch nhắc uống nước.',
      data: config,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi lưu cấu hình lịch nhắc.' });
  }
}
