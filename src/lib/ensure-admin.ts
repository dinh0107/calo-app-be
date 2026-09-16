import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

/** Tạo / nâng admin mặc định từ env (idempotent). */
export async function ensureDefaultAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || 'admin@calovision.local').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const name = process.env.ADMIN_NAME || 'CaloVision Admin';

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'admin') {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'admin', passwordHash },
      });
      console.log(`[seed] Promoted ${email} -> admin`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role: 'admin',
      passwordHash,
      profile: { create: { hasCompletedOnboarding: true } },
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
  });
  console.log(`[seed] Created admin ${email}`);
}
