/**
 * Cloudflare bot protection detection utilities
 */

import { fetchWithTimeout } from "./fetch-utils";

export interface CloudflareDetectionResult {
  isProtected: boolean;
  confidence: "low" | "medium" | "high";
  indicators: string[];
  challengeType?: "browser-verification" | "captcha" | "rate-limit" | "unknown";
}

/**
 * Detect Cloudflare protection from HTTP response
 */
export async function detectCloudflareProtection(
  url: string,
  response?: Response,
  html?: string
): Promise<CloudflareDetectionResult> {
  const indicators: string[] = [];
  let confidence: "low" | "medium" | "high" = "low";
  let challengeType: "browser-verification" | "captcha" | "rate-limit" | "unknown" | undefined;

  // Check HTTP headers
  if (response) {
    const headers = response.headers;
    const server = headers.get("server")?.toLowerCase() || "";
    const cfRay = headers.get("cf-ray");
    const cfCacheStatus = headers.get("cf-cache-status");
    const cfCountry = headers.get("cf-ipcountry");
    const cfVisitor = headers.get("cf-visitor");

    // Strong indicators
    if (cfRay) {
      indicators.push("cf-ray header");
      confidence = "high";
    }

    if (server.includes("cloudflare")) {
      indicators.push("cloudflare server header");
      confidence = "high";
    }

    if (cfCacheStatus) {
      indicators.push("cf-cache-status header");
      confidence = confidence === "low" ? "medium" : confidence;
    }

    if (cfCountry || cfVisitor) {
      indicators.push("cf-* headers present");
      confidence = confidence === "low" ? "medium" : confidence;
    }

    // Check status codes that might indicate challenges
    if (response.status === 403 || response.status === 503) {
      if (cfRay || server.includes("cloudflare")) {
        indicators.push(`HTTP ${response.status} with Cloudflare`);
        challengeType = response.status === 403 ? "rate-limit" : "browser-verification";
        confidence = "high";
      }
    }
  }

  // Check HTML content for challenge pages
  if (html) {
    const lowerHtml = html.toLowerCase();

    // Browser verification challenge
    if (
      lowerHtml.includes("challenge-platform") ||
      lowerHtml.includes("just a moment") ||
      lowerHtml.includes("cf-browser-verification") ||
      lowerHtml.includes("checking your browser") ||
      lowerHtml.includes("ddos protection by cloudflare")
    ) {
      indicators.push("browser verification challenge");
      challengeType = "browser-verification";
      confidence = "high";
    }

    // CAPTCHA challenge
    if (
      lowerHtml.includes("cf-challenge") ||
      lowerHtml.includes("cloudflare captcha") ||
      lowerHtml.includes("cf-chl-bypass")
    ) {
      indicators.push("CAPTCHA challenge");
      challengeType = "captcha";
      confidence = "high";
    }

    // Rate limiting
    if (
      lowerHtml.includes("rate limit") ||
      lowerHtml.includes("too many requests") ||
      lowerHtml.includes("cf-error-details")
    ) {
      indicators.push("rate limit indicator");
      if (!challengeType) {
        challengeType = "rate-limit";
      }
      confidence = confidence === "low" ? "medium" : confidence;
    }

    // Cloudflare-specific scripts and elements
    if (
      lowerHtml.includes("cloudflare") &&
      (lowerHtml.includes("ray id") || lowerHtml.includes("cf-ray"))
    ) {
      indicators.push("Cloudflare error page");
      confidence = confidence === "low" ? "medium" : confidence;
    }
  }

  // If we have multiple indicators, increase confidence
  if (indicators.length >= 2 && confidence === "low") {
    confidence = "medium";
  }
  if (indicators.length >= 3) {
    confidence = "high";
  }

  const isProtected = indicators.length > 0 && confidence !== "low";

  return {
    isProtected,
    confidence,
    indicators,
    challengeType,
  };
}

/**
 * Detect Cloudflare protection by fetching a URL
 */
export async function detectCloudflareFromUrl(
  url: string
): Promise<CloudflareDetectionResult> {
  try {
    const response = await fetchWithTimeout(url, { timeout: 10000 });
    const html = await response.text();

    return detectCloudflareProtection(url, response, html);
  } catch (error) {
    // If fetch fails, it might be due to Cloudflare protection
    // Return a low-confidence result
    return {
      isProtected: false,
      confidence: "low",
      indicators: [],
    };
  }
}

