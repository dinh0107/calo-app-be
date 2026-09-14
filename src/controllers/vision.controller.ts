import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { analyzeFoodImageServer } from '../services/gemini.service.js';
import prisma from '../lib/prisma.js';

async function getOrCreateEffectiveUserId(userId?: string): Promise<string> {
  if (userId) return userId;

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

export async function analyzeFood(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { imageBase64, mimeType, notes } = req.body;
    const effectiveUserId = await getOrCreateEffectiveUserId(req.user?.id);

    if (!imageBase64) {
      res.status(400).json({ success: false, message: 'Dữ liệu hình ảnh (imageBase64) là bắt buộc.' });
      return;
    }

    const result = await analyzeFoodImageServer(imageBase64, mimeType || 'image/jpeg', notes);

    // Save scan to ScannedFoodLog in the background
    try {
      const imageSnippet = imageBase64.length < 150000 
        ? `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
        : `data:${mimeType || 'image/jpeg'};base64,${imageBase64.substring(0, 100000)}`;

      await prisma.scannedFoodLog.create({
        data: {
          userId: effectiveUserId,
          foodName: result.name || 'Món ăn nhận diện',
          vietnameseName: result.vietnameseName || result.name || 'Món ăn nhận diện',
          calories: Math.round(result.macros?.calories || 0),
          protein: Number(result.macros?.protein || 0),
          carbs: Number(result.macros?.carbs || 0),
          fat: Number(result.macros?.fat || 0),
          confidence: Number((result.confidence || 95) > 1 ? result.confidence / 100 : result.confidence),
          healthScore: result.healthScore ? Number(result.healthScore) : 85,
          imageUrl: imageSnippet,
          detectedItems: result.ingredients ? JSON.stringify(result.ingredients) : null,
        },
      });

      // Update user last active
      await prisma.user.update({
        where: { id: effectiveUserId },
        data: { lastActiveAt: new Date() },
      });
    } catch (logErr) {
      console.warn('Could not save to ScannedFoodLog:', logErr);
    }

    res.json({
      success: true,
      message: 'Nhận diện món ăn thành công.',
      data: result,
    });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Không thể nhận diện hình ảnh món ăn lúc này.',
    });
  }
}
