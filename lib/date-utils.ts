/**
 * Date parsing and extraction utilities
 */

/**
 * Parse date from various formats - comprehensive date parser
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString || !dateString.trim()) {
    return null;
  }

  const cleaned = cleanDateString(dateString);
  
  // Try ISO format first (most reliable)
  let date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try relative dates
  const relativeDate = parseRelativeDate(cleaned);
  if (relativeDate) return relativeDate;

  // Try written formats
  const writtenDate = parseWrittenDate(cleaned);
  if (writtenDate) return writtenDate;

  // Try numeric formats
  const numericDate = parseNumericDate(cleaned);
  if (numericDate) return numericDate;

  // Try date-time formats
  const dateTime = parseDateTime(cleaned);
  if (dateTime) return dateTime;

  // Try Unix timestamp
  const timestamp = parseTimestamp(cleaned);
  if (timestamp) return timestamp;

  // Last attempt: native Date parsing
  date = new Date(cleaned);
  return !isNaN(date.getTime()) ? date : null;
}

/**
 * Clean up date string - remove prefixes, suffixes, timezones
 */
function cleanDateString(dateString: string): string {
  let cleaned = dateString.trim();
  cleaned = cleaned.replace(/^(Published|Posted|Updated|Created|Date|On):?\s*/i, "");
  cleaned = cleaned.replace(/^(at|on)\s+/i, "");
  cleaned = cleaned.replace(/\s+(UTC|GMT|EST|PST|CST|EDT|PDT|CDT)(\s|$)/i, "");
  return cleaned;
}

/**
 * Parse relative dates like "2 days ago", "yesterday", "today"
 */
