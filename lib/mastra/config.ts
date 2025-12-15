/**
 * Mastra configuration for OpenAI
 * 
 * Environment variables required:
 * - OPENAI_API_KEY: Your OpenAI API key
 * - OPENAI_ORG_ID: Your OpenAI organization ID (optional but recommended)
 */

export function getMastraConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const orgId = process.env.OPENAI_ORG_ID;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required for Mastra workflows"
    );
  }

  return {
    apiKey,
    orgId: orgId || undefined,
    // Default model configuration
    defaultModel: "openai/gpt-4o", // or "openai/gpt-4o-mini" for faster/cheaper
  };
}

