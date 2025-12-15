/**
 * Step: Load voice profile for a project
 */

import { db } from "@/lib/db";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

const LoadVoiceProfileInputSchema = z.object({
  projectId: z.string(),
});

const LoadVoiceProfileOutputSchema = z.object({
  voiceProfile: z
    .object({
      id: z.string(),
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

export const loadVoiceProfileStep = createStep({
  id: "load-voice-profile",
  description: "Load Voice Profile",
  inputSchema: LoadVoiceProfileInputSchema,
  outputSchema: LoadVoiceProfileOutputSchema,
  execute: async ({ inputData }) => {
    const { projectId } = inputData;

    const voiceProfile = await db.voiceProfile.findUnique({
      where: { projectId },
      include: {
        voiceSamples: {
          select: {
            title: true,
            content: true,
          },
        },
      },
    });

    if (!voiceProfile) {
      return { voiceProfile: null };
    }

    return {
      voiceProfile: {
        id: voiceProfile.id,
        displayName: voiceProfile.displayName,
        styleGuide: voiceProfile.styleGuide,
        doList: voiceProfile.doList as string[],
        dontList: voiceProfile.dontList as string[],
        bannedPhrases: voiceProfile.bannedPhrases as string[],
        samples: voiceProfile.voiceSamples.map((vs) => ({
          title: vs.title,
          content: vs.content,
        })),
      },
    };
  },
});

