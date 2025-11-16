// Win Room v2.0 - JWT Authentication
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'change-this-secret';
const JWT_SIGN_OPTIONS: SignOptions = {
  expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
};

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, JWT_SIGN_OPTIONS);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if user has required role
 */
export function hasRole(
  user: JWTPayload,
  requiredRoles: Array<'sales' | 'sales_lead' | 'admin' | 'finance'>
): boolean {
  return requiredRoles.includes(user.role);
}

/**
 * Check if user is admin or finance
 */
export function isAdminOrFinance(user: JWTPayload): boolean {
  return hasRole(user, ['admin', 'finance']);
}