function parseRelativeDate(dateString: string): Date | null {
  const now = new Date();
  const relativePatterns = [
    { pattern: /(\d+)\s+seconds?\s+ago/i, unit: 'seconds' },
    { pattern: /(\d+)\s+minutes?\s+ago/i, unit: 'minutes' },
    { pattern: /(\d+)\s+hours?\s+ago/i, unit: 'hours' },
    { pattern: /(\d+)\s+days?\s+ago/i, unit: 'days' },
    { pattern: /(\d+)\s+weeks?\s+ago/i, unit: 'weeks' },
    { pattern: /(\d+)\s+months?\s+ago/i, unit: 'months' },
    { pattern: /(\d+)\s+years?\s+ago/i, unit: 'years' },
    { pattern: /^yesterday$/i, offset: () => new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    { pattern: /^today$/i, offset: () => now },
    { pattern: /^now$/i, offset: () => now },
  ];

  for (const { pattern, unit, offset } of relativePatterns) {
    const match = dateString.match(pattern);
    if (match) {
      if (offset) return offset();
      if (unit) {
        const value = parseInt(match[1], 10);
        const multipliers: Record<string, number> = {
          seconds: 1000,
          minutes: 60 * 1000,
          hours: 60 * 60 * 1000,
          days: 24 * 60 * 60 * 1000,
          weeks: 7 * 24 * 60 * 60 * 1000,
          months: 30 * 24 * 60 * 60 * 1000,
          years: 365 * 24 * 60 * 60 * 1000,
        };
        return new Date(now.getTime() - value * multipliers[unit]);
      }
    }
  }
  return null;
}

/**
 * Parse written date formats like "November 24, 2025"
 */
function parseWrittenDate(dateString: string): Date | null {
  const patterns = [
    { regex: /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/, format: (m: RegExpMatchArray) => `${m[1]} ${m[2]}, ${m[3]}` },
    { regex: /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/, format: (m: RegExpMatchArray) => `${m[2]} ${m[1]}, ${m[3]}` },
    { regex: /(\d{1,2})[-/]([A-Za-z]+)[-/](\d{4})/, format: (m: RegExpMatchArray) => `${m[2]} ${m[1]}, ${m[3]}` },
    { regex: /(\d{4})[-/]([A-Za-z]+)[-/](\d{1,2})/, format: (m: RegExpMatchArray) => `${m[2]} ${m[3]}, ${m[1]}` },
  ];

  for (const { regex, format } of patterns) {
    const match = dateString.match(regex);
    if (match) {
      const formatted = format(match);
      const date = new Date(formatted);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

/**
 * Parse numeric date formats like "2025-11-24" or "11/24/2025"
 */
function parseNumericDate(dateString: string): Date | null {
  const patterns = [
    {
      regex: /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
      parse: (m: RegExpMatchArray) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])),
    },
    {
      regex: /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
      parse: (m: RegExpMatchArray) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])),
    },
    {
      regex: /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/,
      parse: (m: RegExpMatchArray) => {
        const first = parseInt(m[1]);
        const second = parseInt(m[2]);
        const year = parseInt(m[3]);
        // Try DD/MM/YYYY first
        if (first <= 31 && second <= 12) {
          const date = new Date(year, second - 1, first);
          if (!isNaN(date.getTime())) return date;
        }
        // Fallback to MM/DD/YYYY
        return new Date(year, first - 1, second);
      },
    },
    {
      regex: /(\d{1,2})[-/](\d{1,2})[-/](\d{2})(?!\d)/,
      parse: (m: RegExpMatchArray) => new Date(2000 + parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2])),
    },
  ];

  for (const { regex, parse } of patterns) {
    const match = dateString.match(regex);
    if (match) {
      const date = parse(match);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

/**
 * Parse date-time formats like "November 24, 2025 at 10:30 AM"
 */
function parseDateTime(dateString: string): Date | null {
  const patterns = [
    {
      regex: /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i,
      parse: (m: RegExpMatchArray) => {
        let hour24 = parseInt(m[4]);
        if (m[6].toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
        if (m[6].toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
        return new Date(`${m[1]} ${m[2]}, ${m[3]} ${hour24}:${m[5]}`);
      },
    },
    {
      regex: /(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
      parse: (m: RegExpMatchArray) => new Date(
        parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]),
        parseInt(m[4]), parseInt(m[5]), m[6] ? parseInt(m[6]) : 0
      ),
    },
    {
      regex: /(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i,
      parse: (m: RegExpMatchArray) => {
        let hour24 = parseInt(m[4]);
        if (m[6].toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
        if (m[6].toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
        return new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]), hour24, parseInt(m[5]));
      },
    },
  ];

  for (const { regex, parse } of patterns) {
    const match = dateString.match(regex);
    if (match) {
      const date = parse(match);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

/**
 * Parse Unix timestamp (10 or 13 digits)
 */
function parseTimestamp(dateString: string): Date | null {
  const match = dateString.match(/^\d{10,13}$/);
  if (match) {
    const timestamp = parseInt(dateString, 10);
    const date = timestamp < 10000000000
      ? new Date(timestamp * 1000)
      : new Date(timestamp);
    return !isNaN(date.getTime()) ? date : null;
  }
  return null;
}

/**
 * Extract date from HTML element using multiple strategies
 */
export function extractDateFromElement(
  $: any,
  element: any,
  dateSelector?: string
): Date | null {
  // Try configured selector first
  if (dateSelector) {
    const dateEl = $(element).find(dateSelector).first();
    const dateText = dateEl.text().trim();
    if (dateText) {
      const parsed = parseDate(dateText);
      if (parsed) return parsed;
    }
  }

  // Try datetime attribute
  const timeEl = $(element).find("time[datetime]").first();
  const datetime = timeEl.attr("datetime");
  if (datetime) {
    const parsed = parseDate(datetime);
    if (parsed) return parsed;
  }

  // Search for elements with "date" in class name
  const dateElements = $(element).find('[class*="date"], [class*="Date"], [class*="published"], [class*="Published"]');
  for (const el of dateElements.toArray()) {
    const text = $(el).text().trim();
    if (text) {
      const parsed = parseDate(text);
      if (parsed) return parsed;
    }
  }

  // Search for date-like text patterns
  const allElements = $(element).find('*');
  const datePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i;
  
  for (const el of allElements.toArray()) {
    const text = $(el).text().trim();
    if (text && datePattern.test(text)) {
      const parsed = parseDate(text);
      if (parsed) return parsed;
    }
  }

  return null;
}

