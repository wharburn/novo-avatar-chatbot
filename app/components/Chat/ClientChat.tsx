'use client';

import dynamic from 'next/dynamic';

// Dynamic import to disable SSR for the Chat component (uses browser APIs)
const Chat = dynamic(() => import('./Chat'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading NoVo...</p>
      </div>
    </div>
  ),
});

interface ClientChatProps {
  accessToken: string;
  configId?: string;
}

export default function ClientChat({ accessToken, configId }: ClientChatProps) {
  return <Chat accessToken={accessToken} configId={configId} />;
}
