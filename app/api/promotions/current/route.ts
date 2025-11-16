// Win Room v2.0 - Current Promotion API (Public)
import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db/connection';

export const dynamic = 'force-dynamic';

// GET /api/promotions/current - Get current active promotion (public, no auth required)
export async function GET() {
  try {
    const promotion = await queryOne<{
      id: number;
      title: string;
      message: string;
      variant: 'promo' | 'info' | 'success' | 'warning';
      icon: string;
      visible: boolean;
    }>(`
      SELECT id, title, message, variant, icon, visible
      FROM wr.promotions
      WHERE visible = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // If no promotion found or not visible, return null
    if (!promotion || !promotion.visible) {
      return NextResponse.json({
        title: '',
        message: '',
        variant: 'info',
        icon: '',
        visible: false,
      });
    }

    return NextResponse.json(promotion);
  } catch (error) {
    console.error('Get current promotion error:', error);
    // Return empty/hidden promotion on error
    return NextResponse.json({
      title: '',
      message: '',
      variant: 'info',
      icon: '',
      visible: false,
    });
  }
}
