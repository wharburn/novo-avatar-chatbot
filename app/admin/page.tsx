'use client';

import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Lock,
  MessageSquare,
  RefreshCw,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Session {
  id: string;
  ipAddress: string;
  userAgent?: string;
  startTime: number;
  endTime?: number;
  messages: Message[];
}

interface SessionSummary {
  id: string;
  ipAddress: string;
  startTime: number;
  endTime?: number;
  messageCount: number;
}

export default function AdminPage() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [total, setTotal] = useState(0);

  // Check if PIN is stored in sessionStorage
  useEffect(() => {
    const storedPin = sessionStorage.getItem('adminPin');
    if (storedPin) {
      setPin(storedPin);
      fetchSessions(storedPin);
    }
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    await fetchSessions(pin);
  };

  const fetchSessions = async (adminPin: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/sessions?pin=${adminPin}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch sessions');
        setIsAuthenticated(false);
        sessionStorage.removeItem('adminPin');
        return;
      }

      setSessions(data.sessions || []);
      setTotal(data.total || 0);
      setIsAuthenticated(true);
      sessionStorage.setItem('adminPin', adminPin);
    } catch {
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetail = async (sessionId: string) => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/sessions?pin=${pin}&id=${sessionId}`);
      const data = await res.json();

      if (res.ok && data.session) {
        setSelectedSession(data.session);
      }
    } catch {
      console.error('Failed to fetch session detail');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (start: number, end?: number) => {
    const endTime = end || Date.now();
    const duration = Math.floor((endTime - start) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPin('');
    setSessions([]);
    setSelectedSession(null);
    sessionStorage.removeItem('adminPin');
  };

  // PIN Entry Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Admin Access</h1>
          <p className="text-gray-500 text-center mb-6">
            Enter your 4-digit PIN to view NoVo interactions
          </p>

          <form onSubmit={handlePinSubmit}>
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  value={pin[index] || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const newPin = pin.split('');
                    newPin[index] = value;
                    setPin(newPin.join(''));

                    // Auto-focus next input
                    if (value && index < 3) {
                      const next = e.target.nextElementSibling as HTMLInputElement;
                      next?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !pin[index] && index > 0) {
                      const prev = (e.target as HTMLElement)
                        .previousElementSibling as HTMLInputElement;
                      prev?.focus();
                    }
                  }}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Session Detail View
  if (selectedSession) {
    return (
      <div className="min-h-screen max-h-screen overflow-hidden flex flex-col bg-gray-100">
        <header className="bg-white border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedSession(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Session Details</h1>
              <p className="text-sm text-gray-500">
                {selectedSession.ipAddress} - {formatDate(selectedSession.startTime)}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
          {/* Session Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">IP Address</p>
                <p className="font-medium">{selectedSession.ipAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Started</p>
                <p className="font-medium">{formatDate(selectedSession.startTime)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">
                  {formatDuration(selectedSession.startTime, selectedSession.endTime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Messages</p>
                <p className="font-medium">{selectedSession.messages.length}</p>
              </div>
            </div>
            {selectedSession.userAgent && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">User Agent</p>
                <p className="text-sm font-mono text-gray-600 break-all">
                  {selectedSession.userAgent}
                </p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Conversation</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {selectedSession.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {selectedSession.messages.length === 0 && (
                <p className="text-gray-500 text-center py-8">No messages in this session</p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Sessions List View
  return (
    <div className="min-h-screen max-h-screen overflow-hidden flex flex-col bg-gray-100">
      <header className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">NoVo Admin</h1>
            <p className="text-sm text-gray-500">Interaction History</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchSessions(pin)}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-t pt-4">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 border-b-2 border-blue-600"
          >
            Sessions
          </button>
          <Link
            href="/admin/users"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border-b-2 border-transparent hover:border-gray-300 transition-colors"
          >
            Users
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-gray-500">Total Sessions</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {sessions.reduce((sum, s) => sum + s.messageCount, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Messages</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {sessions.length > 0 ? formatDate(sessions[0].startTime).split(',')[0] : '-'}
                </p>
                <p className="text-sm text-gray-500">Last Activity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Recent Sessions</h2>
          </div>

          {sessions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sessions recorded yet</p>
            </div>
          ) : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => fetchSessionDetail(session.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{session.ipAddress}</p>
                      <p className="text-sm text-gray-500">{formatDate(session.startTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{session.messageCount} messages</p>
                      <p className="text-xs text-gray-500">
                        {formatDuration(session.startTime, session.endTime)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
