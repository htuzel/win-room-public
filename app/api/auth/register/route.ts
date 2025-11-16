// Win Room v2.0 - POST /api/auth/register (Admin only)
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import bcrypt from 'bcryptjs';

interface RegisterRequest {
  seller_id: string;
  display_name: string;
  email: string;
  password: string;
  role: 'sales' | 'sales_lead' | 'admin' | 'finance';
  pipedrive_owner_id?: number;
}

export async function POST(req: NextRequest) {
  // Only admins can create users
  const authResult = await requireRoles(req, ['admin']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body: RegisterRequest = await req.json();
    const { seller_id, display_name, email, password, role, pipedrive_owner_id } = body;

    // Validate required fields
    if (!seller_id || !display_name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const normalizedPipedriveId = Number(pipedrive_owner_id);
    if (!Number.isFinite(normalizedPipedriveId) || normalizedPipedriveId <= 0) {
      return NextResponse.json(
        { error: 'pipedrive_owner_id is required and must be a positive number' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert seller
    await query(
      `INSERT INTO wr.sellers (seller_id, display_name, email, password_hash, role, pipedrive_owner_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [seller_id, display_name, email.toLowerCase(), passwordHash, role, normalizedPipedriveId]
    );

    return NextResponse.json({
      success: true,
      seller_id,
    });
  } catch (error: any) {
    console.error('Register error:', error);

    // Check for unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
