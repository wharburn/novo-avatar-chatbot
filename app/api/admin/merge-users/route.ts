import { mergeDuplicateUsers } from '@/app/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

// Admin PIN code - set in environment variable
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

/**
 * POST /api/admin/merge-users
 * Merges duplicate users with same name and email
 * Requires admin PIN
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');

    // Verify PIN
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json({ error: 'Unauthorized - invalid PIN' }, { status: 401 });
    }

    console.log('🔗 Starting user merge process...');
    const result = await mergeDuplicateUsers();

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${result.mergedCount} groups of duplicate users`,
      mergedCount: result.mergedCount,
      mergedGroups: result.mergedGroups,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Admin merge users API error:', errorMessage);

    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

