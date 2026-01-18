'use client';

import { useState, useCallback } from 'react';
import { Message } from '@/app/types/message';

export function useTranscript() {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [message, ...prev]); // Add to beginning (latest first)
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  const updateLastMessageStatus = useCallback((status: Message['status']) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      return [{ ...first, status }, ...rest];
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const getMessageById = useCallback((id: string) => {
    return messages.find(msg => msg.id === id);
  }, [messages]);

  return {
    messages,
    addMessage,
    updateMessage,
    updateLastMessageStatus,
    clearMessages,
    getMessageById,
    messageCount: messages.length
  };
}
