/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate a unique API key
 */
export function generateApiKey(): string {
  const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(32)));
  return Buffer.from(randomBytes).toString("base64url");
}

