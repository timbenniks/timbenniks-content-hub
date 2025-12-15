/**
 * Step: Generate content using AI with voice profile
 */

import { createStep } from "@mastra/core/workflows";
import { Agent } from "@mastra/core";
import { z } from "zod";
import { getMastraConfig } from "../config";

const GenerateContentInputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
      contentSnippet: z.string().nullable(),
      source: z.object({
        title: z.string().nullable(),
        siteUrl: z.string(),
      }),
    })
  ),
  voiceProfile: z
    .object({
      displayName: z.string(),
      styleGuide: z.string(),
      doList: z.array(z.string()),
      dontList: z.array(z.string()),
      bannedPhrases: z.array(z.string()),
      samples: z.array(
        z.object({
          title: z.string(),
          content: z.string(),
        })
      ),
    })
    .nullable(),
});

const GenerateContentOutputSchema = z.object({
  itemSummaries: z.array(
    z.object({
      itemId: z.string(),
      summary: z.string(),
    })
  ),
  content: z.string(), // Combined markdown of all summaries
});

export const generateContentStep = createStep({
  id: "generate-content",
  description: "Generate Social Post Summaries",
  inputSchema: GenerateContentInputSchema,
  outputSchema: GenerateContentOutputSchema,
  execute: async ({ inputData }) => {
    const { items, voiceProfile } = inputData;
    const config = getMastraConfig();

    const agent = new Agent({
      name: "content-generator",
      instructions: `You are a social media content writer. Generate engaging, detailed social post summaries for RSS items, following the provided voice profile. Be opinionated, punchy, and human. Never invent facts. Each summary should be 3-5 sentences (approximately 100-200 words), providing context, key insights, and your unique perspective. Make it substantial enough to be valuable standalone content.`,
      model: config.defaultModel,
    });

    // Build voice profile context
    const voiceContext = voiceProfile
      ? `
Voice Profile: ${voiceProfile.displayName}

Style Guide:
${voiceProfile.styleGuide}

Do:
${voiceProfile.doList.map((item) => `- ${item}`).join("\n")}

Don't:
${voiceProfile.dontList.map((item) => `- ${item}`).join("\n")}

Banned Phrases (never use these):
${voiceProfile.bannedPhrases.map((phrase) => `- ${phrase}`).join("\n")}

Writing Samples:
${voiceProfile.samples.map((s) => `\nTitle: ${s.title}\n${s.content}`).join("\n\n")}
`
      : "Use a conversational, opinionated tone. Be concise and human.";

    // Generate summaries for each item in parallel
    const summaryPromises = items.map(async (item) => {
      const itemContext = `**${item.title}**\nSource: ${item.source.title || item.source.siteUrl}\nURL: ${item.url}\n${item.contentSnippet ? `Content: ${item.contentSnippet.substring(0, 500)}` : ""}`;

      const prompt = `${voiceContext}

Generate a social post summary for this RSS item. Requirements:
- 3-5 sentences (approximately 100-200 words)
- Be punchy and opinionated
- Provide context and key insights
- Add your unique perspective and analysis
- Use your voice profile style throughout
- Don't invent facts - only use information from the item
- Make it substantial enough to be valuable standalone content
- Include the source URL at the end

RSS Item:
${itemContext}

Respond with ONLY the summary text (no markdown, no JSON, just the text).`;

      try {
        const response = await agent.generate(prompt);
        return {
          itemId: item.id,
          summary: response.text.trim(),
        };
      } catch (error) {
        // Fallback: use title and snippet
        return {
          itemId: item.id,
          summary: `${item.title}. ${item.contentSnippet ? item.contentSnippet.substring(0, 150) + "..." : ""} ${item.url}`,
        };
      }
    });

    const itemSummaries = await Promise.all(summaryPromises);

    // Build combined markdown content
    const content = itemSummaries
      .map((summary) => {
        const item = items.find((i) => i.id === summary.itemId);
        return `## ${item?.title || "Item"}\n\n${summary.summary}\n\n[Read more](${item?.url || ""})`;
      })
      .join("\n\n---\n\n");

    return {
      itemSummaries,
      content,
    };
  },
});

