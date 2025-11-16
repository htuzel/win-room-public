// Win Room v2.0 - Admin Seller Management (Single Seller)
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

interface RouteParams {
  params: {
    id: string;
  };
}

// PATCH - Update seller information
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const sellerId = params.id;

  try {
    const body = await req.json();
    const { display_name, email, role, is_active, pipedrive_owner_id } = body;

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (display_name !== undefined) {
      updates.push(`display_name = $${valueIndex++}`);
      values.push(display_name);
    }

    if (email !== undefined) {
      updates.push(`email = $${valueIndex++}`);
      values.push(email);
    }

    if (role !== undefined) {
      updates.push(`role = $${valueIndex++}`);
      values.push(role);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${valueIndex++}`);
      values.push(is_active);
    }

    if (pipedrive_owner_id !== undefined) {
      const normalized = Number(pipedrive_owner_id);
      if (!Number.isFinite(normalized) || normalized <= 0) {
        return NextResponse.json(
          { error: 'pipedrive_owner_id must be a positive number' },
          { status: 400 }
        );
      }
      updates.push(`pipedrive_owner_id = $${valueIndex++}`);
      values.push(normalized);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add seller_id as last parameter
    values.push(sellerId);

    const result = await query<any>(
      `UPDATE wr.sellers
       SET ${updates.join(', ')}
       WHERE seller_id = $${valueIndex}
       RETURNING seller_id, display_name, email, role, is_active, pipedrive_owner_id`,
      values
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Seller ${sellerId} updated successfully`,
      seller: result[0],
    });
  } catch (error) {
    console.error('Update seller error:', error);
    return NextResponse.json(
      { error: 'Failed to update seller' },
      { status: 500 }
    );
  }
}

// DELETE - Delete seller
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const sellerId = params.id;

  try {
    // Check if seller has any attributions
    const attributionCheck = await query<any>(
      `SELECT COUNT(*) as count
       FROM wr.attribution
       WHERE closer_seller_id = $1 OR assisted_seller_id = $1`,
      [sellerId]
    );

    const hasAttributions = parseInt(attributionCheck[0]?.count || '0') > 0;

    if (hasAttributions) {
      // Soft delete by setting is_active to false
      const result = await query<any>(
        `UPDATE wr.sellers
         SET is_active = false
         WHERE seller_id = $1
         RETURNING seller_id, display_name`,
        [sellerId]
      );

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Seller not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Seller ${sellerId} has existing sales records and has been deactivated instead of deleted`,
        deactivated: true,
      });
    } else {
      // Hard delete if no attributions exist
      const result = await query<any>(
        `DELETE FROM wr.sellers
         WHERE seller_id = $1
         RETURNING seller_id, display_name`,
        [sellerId]
      );

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Seller not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Seller ${sellerId} deleted successfully`,
        deleted: true,
      });
    }
  } catch (error) {
    console.error('Delete seller error:', error);
    return NextResponse.json(
      { error: 'Failed to delete seller' },
      { status: 500 }
    );
  }
}
