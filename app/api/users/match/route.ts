import { NextRequest, NextResponse } from 'next/server';
import { findPotentialMatches, mergeUserProfiles } from '@/app/lib/userMatching';
import { getUserByIp, updateUserField } from '@/app/lib/redis';

/**
 * POST /api/users/match
 * Find potential user matches and optionally merge profiles
 * 
 * Body: {
 *   email?: string,
 *   name?: string,
 *   location?: string,
 *   phone?: string,
 *   mergeWithIp?: string (if provided, merge with this IP)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, location, phone, mergeWithIp } = body;

    // Get current user's IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const currentIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    console.log(`[Users Match API] Finding matches for IP: ${currentIp}`);

    // Find potential matches
    const matches = await findPotentialMatches(email, name, location, phone);
    console.log(`[Users Match API] Found ${matches.length} potential matches`);

    // If mergeWithIp is provided, merge the profiles
    if (mergeWithIp && matches.some((m) => m.ipAddress === mergeWithIp)) {
      console.log(`[Users Match API] Merging ${currentIp} with ${mergeWithIp}`);

      const updates: Record<string, any> = {};
      if (email) updates.email = email;
      if (name) updates.name = name;
      if (location) updates.location = location;
      if (phone) updates.phone = phone;

      await mergeUserProfiles(mergeWithIp, currentIp, updates);

      // Update current user to point to merged profile
      const mergedUser = await getUserByIp(mergeWithIp);

      return NextResponse.json({
        success: true,
        merged: true,
        mergedWithIp: mergeWithIp,
        user: mergedUser,
      });
    }

    return NextResponse.json({
      success: true,
      matches,
      currentIp,
    });
  } catch (error) {
    console.error('[Users Match API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to find user matches' },
      { status: 500 }
    );
  }
}

