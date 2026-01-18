'use client';

import { Message } from '@/app/types/message';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isLatest: boolean;
}

export default function MessageBubble({ message, isLatest }: MessageBubbleProps) {
  const isAI = message.type === 'assistant';
  
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className={`flex gap-2 ${isAI ? 'flex-row' : 'flex-row-reverse'} ${
        isLatest ? 'animate-fade-in' : ''
      }`}
    >
      {/* Avatar icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isAI ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        {isAI ? (
          <Bot className="w-5 h-5 text-blue-600" />
        ) : (
          <User className="w-5 h-5 text-gray-600" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col max-w-[75%] ${isAI ? 'items-start' : 'items-end'}`}>
        <div className={`rounded-2xl px-4 py-2 ${
          isAI 
            ? 'bg-blue-50 text-gray-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
          
          {/* Emotion indicator */}
          {isAI && message.emotion && (
            <span className="inline-block mt-1 text-xs text-blue-600 capitalize">
              {message.emotion.name}
            </span>
          )}
        </div>
        
        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>

        {/* Status indicator */}
        {message.status === 'speaking' && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span>Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
