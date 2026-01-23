import { NextRequest, NextResponse } from 'next/server';

interface GeolocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
}

/**
 * GET /api/geolocation
 * Get user's location from their IP address
 * Uses ip-api.com (free tier, no API key required)
 */
export async function GET(request: NextRequest) {
  try {
    // Get client IP from request headers
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      '0.0.0.0';

    console.log('🌍 Getting geolocation for IP:', ip);

    // Use ip-api.com for geolocation (free tier)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,lat,lon,city,country,timezone`,
      {
        headers: {
          'User-Agent': 'NovoAvatarChatbot/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error('❌ Geolocation API error:', response.status);
      // Return default location (NYC) if geolocation fails
      return NextResponse.json({
        success: true,
        latitude: 40.7128,
        longitude: -74.006,
        city: 'New York',
        country: 'United States',
        timezone: 'America/New_York',
        isDefault: true,
      });
    }

    const data = await response.json();

    if (data.status !== 'success') {
      console.warn('⚠️ Geolocation lookup failed:', data.message);
      // Return default location if lookup fails
      return NextResponse.json({
        success: true,
        latitude: 40.7128,
        longitude: -74.006,
        city: 'New York',
        country: 'United States',
        timezone: 'America/New_York',
        isDefault: true,
      });
    }

    console.log('✅ Geolocation found:', {
      city: data.city,
      country: data.country,
      lat: data.lat,
      lon: data.lon,
    });

    return NextResponse.json({
      success: true,
      latitude: data.lat,
      longitude: data.lon,
      city: data.city,
      country: data.country,
      timezone: data.timezone,
      isDefault: false,
    });
  } catch (error) {
    console.error('Geolocation error:', error);
    // Return default location on error
    return NextResponse.json({
      success: true,
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      country: 'United States',
      timezone: 'America/New_York',
      isDefault: true,
    });
  }
}
