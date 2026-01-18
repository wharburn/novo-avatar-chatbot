import { fetchAccessToken } from 'hume';

export async function getHumeAccessToken(): Promise<string> {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;
  
  // Debug: log if keys are present (not the actual values)
  // Using process.stdout.write for guaranteed output in production
  const logInfo = {
    timestamp: new Date().toISOString(),
    HUME_API_KEY_present: !!apiKey,
    HUME_API_KEY_length: apiKey?.length || 0,
    HUME_SECRET_KEY_present: !!secretKey,
    HUME_SECRET_KEY_length: secretKey?.length || 0,
    NODE_ENV: process.env.NODE_ENV,
  };
  console.log('[getHumeAccessToken] Checking credentials:', JSON.stringify(logInfo));
  
  if (!apiKey || !secretKey) {
    const error = `Missing Hume credentials: API_KEY=${!!apiKey}, SECRET_KEY=${!!secretKey}`;
    console.error('[getHumeAccessToken] ERROR:', error);
    throw new Error(error);
  }

  try {
    console.log('[getHumeAccessToken] Fetching access token from Hume API...');
    const accessToken = await fetchAccessToken({
      apiKey,
      secretKey,
    });

    if (!accessToken) {
      console.error('[getHumeAccessToken] ERROR: Empty access token response');
      throw new Error('Failed to fetch Hume access token - empty response');
    }

    console.log('[getHumeAccessToken] SUCCESS: Access token obtained, length:', accessToken.length);
    return accessToken;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[getHumeAccessToken] ERROR fetching token:', message);
    throw new Error(`Failed to fetch access token: ${message}`);
  }
}
