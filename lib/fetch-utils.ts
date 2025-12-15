/**
 * Common fetch utilities with timeout and error handling
 */

const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; RSS Aggregator/1.0)";
const DEFAULT_TIMEOUT = 10000; // 10 seconds

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Fetch a URL with timeout and standardized headers
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, headers = {}, signal } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine abort signals if both provided
  const finalSignal = signal
    ? (() => {
      const combinedController = new AbortController();
      signal.addEventListener("abort", () => combinedController.abort());
      controller.signal.addEventListener("abort", () => combinedController.abort());
      return combinedController.signal;
    })()
    : controller.signal;

  try {
    const response = await fetch(url, {
      signal: finalSignal,
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        ...headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch HTML content from a URL
 */
export async function fetchHtml(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const response = await fetchWithTimeout(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

