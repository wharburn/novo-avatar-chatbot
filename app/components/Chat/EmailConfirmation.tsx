'use client';

import { useState } from 'react';
import { Mail, X, Check } from 'lucide-react';

interface EmailConfirmationProps {
  email: string;
  emailType: 'picture' | 'summary';
  onConfirm: (confirmedEmail: string) => void;
  onCancel: () => void;
}

export default function EmailConfirmation({
  email,
  emailType,
  onConfirm,
  onCancel,
}: EmailConfirmationProps) {
  const [editedEmail, setEditedEmail] = useState(email);
  const [isValid, setIsValid] = useState(true);

  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEditedEmail(newEmail);
    setIsValid(validateEmail(newEmail));
  };

  const handleConfirm = () => {
    if (isValid && editedEmail.trim()) {
      onConfirm(editedEmail.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && editedEmail.trim()) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Email</h3>
              <p className="text-sm text-gray-500">
                {emailType === 'picture' ? 'Send photo to:' : 'Send conversation summary to:'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cancel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor="email-input" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email-input"
            type="email"
            value={editedEmail}
            onChange={handleEmailChange}
            onKeyDown={handleKeyPress}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              isValid
                ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                : 'border-red-300 focus:border-red-500 focus:ring-red-200'
            }`}
            placeholder="email@example.com"
            autoFocus
          />
          {!isValid && (
            <p className="text-sm text-red-600">Please enter a valid email address</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || !editedEmail.trim()}
            className={`flex-1 px-4 py-3 font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              isValid && editedEmail.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5" />
            Confirm & Send
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center pt-2">
          Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> to confirm or{' '}
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> to cancel
        </p>
      </div>
    </div>
  );
}

