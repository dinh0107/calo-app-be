import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export async function getTrends(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    const days = Math.min(60, Math.max(7, Number(req.query.days) || 14));

    // Get user profile target
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });
    const targetCalories = profile?.targetCalories || 2000;

    // Generate date range
    const resultTrend: Array<{
      date: string;
      label: string;
      calories: number;
      targetCalories: number;
      protein: number;
      carbs: number;
      fat: number;
      water: number;
    }> = [];

    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('vi-VN', { weekday: 'short' });

      // Query meals for that date
      const meals = await prisma.meal.findMany({
        where: { userId, date: dateStr },
        include: { foodItems: true },
      });

      let calo = 0;
      let p = 0;
      let c = 0;
      let f = 0;

      meals.forEach((m) => {
        m.foodItems.forEach((item) => {
          calo += item.calories;
          p += item.protein;
          c += item.carbs;
          f += item.fat;
        });
      });

      // Query water for that date
      const waterLog = await prisma.waterLog.findUnique({
        where: { userId_date: { userId, date: dateStr } },
      });

      resultTrend.push({
        date: dateStr,
        label: weekday,
        calories: Math.round(calo),
        targetCalories,
        protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10,
        fat: Math.round(f * 10) / 10,
        water: waterLog?.amountMl || 0,
      });
    }

    // Compute overall statistics
    const nonZeroDays = resultTrend.filter((t) => t.calories > 0);
    const avgCalories = nonZeroDays.length > 0
      ? Math.round(nonZeroDays.reduce((acc, cur) => acc + cur.calories, 0) / nonZeroDays.length)
      : 0;

    const totalProtein = resultTrend.reduce((acc, cur) => acc + cur.protein, 0);
    const totalCarbs = resultTrend.reduce((acc, cur) => acc + cur.carbs, 0);
    const totalFat = resultTrend.reduce((acc, cur) => acc + cur.fat, 0);
    const totalMacro = totalProtein + totalCarbs + totalFat || 1;

    res.json({
      success: true,
      data: {
        days,
        trends: resultTrend,
        summary: {
          avgCalories,
          targetCalories,
          totalLoggedDays: nonZeroDays.length,
          proteinRatio: Math.round((totalProtein / totalMacro) * 100),
          carbsRatio: Math.round((totalCarbs / totalMacro) * 100),
          fatRatio: Math.round((totalFat / totalMacro) * 100),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi tổng hợp báo cáo phân tích.' });
  }
}
