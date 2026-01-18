export interface EmotionData {
  name: string;
  score: number;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  emotion?: EmotionData;
  status: 'pending' | 'speaking' | 'complete';
}

export type MessageStatus = Message['status'];
export type MessageType = Message['type'];
