'use client';

import { Lock, Mail, MapPin, Merge, Phone, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface UserProfile {
  ipAddress: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  birthday?: string;
  age?: number;
  occupation?: string;
  employer?: string;
  interests?: string[];
  notes?: string[];
  appearanceHistory?: {
    timestamp: number;
    summary: string;
    source?: string;
    emotion?: string;
  }[];
  outfitHistory?: {
    timestamp: number;
    summary: string;
    source?: string;
  }[];
  emotionHistory?: {
    timestamp: number;
    emotion: string;
    source?: string;
  }[];
  firstSeen: number;
  lastSeen: number;
  visitCount: number;
  linkedIpAddresses?: string[];
}

export default function UsersPage() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<any>(null);

  // Check if PIN is stored in sessionStorage
  useEffect(() => {
    const storedPin = sessionStorage.getItem('adminPin');
    if (storedPin) {
      setPin(storedPin);
      fetchUsers(storedPin);
    }
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/users?pin=${pin}`);
      if (!response.ok) {
        setError('Invalid PIN');
        setIsAuthenticated(false);
        sessionStorage.removeItem('adminPin');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('adminPin', pin);
      setIsAuthenticated(true);
      setError('');
      await fetchUsers(pin);
    } catch (err) {
      setError('Failed to authenticate');
      setIsAuthenticated(false);
      sessionStorage.removeItem('adminPin');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (adminPin: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users?pin=${adminPin}`);
      if (!response.ok) {
        setError('Failed to load users - Invalid PIN');
        setIsAuthenticated(false);
        sessionStorage.removeItem('adminPin');
        return;
      }

      const data = await response.json();
      setUsers(data.users || []);
      setIsAuthenticated(true);
      setError('');
    } catch (err) {
      setError('Failed to load users');
      setIsAuthenticated(false);
      sessionStorage.removeItem('adminPin');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedUser || !newNote.trim()) return;

    try {
      const response = await fetch(`/api/admin/users?pin=${pin}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNote',
          ipAddress: selectedUser.ipAddress,
          note: newNote,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data.user);
        setNewNote('');
        setShowNoteForm(false);
        await fetchUsers(pin);
      }
    } catch (err) {
      setError('Failed to add note');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPin');
    setIsAuthenticated(false);
    setPin('');
    setUsers([]);
    setSelectedUser(null);
  };

  const handleMergeUsers = async () => {
    if (
      !window.confirm(
        'Are you sure you want to merge duplicate users? This will combine users with the same name and email.'
      )
    ) {
      return;
    }

    try {
      setMerging(true);
      const response = await fetch(`/api/admin/merge-users?pin=${pin}`, {
        method: 'POST',
      });

      if (!response.ok) {
        setError('Failed to merge users');
        return;
      }

      const data = await response.json();
      setMergeResult(data);
      setError('');

      // Refresh users list
      await fetchUsers(pin);

      // Show success message
      setTimeout(() => {
        setMergeResult(null);
      }, 5000);
    } catch (err) {
      setError('Failed to merge users');
      console.error(err);
    } finally {
      setMerging(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.ipAddress.includes(searchTerm)
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // PIN Entry Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Users Dashboard</h1>
          <p className="text-gray-500 text-center mb-6">Enter your 4-digit PIN to view users</p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500"
            />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={pin.length !== 4 || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Access Dashboard'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            <Link href="/" className="text-blue-600 hover:underline">
              Back to Chat
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Users Dashboard
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Users Dashboard</h1>
            <p className="text-sm text-gray-500">{users.length} users collected</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMergeUsers}
              disabled={merging || loading}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 disabled:opacity-50"
              aria-label="Merge duplicate users"
              title="Merge users with same name and email"
            >
              <Merge className={`w-5 h-5 ${merging ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => fetchUsers(pin)}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Refresh users"
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
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border-b-2 border-transparent hover:border-gray-300 transition-colors"
          >
            Sessions
          </Link>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 border-b-2 border-blue-600"
          >
            Users
          </button>
        </div>
      </header>

      {/* Merge Result Notification */}
      {mergeResult && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-green-800 font-medium">
              ✅ Successfully merged {mergeResult.mergedCount} groups of duplicate users
            </p>
            {mergeResult.mergedGroups && mergeResult.mergedGroups.length > 0 && (
              <div className="mt-2 text-sm text-green-700">
                {mergeResult.mergedGroups.map((group: any, idx: number) => (
                  <div key={idx}>
                    • {group.name} ({group.email}) - Linked {group.linkedIps.length} IP(s)
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto flex gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Users List */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Search by name, email, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => (
                  <button
                    type="button"
                    key={user.ipAddress}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedUser?.ipAddress === user.ipAddress
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{user.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">
                          {user.visitCount} visits
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(user.lastSeen)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        {selectedUser && (
          <div className="w-96 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-linear-to-r from-blue-50 to-blue-100">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedUser.name || 'Unknown User'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{selectedUser.ipAddress}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  {selectedUser.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{selectedUser.email}</span>
                    </div>
                  )}
                  {selectedUser.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{selectedUser.phone}</span>
                    </div>
                  )}
                  {selectedUser.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{selectedUser.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Details */}
              {(selectedUser.age || selectedUser.occupation || selectedUser.birthday) && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Personal Details</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {selectedUser.age && <p>Age: {selectedUser.age}</p>}
                    {selectedUser.occupation && <p>Occupation: {selectedUser.occupation}</p>}
                    {selectedUser.birthday && <p>Birthday: {selectedUser.birthday}</p>}
                  </div>
                </div>
              )}

              {/* Visit History */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Visit History</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>First Seen: {formatDate(selectedUser.firstSeen)}</p>
                  <p>Last Seen: {formatDate(selectedUser.lastSeen)}</p>
                  <p>Total Visits: {selectedUser.visitCount}</p>
                </div>
              </div>

              {/* Appearance History */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Appearance History</h3>
                <div className="space-y-2 text-sm text-gray-600 max-h-48 overflow-y-auto">
                  {selectedUser.appearanceHistory && selectedUser.appearanceHistory.length > 0 ? (
                    selectedUser.appearanceHistory
                      .slice(-5)
                      .reverse()
                      .map((entry, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <div className="text-xs text-gray-500">{formatDate(entry.timestamp)}</div>
                          <div className="text-gray-700">{entry.summary}</div>
                          {entry.emotion && (
                            <div className="text-xs text-gray-500">Emotion: {entry.emotion}</div>
                          )}
                          {entry.source && (
                            <div className="text-xs text-gray-400">Source: {entry.source}</div>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-gray-400">No appearance history yet</p>
                  )}
                </div>
              </div>

              {/* Outfit History */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Outfit History</h3>
                <div className="space-y-2 text-sm text-gray-600 max-h-48 overflow-y-auto">
                  {selectedUser.outfitHistory && selectedUser.outfitHistory.length > 0 ? (
                    selectedUser.outfitHistory
                      .slice(-5)
                      .reverse()
                      .map((entry, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <div className="text-xs text-gray-500">{formatDate(entry.timestamp)}</div>
                          <div className="text-gray-700">{entry.summary}</div>
                          {entry.source && (
                            <div className="text-xs text-gray-400">Source: {entry.source}</div>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-gray-400">No outfit history yet</p>
                  )}
                </div>
              </div>

              {/* Emotion History */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Emotion History</h3>
                <div className="space-y-2 text-sm text-gray-600 max-h-48 overflow-y-auto">
                  {selectedUser.emotionHistory && selectedUser.emotionHistory.length > 0 ? (
                    selectedUser.emotionHistory
                      .slice(-5)
                      .reverse()
                      .map((entry, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <div className="text-xs text-gray-500">{formatDate(entry.timestamp)}</div>
                          <div className="text-gray-700">{entry.emotion}</div>
                          {entry.source && (
                            <div className="text-xs text-gray-400">Source: {entry.source}</div>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-gray-400">No emotion history yet</p>
                  )}
                </div>
              </div>

              {/* Linked IP Addresses */}
              {selectedUser.linkedIpAddresses && selectedUser.linkedIpAddresses.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Linked IP Addresses</h3>
                  <div className="space-y-2">
                    {selectedUser.linkedIpAddresses.map((ip, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-sm font-mono ${
                          ip === selectedUser.ipAddress
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {ip}
                        {ip === selectedUser.ipAddress && (
                          <span className="ml-2 text-xs">(Primary)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Notes</h3>
                  <button
                    type="button"
                    onClick={() => setShowNoteForm(!showNoteForm)}
                    className="text-blue-600 hover:text-blue-700"
                    aria-label="Add note"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {showNoteForm && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleAddNote}
                        className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNoteForm(false);
                          setNewNote('');
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedUser.notes && selectedUser.notes.length > 0 ? (
                    selectedUser.notes.map((note, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded text-xs text-gray-600">
                        {note}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No notes yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
