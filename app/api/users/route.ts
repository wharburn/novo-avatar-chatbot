import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserByIp, 
  upsertUser, 
  recordUserVisit, 
  updateUserField,
  addUserNote,
  appendUserHistory,
  UserProfile 
} from '@/app/lib/redis';

/**
 * GET /api/users
 * Get user profile by IP address
 * The IP is automatically detected from the request
 */
export async function GET(request: NextRequest) {
  try {
    // Get IP from headers (works with proxies like Render, Vercel, etc.)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    
    console.log(`[Users API] GET request from IP: ${ip}`);
    
    // Record the visit and get/create user profile
    const user = await recordUserVisit(ip);
    
    return NextResponse.json({
      success: true,
      user,
      isReturningUser: user.visitCount > 1,
      hasName: !!user.name,
    });
  } catch (error) {
    console.error('[Users API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Update user profile
 * Body: { action: 'update', field: string, value: any }
 *    or { action: 'setProfile', name?, email?, phone? }
 *    or { action: 'addNote', note: string }
 *    or { action: 'appendHistory', field: string, entry: object, maxItems?: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Get IP from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    
    const body = await request.json();
    const { action } = body;
    
    console.log(`[Users API] POST request from IP: ${ip}, action: ${action}`);
    
    let user: UserProfile | null = null;
    
    switch (action) {
      case 'update':
        // Update a single field
        const { field, value } = body;
        if (!field) {
          return NextResponse.json(
            { success: false, error: 'Field is required' },
            { status: 400 }
          );
        }
        user = await updateUserField(ip, field as keyof UserProfile, value);
        break;
        
      case 'setProfile':
        // Update multiple profile fields at once
        const updates: Partial<UserProfile> = {};
        if (body.name) updates.name = body.name;
        if (body.email) updates.email = body.email;
        if (body.phone) updates.phone = body.phone;
        if (body.preferences) updates.preferences = body.preferences;
        
        user = await upsertUser(ip, updates);
        console.log(`[Users API] Updated profile for ${ip}:`, updates);
        break;
        
      case 'addNote':
        // Add a note to the user's profile
        const { note } = body;
        if (!note) {
          return NextResponse.json(
            { success: false, error: 'Note is required' },
            { status: 400 }
          );
        }
        user = await addUserNote(ip, note);
        break;
        
      case 'appendHistory': {
        const { field, entry, maxItems } = body;
        if (!field || !entry) {
          return NextResponse.json(
            { success: false, error: 'Field and entry are required' },
            { status: 400 }
          );
        }
        if (!['appearanceHistory', 'outfitHistory', 'emotionHistory'].includes(field)) {
          return NextResponse.json(
            { success: false, error: `Invalid history field: ${field}` },
            { status: 400 }
          );
        }
        user = await appendUserHistory(ip, field, entry, maxItems || 50);
        break;
      }
        
      case 'confirmIdentity':
        // User confirmed they are who we thought
        // Just update lastSeen, maybe add a note
        user = await addUserNote(ip, 'User confirmed identity');
        break;
        
      case 'newUser':
        // User said they are NOT the person we thought
        // Clear name but keep other data? Or create fresh profile?
        // For now, just clear the name so we can re-ask
        user = await updateUserField(ip, 'name', '');
        if (user) {
          await addUserNote(ip, 'User indicated they are a different person');
        }
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[Users API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
