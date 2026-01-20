/**
 * Time and Date Tools
 * Provides current time, date, and timezone conversions
 */

export interface TimeResult {
  success: boolean;
  data?: {
    time: string;
    date: string;
    datetime: string;
    timezone: string;
    utcOffset: string;
    dayOfWeek: string;
    timestamp: number;
  };
  error?: string;
}

export interface TimezoneConversionResult {
  success: boolean;
  data?: {
    sourceTime: string;
    sourceTimezone: string;
    targetTime: string;
    targetTimezone: string;
    timeDifference: string;
  };
  error?: string;
}

// Common timezone mappings for natural language
const TIMEZONE_ALIASES: Record<string, string> = {
  // US
  'eastern': 'America/New_York',
  'et': 'America/New_York',
  'est': 'America/New_York',
  'edt': 'America/New_York',
  'central': 'America/Chicago',
  'ct': 'America/Chicago',
  'cst': 'America/Chicago',
  'cdt': 'America/Chicago',
  'mountain': 'America/Denver',
  'mt': 'America/Denver',
  'mst': 'America/Denver',
  'mdt': 'America/Denver',
  'pacific': 'America/Los_Angeles',
  'pt': 'America/Los_Angeles',
  'pst': 'America/Los_Angeles',
  'pdt': 'America/Los_Angeles',
  // Europe
  'london': 'Europe/London',
  'uk': 'Europe/London',
  'gmt': 'Europe/London',
  'bst': 'Europe/London',
  'paris': 'Europe/Paris',
  'berlin': 'Europe/Berlin',
  'cet': 'Europe/Paris',
  // Asia
  'tokyo': 'Asia/Tokyo',
  'jst': 'Asia/Tokyo',
  'japan': 'Asia/Tokyo',
  'beijing': 'Asia/Shanghai',
  'china': 'Asia/Shanghai',
  'shanghai': 'Asia/Shanghai',
  'hong kong': 'Asia/Hong_Kong',
  'singapore': 'Asia/Singapore',
  'dubai': 'Asia/Dubai',
  'india': 'Asia/Kolkata',
  'mumbai': 'Asia/Kolkata',
  'ist': 'Asia/Kolkata',
  // Australia
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne',
  'aest': 'Australia/Sydney',
  // Other
  'utc': 'UTC',
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'la': 'America/Los_Angeles',
  'nyc': 'America/New_York',
};

/**
 * Resolve timezone from alias or return as-is
 */
function resolveTimezone(tz: string): string {
  const normalized = tz.toLowerCase().trim();
  return TIMEZONE_ALIASES[normalized] || tz;
}

/**
 * Get current time and date for a specific timezone
 */
export function getCurrentTime(timezone?: string): TimeResult {
  try {
    const tz = timezone ? resolveTimezone(timezone) : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Get UTC offset
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const offsetParts = offsetFormatter.formatToParts(now);
    const utcOffset = offsetParts.find(p => p.type === 'timeZoneName')?.value || '';

    return {
      success: true,
      data: {
        time: timeFormatter.format(now),
        date: dateFormatter.format(now),
        datetime: formatter.format(now),
        timezone: tz,
        utcOffset,
        dayOfWeek: getPart('weekday'),
        timestamp: now.getTime(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid timezone: ${timezone}. Please use a valid timezone like "America/New_York", "Europe/London", or common names like "Tokyo", "Pacific", etc.`,
    };
  }
}

/**
 * Convert time between timezones
 */
export function convertTimezone(
  time: string,
  fromTimezone: string,
  toTimezone: string
): TimezoneConversionResult {
  try {
    const fromTz = resolveTimezone(fromTimezone);
    const toTz = resolveTimezone(toTimezone);
    
    // Parse the input time (assume today if no date provided)
    let date: Date;
    const now = new Date();
    
    // Try to parse various time formats
    const timeMatch = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2] || '0');
      const meridiem = timeMatch[3]?.toLowerCase();
      
      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      
      date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    } else {
      // Try parsing as full date
      date = new Date(time);
      if (isNaN(date.getTime())) {
        return {
          success: false,
          error: `Could not parse time: "${time}". Try formats like "3:30 PM", "15:30", or "2024-01-20 15:30"`,
        };
      }
    }

    const sourceFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: fromTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: toTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    // Calculate time difference
    const fromOffset = getTimezoneOffset(fromTz);
    const toOffset = getTimezoneOffset(toTz);
    const diffHours = (toOffset - fromOffset) / 60;
    const diffStr = diffHours >= 0 ? `+${diffHours}` : `${diffHours}`;

    return {
      success: true,
      data: {
        sourceTime: sourceFormatter.format(date),
        sourceTimezone: fromTz,
        targetTime: targetFormatter.format(date),
        targetTimezone: toTz,
        timeDifference: `${diffStr} hours`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Timezone conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get timezone offset in minutes
 */
function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

/**
 * Get time in multiple cities at once
 */
export function getWorldTimes(cities: string[] = ['London', 'New York', 'Tokyo', 'Sydney']): {
  success: boolean;
  data?: Array<{ city: string; time: string; date: string }>;
  error?: string;
} {
  try {
    const results = cities.map(city => {
      const result = getCurrentTime(city);
      if (result.success && result.data) {
        return {
          city,
          time: result.data.time,
          date: result.data.date,
        };
      }
      return {
        city,
        time: 'Unknown',
        date: 'Unknown timezone',
      };
    });

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get world times: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
