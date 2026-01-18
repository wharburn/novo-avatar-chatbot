import { NextRequest, NextResponse } from 'next/server';
import { createSession, addMessage, endSession } from '@/app/lib/redis';

/**
 * POST /api/sessions
 * Create a new session or add a message to an existing session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, role, content } = body;
    
    // Get IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    switch (action) {
      case 'start': {
        // Create new session
        const newSessionId = await createSession(ipAddress, userAgent);
        return NextResponse.json({ sessionId: newSessionId });
      }
      
      case 'message': {
        // Add message to existing session
        if (!sessionId || !role || !content) {
          return NextResponse.json(
            { error: 'Missing sessionId, role, or content' },
            { status: 400 }
          );
        }
        await addMessage(sessionId, role, content);
        return NextResponse.json({ success: true });
      }
      
      case 'end': {
        // End session
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing sessionId' },
            { status: 400 }
          );
        }
        await endSession(sessionId);
        return NextResponse.json({ success: true });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, message, or end' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
