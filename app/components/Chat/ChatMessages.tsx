'use client';

import { useVoice } from '@humeai/voice-react';
import { Bot, User } from 'lucide-react';

export default function ChatMessages() {
  const { messages } = useVoice();

  // Filter to only show user and assistant messages with content
  // Hide the automatic greeting message sent for returning users
  // Reverse to show newest messages at the top
  const chatMessages = messages
    .filter((msg) => {
      if (msg.type !== 'user_message' && msg.type !== 'assistant_message') {
        return false;
      }
      // Hide the automatic greeting trigger for returning users
      const content = (msg as { message?: { content?: string } }).message?.content || '';
      if (
        msg.type === 'user_message' &&
        (content.match(/^Hi! My name is .+ and I'm back\.$/) ||
          content.match(/^Hey NoVo, it's .+!$/) ||
          content.match(/^Hi, it's .+\.$/) ||
          content === 'Hey NoVo!')
      ) {
        return false;
      }
      return true;
    })
    .slice()
    .reverse();

  if (chatMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-center text-gray-400 text-sm">
          Click the green phone button to start a conversation...
        </p>
      </div>
    );
  }

  return (
    <div>
      {chatMessages.map((msg, index) => {
        if (msg.type !== 'user_message' && msg.type !== 'assistant_message') {
          return null;
        }

        const isAssistant = msg.type === 'assistant_message';
        const content = msg.message?.content || '';
        const role = msg.message?.role || (isAssistant ? 'assistant' : 'user');

        return (
          <div
            key={`${msg.type}-${index}`}
            className={`flex gap-2 py-1.5 px-3 w-full ${
              isAssistant ? 'flex-row bg-blue-500/15' : 'flex-row-reverse bg-green-500/15'
            }`}
          >
            {/* Avatar icon */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isAssistant ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              {isAssistant ? (
                <Bot className="w-5 h-5 text-blue-600" />
              ) : (
                <User className="w-5 h-5 text-gray-600" />
              )}
            </div>

            {/* Message content */}
            <div
              className={`flex flex-col max-w-[75%] ${isAssistant ? 'items-start' : 'items-end'}`}
            >
              <div className="px-4 py-2">
                <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
              </div>

              {/* Role label */}
              <span className="text-xs text-gray-400 px-1 capitalize">{role}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
