import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUserByIp, updateUserField, addUserNote } from '@/app/lib/redis';

// Admin PIN code - set in environment variable
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

/**
 * GET /api/admin/users
 * Get all users with their profiles (protected by PIN)
 * 
 * Query params:
 * - pin: 4-digit admin PIN (required)
 * - ip: filter by specific IP address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');
    const ipFilter = searchParams.get('ip');

    // Verify PIN
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid PIN' },
        { status: 401 }
      );
    }

    // Get specific user by IP
    if (ipFilter) {
      const user = await getUserByIp(ipFilter);
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ user });
    }

    // Get all users
    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Update user profile or add notes (protected by PIN)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');
    const body = await request.json();
    const { action, ipAddress, field, value, note } = body;

    // Verify PIN
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid PIN' },
        { status: 401 }
      );
    }

    if (!ipAddress) {
      return NextResponse.json(
        { error: 'ipAddress is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'updateField': {
        if (!field || value === undefined) {
          return NextResponse.json(
            { error: 'field and value are required' },
            { status: 400 }
          );
        }
        const user = await updateUserField(ipAddress, field, value);
        return NextResponse.json({ success: true, user });
      }

      case 'addNote': {
        if (!note) {
          return NextResponse.json(
            { error: 'note is required' },
            { status: 400 }
          );
        }
        const user = await addUserNote(ipAddress, note);
        return NextResponse.json({ success: true, user });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

