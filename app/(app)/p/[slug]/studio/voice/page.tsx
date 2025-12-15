import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { VoiceProfileForm } from "@/components/voice-profile-form";

export default async function StudioVoicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      voiceProfile: {
        include: {
          voiceSamples: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Voice Profile</h2>
        <p className="text-muted-foreground">
          Define your writing style and preferences
        </p>
      </div>

      <VoiceProfileForm
        projectId={project.id}
        voiceProfile={
          project.voiceProfile
            ? {
                ...project.voiceProfile,
                doList: (project.voiceProfile.doList as string[]) || [],
                dontList: (project.voiceProfile.dontList as string[]) || [],
                bannedPhrases:
                  (project.voiceProfile.bannedPhrases as string[]) || [],
                voiceSamples: project.voiceProfile.voiceSamples.map((vs) => ({
                  id: vs.id,
                  title: vs.title,
                  content: vs.content,
                  sourceUrl: vs.sourceUrl,
                })),
              }
            : null
        }
      />
    </div>
  );
}

