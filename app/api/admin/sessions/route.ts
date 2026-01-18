import { NextRequest, NextResponse } from 'next/server';
import { getSessions, getSession, getSessionCount, getSessionsByIp } from '@/app/lib/redis';

// Admin PIN code - set in environment variable
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

/**
 * GET /api/admin/sessions
 * Get all sessions (protected by PIN)
 * 
 * Query params:
 * - pin: 4-digit admin PIN (required)
 * - limit: number of sessions to return (default 50)
 * - offset: pagination offset (default 0)
 * - id: specific session ID to fetch
 * - ip: filter by IP address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get('pin');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sessionId = searchParams.get('id');
    const ipFilter = searchParams.get('ip');
    
    // Verify PIN
    if (!pin || pin !== ADMIN_PIN) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid PIN' },
        { status: 401 }
      );
    }
    
    // Get specific session by ID
    if (sessionId) {
      const session = await getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ session });
    }
    
    // Get sessions by IP
    if (ipFilter) {
      const sessions = await getSessionsByIp(ipFilter);
      return NextResponse.json({ 
        sessions,
        total: sessions.length,
      });
    }
    
    // Get paginated sessions
    const sessions = await getSessions(limit, offset);
    const total = await getSessionCount();
    
    return NextResponse.json({
      sessions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Admin sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
