import { Redis } from '@upstash/redis';

// Initialize Redis client
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Types for user profiles (stored by IP address)
export interface UserProfile {
  ipAddress: string;
  // Basic info
  name?: string;
  email?: string;
  phone?: string;
  // Personal details
  birthday?: string;
  age?: number;
  relationshipStatus?: string; // single, married, divorced, etc.
  occupation?: string;
  employer?: string;
  location?: string;
  // Interests and preferences
  interests?: string[];
  preferences?: Record<string, string>;
  // Any other collected info
  additionalInfo?: Record<string, string>;
  notes?: string[];
  // Metadata
  firstSeen: number;
  lastSeen: number;
  visitCount: number;
}

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
const USER_PREFIX = 'novo:user:'; // Hash for each user profile by IP
const USERS_KEY = 'novo:users'; // Set of all user IPs

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

// ============================================
// USER PROFILE FUNCTIONS (IP-based recognition)
// ============================================

/**
 * Get user profile by IP address
 */
export async function getUserByIp(ipAddress: string): Promise<UserProfile | null> {
  const userData = await redis.get(`${USER_PREFIX}${ipAddress}`);
  if (!userData) return null;
  
  return typeof userData === 'string' 
    ? JSON.parse(userData) 
    : userData as UserProfile;
}

/**
 * Create or update user profile
 */
export async function upsertUser(ipAddress: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const existing = await getUserByIp(ipAddress);
  
  const now = Date.now();
  const user: UserProfile = existing 
    ? {
        ...existing,
        ...updates,
        lastSeen: now,
        visitCount: existing.visitCount + (updates.visitCount === undefined ? 0 : 0), // Don't double-increment
      }
    : {
        ipAddress,
        firstSeen: now,
        lastSeen: now,
        visitCount: 1,
        ...updates,
      };
  
  // Store user data
  await redis.set(`${USER_PREFIX}${ipAddress}`, JSON.stringify(user));
  
  // Add to users set
  await redis.sadd(USERS_KEY, ipAddress);
  
  return user;
}

/**
 * Record a user visit (increment visit count and update lastSeen)
 */
export async function recordUserVisit(ipAddress: string): Promise<UserProfile> {
  const existing = await getUserByIp(ipAddress);
  
  if (existing) {
    existing.lastSeen = Date.now();
    existing.visitCount += 1;
    await redis.set(`${USER_PREFIX}${ipAddress}`, JSON.stringify(existing));
    return existing;
  }
  
  // New user
  return upsertUser(ipAddress, {});
}

/**
 * Update specific user fields
 */
export async function updateUserField(
  ipAddress: string, 
  field: keyof UserProfile, 
  value: string | number | string[] | Record<string, string>
): Promise<UserProfile | null> {
  const user = await getUserByIp(ipAddress);
  if (!user) return null;
  
  (user as any)[field] = value;
  user.lastSeen = Date.now();
  
  await redis.set(`${USER_PREFIX}${ipAddress}`, JSON.stringify(user));
  return user;
}

/**
 * Add a note to user profile
 */
export async function addUserNote(ipAddress: string, note: string): Promise<UserProfile | null> {
  const user = await getUserByIp(ipAddress);
  if (!user) return null;
  
  if (!user.notes) user.notes = [];
  user.notes.push(`[${new Date().toISOString()}] ${note}`);
  user.lastSeen = Date.now();
  
  await redis.set(`${USER_PREFIX}${ipAddress}`, JSON.stringify(user));
  return user;
}

/**
 * Get all users (for admin)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const ipAddresses = await redis.smembers(USERS_KEY);
  if (!ipAddresses || ipAddresses.length === 0) return [];
  
  const users: UserProfile[] = [];
  for (const ip of ipAddresses) {
    const user = await getUserByIp(ip as string);
    if (user) users.push(user);
  }
  
  // Sort by lastSeen (most recent first)
  return users.sort((a, b) => b.lastSeen - a.lastSeen);
}
