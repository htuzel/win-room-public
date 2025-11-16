// Win Room v2.0 - POST /api/auth/login
import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db/connection';
import { generateToken } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: LoginRequest = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find seller by email
    const seller = await queryOne<{
      seller_id: string;
      email: string;
      password_hash: string | null;
      role: 'sales' | 'sales_lead' | 'admin' | 'finance';
      is_active: boolean;
    }>(
      `SELECT seller_id, email, password_hash, role, is_active
       FROM wr.sellers
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!seller) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!seller.is_active) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      );
    }

    // Check password
    if (!seller.password_hash) {
      // Development mode: no password set, allow login
      console.warn(`[Auth] User ${email} has no password - development mode`);
    } else {
      const isValidPassword = await bcrypt.compare(password, seller.password_hash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
    }

    // Generate JWT token
    const token = generateToken({
      seller_id: seller.seller_id,
      email: seller.email,
      role: seller.role,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        seller_id: seller.seller_id,
        email: seller.email,
        role: seller.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
