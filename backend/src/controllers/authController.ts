import { Request, Response } from 'express';
import { prisma } from '../index';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  organizationName: z.string().min(2),
});

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await hashPassword(data.password);

    // Create Organization and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
        },
      });

      // Create owner role
      const role = await tx.role.create({
        data: {
          name: 'Owner',
          permissions: 'ALL',
          organizationId: org.id,
        }
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          organizationId: org.id,
          roleId: role.id,
        },
      });

      return { user, org };
    });

    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.org.id,
      roleId: result.user.roleId || undefined,
      isSuperAdmin: result.user.isSuperAdmin,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict', // 'none' required for cross-origin (Railway→Netlify)
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(201).json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        organizationId: result.org.id,
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId || undefined,
      roleId: user.roleId || undefined,
      isSuperAdmin: user.isSuperAdmin,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict', // 'none' required for cross-origin (Railway→Netlify)
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
      }
    });

  } catch (error: any) {
     if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
  });
  res.json({ success: true });
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
       return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organization: user.organization,
        role: user.role
      }
    });
  } catch (error) {
     console.error('Me error:', error);
     res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
