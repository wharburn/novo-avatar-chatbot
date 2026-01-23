'use client';

import { X } from 'lucide-react';

interface UserMatch {
  ipAddress: string;
  name?: string;
  email?: string;
  location?: string;
  phone?: string;
  matchScore: number;
  matchedFields: string[];
}

interface UserMatchConfirmationProps {
  matches: UserMatch[];
  onConfirm: (ipAddress: string) => void;
  onDeny: () => void;
}

export default function UserMatchConfirmation({
  matches,
  onConfirm,
  onDeny,
}: UserMatchConfirmationProps) {
  if (!matches || matches.length === 0) return null;

  const topMatch = matches[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Welcome Back!</h3>
          <button
            type="button"
            onClick={onDeny}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-600">
          Are you <span className="font-semibold text-gray-900">{topMatch.name}</span>?
        </p>

        {/* Match details */}
        <div className="bg-blue-50 rounded-lg p-3 space-y-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Matched on:</span>
          </p>
          <ul className="text-sm text-gray-600 space-y-1 ml-2">
            {topMatch.matchedFields.map((field) => (
              <li key={field} className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span className="capitalize">{field}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onDeny}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            No, I'm New
          </button>
          <button
            type="button"
            onClick={() => onConfirm(topMatch.ipAddress)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Yes, That's Me!
          </button>
        </div>
      </div>
    </div>
  );
}

