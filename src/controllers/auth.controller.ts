import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'calovision_super_secure_jwt_secret_key_2026_fitness_app';

function generateToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Email này đã được đăng ký tài khoản.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name ? name.trim() : email.split('@')[0],
        profile: {
          create: {
            hasCompletedOnboarding: false,
          },
        },
        reminderConfig: {
          create: {
            enabled: true,
            startTime: '07:00',
            endTime: '21:30',
            dailyGoal: 2000,
            cupSize: 250,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi đăng ký tài khoản.' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
      return;
    }

    // Update lastActiveAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi đăng nhập.' });
  }
}

/**
 * Enhanced Google Login for Backend
 * Supports idToken, accessToken, or direct Google profile payload.
 */
export async function googleLogin(req: Request, res: Response): Promise<void> {
  try {
    let { email, name, avatarUrl, googleId, idToken, accessToken } = req.body;

    // 1. If idToken is supplied, verify via Google API
    if (idToken) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (verifyRes.ok) {
          const googleData: any = await verifyRes.json();
          email = googleData.email || email;
          name = googleData.name || googleData.given_name || name;
          avatarUrl = googleData.picture || avatarUrl;
          googleId = googleData.sub || googleId;
        }
      } catch (tokenErr) {
        console.warn('Google idToken verification failed:', tokenErr);
      }
    }

    // 2. If accessToken is supplied, fetch Google userinfo
    if (accessToken && !email) {
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (infoRes.ok) {
          const googleData: any = await infoRes.json();
          email = googleData.email || email;
          name = googleData.name || googleData.given_name || name;
          avatarUrl = googleData.picture || avatarUrl;
          googleId = googleData.sub || googleId;
        }
      } catch (infoErr) {
        console.warn('Google accessToken info fetch failed:', infoErr);
      }
    }

    if (!email) {
      res.status(400).json({ success: false, message: 'Email Google là bắt buộc để đăng nhập.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name ? name.trim() : cleanEmail.split('@')[0];

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=22c55e&color=fff`,
          googleId: googleId || `google_${Date.now()}`,
          profile: {
            create: {
              hasCompletedOnboarding: false,
            },
          },
          reminderConfig: {
            create: {
              enabled: true,
              startTime: '07:00',
              endTime: '21:30',
              dailyGoal: 2000,
              cupSize: 250,
            },
          },
        },
        include: { profile: true },
      });
    } else {
      // Update user info and lastActiveAt
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleId || user.googleId,
          avatarUrl: avatarUrl || user.avatarUrl,
          lastActiveAt: new Date(),
        },
        include: { profile: true },
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Đăng nhập Google thành công!',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          profile: user.profile,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in googleLogin:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi xác thực Google từ máy chủ.' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản.' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi lấy thông tin hồ sơ.' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      return;
    }

    const {
      name,
      gender,
      weight,
      height,
      age,
      activityLevel,
      goal,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      waterGoal,
      hasCompletedOnboarding,
    } = req.body;

    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        gender: gender || 'male',
        weight: Number(weight) || 65,
        height: Number(height) || 170,
        age: Number(age) || 25,
        activityLevel: activityLevel || 'sedentary',
        goal: goal || 'maintain',
        targetCalories: Number(targetCalories) || 2000,
        targetProtein: Number(targetProtein) || 140,
        targetCarbs: Number(targetCarbs) || 220,
        targetFat: Number(targetFat) || 60,
        waterGoal: Number(waterGoal) || 2000,
        hasCompletedOnboarding: hasCompletedOnboarding !== undefined ? Boolean(hasCompletedOnboarding) : true,
      },
      update: {
        ...(gender && { gender }),
        ...(weight !== undefined && { weight: Number(weight) }),
        ...(height !== undefined && { height: Number(height) }),
        ...(age !== undefined && { age: Number(age) }),
        ...(activityLevel && { activityLevel }),
        ...(goal && { goal }),
        ...(targetCalories !== undefined && { targetCalories: Number(targetCalories) }),
        ...(targetProtein !== undefined && { targetProtein: Number(targetProtein) }),
        ...(targetCarbs !== undefined && { targetCarbs: Number(targetCarbs) }),
        ...(targetFat !== undefined && { targetFat: Number(targetFat) }),
        ...(waterGoal !== undefined && { waterGoal: Number(waterGoal) }),
        ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding: Boolean(hasCompletedOnboarding) }),
      },
    });

    res.json({
      success: true,
      message: 'Cập nhật hồ sơ thành công.',
      data: profile,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Lỗi cập nhật hồ sơ.' });
  }
}
