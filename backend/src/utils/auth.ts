import jwt, { type SignOptions } from 'jsonwebtoken';
import argon2 from 'argon2';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

export interface TokenPayload {
  userId: string;
  email: string;
  roleId?: string;
  organizationId?: string;
  isSuperAdmin: boolean;
}

export const generateToken = (payload: TokenPayload, expiresIn: SignOptions['expiresIn'] = '1d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};


export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await argon2.verify(hash, password);
};
