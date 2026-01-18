import { getHumeAccessToken } from './lib/getHumeAccessToken';
import ClientChat from './components/Chat/ClientChat';

// Force dynamic rendering to ensure fresh token on each request
export const dynamic = 'force-dynamic';

export default async function Page() {
  let accessToken: string | null = null;
  let error: string | null = null;

  console.log('[Page] Starting page render...');

  try {
    accessToken = await getHumeAccessToken();
    console.log('[Page] Access token obtained successfully');
  } catch (err) {
    console.error('[Page] Failed to get access token:', err);
    error = err instanceof Error ? err.message : 'Failed to authenticate with Hume AI';
  }

  if (error || !accessToken) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Failed to connect to Hume AI'}</p>
          <p className="text-sm text-gray-500">
            Please check that your <code className="bg-gray-100 px-1 rounded">HUME_API_KEY</code> and{' '}
            <code className="bg-gray-100 px-1 rounded">HUME_SECRET_KEY</code> are correctly set in{' '}
            <code className="bg-gray-100 px-1 rounded">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientChat 
      accessToken={accessToken} 
      configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID} 
    />
  );
}
