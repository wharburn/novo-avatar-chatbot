import { redis } from './redis';

export interface UserMatch {
  ipAddress: string;
  name?: string;
  email?: string;
  location?: string;
  phone?: string;
  matchScore: number;
  matchedFields: string[];
}

/**
 * Find potential user matches based on collected information
 * Returns users with 2+ matching fields
 */
export async function findPotentialMatches(
  email?: string,
  name?: string,
  location?: string,
  phone?: string
): Promise<UserMatch[]> {
  try {
    // Get all user IPs
    const userIps = await redis.smembers('novo:users');
    if (!userIps || userIps.length === 0) {
      return [];
    }

    const matches: UserMatch[] = [];

    // Check each existing user for matches
    for (const ip of userIps) {
      const userData = await redis.get(`novo:user:${ip}`);
      if (!userData) continue;

      const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
      const matchedFields: string[] = [];
      let matchScore = 0;

      // Check each field for matches (case-insensitive, trimmed)
      if (email && user.email && email.toLowerCase().trim() === user.email.toLowerCase().trim()) {
        matchedFields.push('email');
        matchScore += 2; // Email is most reliable
      }

      if (phone && user.phone && phone.trim() === user.phone.trim()) {
        matchedFields.push('phone');
        matchScore += 2;
      }

      if (name && user.name && name.toLowerCase().trim() === user.name.toLowerCase().trim()) {
        matchedFields.push('name');
        matchScore += 1;
      }

      if (location && user.location && location.toLowerCase().trim() === user.location.toLowerCase().trim()) {
        matchedFields.push('location');
        matchScore += 1;
      }

      // Only return matches with 2+ matching fields
      if (matchedFields.length >= 2) {
        matches.push({
          ipAddress: ip,
          name: user.name,
          email: user.email,
          location: user.location,
          phone: user.phone,
          matchScore,
          matchedFields,
        });
      }
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error('Error finding user matches:', error);
    return [];
  }
}

/**
 * Merge two user profiles (consolidate duplicate users)
 * Keeps the older profile's IP but updates with newer info
 */
export async function mergeUserProfiles(
  existingIp: string,
  newIp: string,
  updates: Record<string, any>
): Promise<void> {
  try {
    // Get both profiles
    const existingData = await redis.get(`novo:user:${existingIp}`);
    const newData = await redis.get(`novo:user:${newIp}`);

    if (!existingData) return;

    const existingUser = typeof existingData === 'string' ? JSON.parse(existingData) : existingData;
    const newUser = newData ? (typeof newData === 'string' ? JSON.parse(newData) : newData) : null;

    // Merge profiles - keep existing but update with new info
    const mergedUser = {
      ...existingUser,
      ...updates,
      lastSeen: Date.now(),
      visitCount: existingUser.visitCount + (newUser?.visitCount || 0),
    };

    // Add note about merge
    if (!mergedUser.notes) mergedUser.notes = [];
    mergedUser.notes.push(`[${new Date().toISOString()}] Merged profile from IP ${newIp}`);

    // Update the existing profile
    await redis.set(`novo:user:${existingIp}`, JSON.stringify(mergedUser));

    // Remove the new IP from users set
    await redis.srem('novo:users', newIp);

    console.log(`✅ Merged user profiles: ${newIp} -> ${existingIp}`);
  } catch (error) {
    console.error('Error merging user profiles:', error);
  }
}

