import { NextResponse } from 'next/server';

// Debug endpoint to check environment configuration
// This doesn't expose actual values, just whether they're set
export async function GET() {
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    credentials: {
      HUME_API_KEY: {
        set: !!process.env.HUME_API_KEY,
        length: process.env.HUME_API_KEY?.length || 0,
      },
      HUME_SECRET_KEY: {
        set: !!process.env.HUME_SECRET_KEY,
        length: process.env.HUME_SECRET_KEY?.length || 0,
      },
      NEXT_PUBLIC_HUME_CONFIG_ID: {
        set: !!process.env.NEXT_PUBLIC_HUME_CONFIG_ID,
        value: process.env.NEXT_PUBLIC_HUME_CONFIG_ID || 'NOT SET',
      },
    },
    redis: {
      UPSTASH_REDIS_REST_URL: {
        set: !!process.env.UPSTASH_REDIS_REST_URL,
      },
      UPSTASH_REDIS_REST_TOKEN: {
        set: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      },
    },
  };

  // Log to server console as well
  console.log('[DEBUG API] Environment check:', JSON.stringify(envCheck, null, 2));

  return NextResponse.json(envCheck);
}
