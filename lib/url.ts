/**
 * URL normalization and validation utilities
 */

const ALLOWED_PROTOCOLS = ["http:", "https:"];

/**
 * Normalize and validate a URL
 * Blocks SSRF attempts by only allowing http/https protocols
 */
export function normalizeUrl(input: string): URL | null {
  try {
    // Remove leading/trailing whitespace
    const trimmed = input.trim();

    // If no protocol, assume https
    let urlString = trimmed;
    if (!trimmed.match(/^https?:\/\//i)) {
      urlString = `https://${trimmed}`;
    }

    const url = new URL(urlString);

    // Only allow http/https
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return null;
    }

    // Block localhost and private IPs (basic SSRF protection)
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.20.") ||
      hostname.startsWith("172.21.") ||
      hostname.startsWith("172.22.") ||
      hostname.startsWith("172.23.") ||
      hostname.startsWith("172.24.") ||
      hostname.startsWith("172.25.") ||
      hostname.startsWith("172.26.") ||
      hostname.startsWith("172.27.") ||
      hostname.startsWith("172.28.") ||
      hostname.startsWith("172.29.") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.")
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

/**
 * Convert URL to string, removing trailing slash
 */
export function urlToString(url: URL): string {
  let urlString = url.toString();
  if (urlString.endsWith("/")) {
    urlString = urlString.slice(0, -1);
  }
  return urlString;
}

