'use client';

import { Message } from '@/app/types/message';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

interface TranscriptContainerProps {
  messages: Message[];
  isVisible: boolean;
  onToggle: () => void;
}

export default function TranscriptContainer({
  messages,
  isVisible,
  onToggle,
}: TranscriptContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to show latest message (which is at the top)
  useEffect(() => {
    if (scrollRef.current && isVisible) {
      scrollRef.current.scrollTop = 0;
    }
  }, [messages, isVisible]);

  return (
    <>
      {/* Transcript Section */}
      <div
        className={`bg-white border-t-2 border-gray-200 transition-all duration-300 ease-in-out overflow-hidden ${
          isVisible ? 'h-[25vh] min-h-[200px] opacity-100' : 'h-0 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">Conversation</h3>
            {messages.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Hide transcript"
          >
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages - Latest at top, scroll down for older */}
        <div ref={scrollRef} className="h-[calc(100%-48px)] overflow-y-auto">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} isLatest={index === 0} />
            ))
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-gray-400 text-sm">
                Start speaking to begin the conversation...
              </p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="text-center text-xs text-gray-400 py-2">
              Scroll down for older messages
            </div>
          )}
        </div>
      </div>

      {/* Expand button when hidden */}
      {!isVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={onToggle}
            className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all border border-gray-200 flex items-center gap-2"
            aria-label="Show transcript"
          >
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <ChevronUp className="w-5 h-5 text-gray-700" />
            {messages.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      )}
    </>
  );
}
