// Win Room v2.0 - GET /api/auth/me
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  // Authenticate
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  return NextResponse.json({
    seller_id: user.seller_id,
    email: user.email,
    role: user.role,
  });
}
