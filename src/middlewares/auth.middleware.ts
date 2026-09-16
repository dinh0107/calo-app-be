import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../lib/auth-secret.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Yêu cầu xác thực. Vui lòng đăng nhập.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string };
      req.user = decoded;
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

/** JWT hợp lệ + role=admin trong DB (không tin role trên client) */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập admin.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true },
    });

    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Tài khoản không có quyền admin.' });
      return;
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }
}
