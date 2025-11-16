// Win Room v2.0 - Auth Middleware
import { NextRequest, NextResponse } from 'next/server';
import { extractToken, verifyToken, hasRole } from './jwt';
import { JWTPayload } from '../types';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Authenticate request and attach user to request
 */
export async function authenticate(
  req: NextRequest
): Promise<{ user: JWTPayload } | NextResponse> {
  const authHeader = req.headers.get('authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return { user };
}

/**
 * Require specific roles
 */
export async function requireRoles(
  req: NextRequest,
  roles: Array<'sales' | 'sales_lead' | 'admin' | 'finance'>
): Promise<{ user: JWTPayload } | NextResponse> {
  const authResult = await authenticate(req);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  if (!hasRole(user, roles)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user };
}

/**
 * Rate limiting helper (simple in-memory)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up old rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // cleanup every minute
