import { fetchAccessToken } from 'hume';

export async function getHumeAccessToken(): Promise<string> {
  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    secretKey: String(process.env.HUME_SECRET_KEY),
  });

  if (!accessToken) {
    throw new Error('Failed to fetch Hume access token');
  }

  return accessToken;
}
