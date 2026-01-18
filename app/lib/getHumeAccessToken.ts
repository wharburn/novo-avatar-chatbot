import { fetchAccessToken } from 'hume';

export async function getHumeAccessToken(): Promise<string> {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;
  
  // Debug: log if keys are present (not the actual values)
  console.log('HUME_API_KEY present:', !!apiKey, 'length:', apiKey?.length || 0);
  console.log('HUME_SECRET_KEY present:', !!secretKey, 'length:', secretKey?.length || 0);
  
  if (!apiKey || !secretKey) {
    throw new Error(
      `Missing Hume credentials: API_KEY=${!!apiKey}, SECRET_KEY=${!!secretKey}`
    );
  }

  try {
    const accessToken = await fetchAccessToken({
      apiKey,
      secretKey,
    });

    if (!accessToken) {
      throw new Error('Failed to fetch Hume access token - empty response');
    }

    return accessToken;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch access token: ${message}`);
  }
}
