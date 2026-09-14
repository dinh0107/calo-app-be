import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

async function getOrCreateEffectiveUserId(userId?: string): Promise<string> {
  if (userId) return userId;

  // Find or create default mobile guest user
  let guest = await prisma.user.findFirst({
    where: { email: 'guest@calovision.local' },
  });

  if (!guest) {
    guest = await prisma.user.create({
      data: {
        email: 'guest@calovision.local',
        name: 'Người Dùng Khách',
        role: 'user',
        profile: {
          create: {
            hasCompletedOnboarding: true,
            targetCalories: 2000,
          },
        },
      },
    });
  }

  return guest.id;
}

export async function getMealsByDate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = await getOrCreateEffectiveUserId(req.user?.id);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const meals = await prisma.meal.findMany({
      where: { userId, date },
      include: { foodItems: true },
      orderBy: { createdAt: 'desc' },
    });

    const dailyTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
    };

    const mealsByType: Record<string, { entries: any[]; totalCalories: number }> = {
      breakfast: { entries: [], totalCalories: 0 },
      lunch: { entries: [], totalCalories: 0 },
      dinner: { entries: [], totalCalories: 0 },
      snack: { entries: [], totalCalories: 0 },
    };

    meals.forEach((meal) => {
      const type = meal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack';
      if (mealsByType[type]) {
        meal.foodItems.forEach((food) => {
          const entry = {
            id: meal.id,
            mealType: meal.mealType,
            date: meal.date,
            time: meal.time,
            food: {
              id: food.id,
              name: food.name,
              vietnameseName: food.vietnameseName,
              macros: {
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
                fiber: food.fiber,
                sodium: food.sodium,
              },
              portionSize: food.portionSize,
              portionUnit: food.portionUnit,
              healthScore: food.healthScore,
              notes: food.notes,
              imageUrl: food.imageUrl,
            },
            createdAt: meal.createdAt,
          };

          mealsByType[type].entries.push(entry);
          mealsByType[type].totalCalories += food.calories;

          dailyTotals.calories += food.calories;
          dailyTotals.protein += food.protein;
          dailyTotals.carbs += food.carbs;
          dailyTotals.fat += food.fat;
          dailyTotals.fiber += food.fiber;
          dailyTotals.sodium += food.sodium;
        });
      }
    });

    res.json({
      success: true,
      data: {
        date,
        meals,
        mealsByType,
        dailyTotals: {
          calories: Math.round(dailyTotals.calories),
          protein: Math.round(dailyTotals.protein * 10) / 10,
          carbs: Math.round(dailyTotals.carbs * 10) / 10,
          fat: Math.round(dailyTotals.fat * 10) / 10,
          fiber: Math.round(dailyTotals.fiber * 10) / 10,
          sodium: Math.round(dailyTotals.sodium),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi tải danh sách bữa ăn.' });
  }
}

export async function addMeal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = await getOrCreateEffectiveUserId(req.user?.id);
    const { mealType, date, time, food } = req.body;

    if (!mealType || !food || !food.name) {
      res.status(400).json({ success: false, message: 'Thiếu thông tin món ăn hoặc bữa ăn.' });
      return;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const targetTime = time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const calories = Number(food.macros?.calories) || 0;

    const meal = await prisma.meal.create({
      data: {
        userId,
        mealType,
        date: targetDate,
        time: targetTime,
        totalCalories: calories,
        foodItems: {
          create: {
            name: food.name,
            vietnameseName: food.vietnameseName || food.name,
            calories,
            protein: Number(food.macros?.protein) || 0,
            carbs: Number(food.macros?.carbs) || 0,
            fat: Number(food.macros?.fat) || 0,
            fiber: Number(food.macros?.fiber) || 0,
            sodium: Number(food.macros?.sodium) || 0,
            portionSize: Number(food.portionSize) || 100,
            portionUnit: food.portionUnit || '1 phần',
            healthScore: food.healthScore ? Number(food.healthScore) : 85,
            notes: food.notes || null,
            imageUrl: food.imageUrl || null,
          },
        },
      },
      include: { foodItems: true },
    });

    // Also record into ScannedFoodLog so it immediately appears in Admin Dashboard
    try {
      await prisma.scannedFoodLog.create({
        data: {
          userId,
          foodName: food.name,
          vietnameseName: food.vietnameseName || food.name,
          mealType,
          calories,
          protein: Number(food.macros?.protein) || 0,
          carbs: Number(food.macros?.carbs) || 0,
          fat: Number(food.macros?.fat) || 0,
          confidence: Number(food.confidence ? (food.confidence > 1 ? food.confidence / 100 : food.confidence) : 0.95),
          healthScore: food.healthScore ? Number(food.healthScore) : 85,
          imageUrl: food.imageUrl ? (food.imageUrl.length < 150000 ? food.imageUrl : food.imageUrl.substring(0, 100000)) : null,
        },
      });

      // Update user last active
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
    } catch (scanErr) {
      console.warn('ScannedFoodLog save notice:', scanErr);
    }

    res.status(201).json({
      success: true,
      message: 'Đã ghi nhận món ăn thành công.',
      data: meal,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi thêm món ăn.' });
  }
}

export async function deleteMeal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = await getOrCreateEffectiveUserId(req.user?.id);
    const { id } = req.params;

    const meal = await prisma.meal.findFirst({
      where: { id, userId },
    });

    if (!meal) {
      // If not found for user, try finding by id
      const anyMeal = await prisma.meal.findUnique({ where: { id } });
      if (anyMeal) {
        await prisma.meal.delete({ where: { id } });
        res.json({ success: true, message: 'Đã xóa món ăn khỏi nhật ký.' });
        return;
      }
      res.status(404).json({ success: false, message: 'Không tìm thấy bữa ăn.' });
      return;
    }

    await prisma.meal.delete({ where: { id } });

    res.json({ success: true, message: 'Đã xóa món ăn khỏi nhật ký.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi xóa món ăn.' });
  }
}

export async function duplicateMeal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = await getOrCreateEffectiveUserId(req.user?.id);
    const { id } = req.params;
    const { targetDate } = req.body;

    const original = await prisma.meal.findFirst({
      where: { id },
      include: { foodItems: true },
    });

    if (!original || original.foodItems.length === 0) {
      res.status(404).json({ success: false, message: 'Không tìm thấy bữa ăn gốc để sao chép.' });
      return;
    }

    const food = original.foodItems[0];
    const newDate = targetDate || new Date().toISOString().split('T')[0];

    const duplicated = await prisma.meal.create({
      data: {
        userId,
        mealType: original.mealType,
        date: newDate,
        time: original.time,
        totalCalories: original.totalCalories,
        foodItems: {
          create: {
            name: food.name,
            vietnameseName: food.vietnameseName,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            fiber: food.fiber,
            sodium: food.sodium,
            portionSize: food.portionSize,
            portionUnit: food.portionUnit,
            healthScore: food.healthScore,
            notes: food.notes,
            imageUrl: food.imageUrl,
          },
        },
      },
      include: { foodItems: true },
    });

    res.json({
      success: true,
      message: 'Đã sao chép món ăn sang ngày ' + newDate,
      data: duplicated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi sao chép món ăn.' });
  }
}

export async function clearAllMeals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = await getOrCreateEffectiveUserId(req.user?.id);
    await prisma.meal.deleteMany({ where: { userId } });
    res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử bữa ăn.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi xóa nhật ký ăn uống.' });
  }
}
