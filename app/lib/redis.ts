import { Redis } from '@upstash/redis';

// Initialize Redis client
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Types for interaction tracking
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  ipAddress: string;
  userAgent?: string;
  startTime: number;
  endTime?: number;
  messages: Message[];
}

export interface SessionSummary {
  id: string;
  ipAddress: string;
  startTime: number;
  endTime?: number;
  messageCount: number;
}

// Redis key patterns
const SESSIONS_KEY = 'novo:sessions'; // Sorted set of session IDs by time
const SESSION_PREFIX = 'novo:session:'; // Hash for each session

/**
 * Create a new session
 */
export async function createSession(ipAddress: string, userAgent?: string): Promise<string> {
  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const session: Session = {
    id: sessionId,
    ipAddress,
    userAgent,
    startTime: Date.now(),
    messages: [],
  };
  
  // Store session data
  await redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session));
  
  // Add to sorted set for time-based queries
  await redis.zadd(SESSIONS_KEY, { score: session.startTime, member: sessionId });
  
  return sessionId;
}

/**
 * Add a message to a session
 */
export async function addMessage(
  sessionId: string, 
  role: 'user' | 'assistant', 
  content: string
): Promise<void> {
  const sessionData = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  if (!sessionData) {
    throw new Error('Session not found');
  }
  
  const session: Session = typeof sessionData === 'string' 
    ? JSON.parse(sessionData) 
    : sessionData as Session;
  
  session.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
  
  await redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session));
}

/**
 * End a session
 */
export async function endSession(sessionId: string): Promise<void> {
  const sessionData = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  if (!sessionData) return;
  
  const session: Session = typeof sessionData === 'string' 
    ? JSON.parse(sessionData) 
    : sessionData as Session;
  
  session.endTime = Date.now();
  await redis.set(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session));
}

/**
 * Get a specific session
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionData = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  if (!sessionData) return null;
  
  return typeof sessionData === 'string' 
    ? JSON.parse(sessionData) 
    : sessionData as Session;
}

/**
 * Get all sessions (paginated)
 */
export async function getSessions(
  limit: number = 50, 
  offset: number = 0
): Promise<SessionSummary[]> {
  // Get session IDs from sorted set (newest first)
  const sessionIds = await redis.zrange(SESSIONS_KEY, offset, offset + limit - 1, { rev: true });
  
  if (!sessionIds || sessionIds.length === 0) return [];
  
  // Fetch each session
  const sessions: SessionSummary[] = [];
  for (const id of sessionIds) {
    const session = await getSession(id as string);
    if (session) {
      sessions.push({
        id: session.id,
        ipAddress: session.ipAddress,
        startTime: session.startTime,
        endTime: session.endTime,
        messageCount: session.messages.length,
      });
    }
  }
  
  return sessions;
}

/**
 * Get total session count
 */
export async function getSessionCount(): Promise<number> {
  return await redis.zcard(SESSIONS_KEY);
}

/**
 * Get sessions by IP address
 */
export async function getSessionsByIp(ipAddress: string): Promise<Session[]> {
  const allSessionIds = await redis.zrange(SESSIONS_KEY, 0, -1, { rev: true });
  const sessions: Session[] = [];
  
  for (const id of allSessionIds) {
    const session = await getSession(id as string);
    if (session && session.ipAddress === ipAddress) {
      sessions.push(session);
    }
  }
  
  return sessions;
}
