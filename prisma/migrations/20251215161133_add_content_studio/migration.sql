-- CreateEnum
CREATE TYPE "ContentDraftType" AS ENUM ('NEWSLETTER', 'BLOGPOST');

-- CreateEnum
CREATE TYPE "ContentDraftStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('RUNNING', 'SUSPENDED', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowEventType" AS ENUM ('LOG', 'STEP_START', 'STEP_END', 'ERROR');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "dailyNewsletterEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyNewsletterItemLimit" INTEGER DEFAULT 10;

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "styleGuide" TEXT NOT NULL,
    "doList" JSONB NOT NULL,
    "dontList" JSONB NOT NULL,
    "bannedPhrases" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceSample" (
    "id" TEXT NOT NULL,
    "voiceProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "type" "ContentDraftType" NOT NULL,
    "status" "ContentDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "contentJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftItem" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "DraftItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "draftId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "workflowName" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'RUNNING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "snapshotRef" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "type" "WorkflowEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceProfile_projectId_key" ON "VoiceProfile"("projectId");

-- CreateIndex
CREATE INDEX "VoiceProfile_projectId_idx" ON "VoiceProfile"("projectId");

-- CreateIndex
CREATE INDEX "VoiceSample_voiceProfileId_idx" ON "VoiceSample"("voiceProfileId");

-- CreateIndex
CREATE INDEX "ContentDraft_projectId_idx" ON "ContentDraft"("projectId");

-- CreateIndex
CREATE INDEX "ContentDraft_createdByUserId_idx" ON "ContentDraft"("createdByUserId");

-- CreateIndex
CREATE INDEX "ContentDraft_status_idx" ON "ContentDraft"("status");

-- CreateIndex
CREATE INDEX "ContentDraft_type_idx" ON "ContentDraft"("type");

-- CreateIndex
CREATE INDEX "ContentDraft_createdAt_idx" ON "ContentDraft"("createdAt");

-- CreateIndex
CREATE INDEX "DraftItem_draftId_idx" ON "DraftItem"("draftId");

-- CreateIndex
CREATE INDEX "DraftItem_itemId_idx" ON "DraftItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftItem_draftId_itemId_key" ON "DraftItem"("draftId", "itemId");

-- CreateIndex
CREATE INDEX "WorkflowRun_projectId_idx" ON "WorkflowRun"("projectId");

-- CreateIndex
CREATE INDEX "WorkflowRun_draftId_idx" ON "WorkflowRun"("draftId");

-- CreateIndex
CREATE INDEX "WorkflowRun_createdByUserId_idx" ON "WorkflowRun"("createdByUserId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowName_idx" ON "WorkflowRun"("workflowName");

-- CreateIndex
CREATE INDEX "WorkflowRun_startedAt_idx" ON "WorkflowRun"("startedAt");

-- CreateIndex
CREATE INDEX "WorkflowEvent_workflowRunId_idx" ON "WorkflowEvent"("workflowRunId");

-- CreateIndex
CREATE INDEX "WorkflowEvent_type_idx" ON "WorkflowEvent"("type");

-- CreateIndex
CREATE INDEX "WorkflowEvent_createdAt_idx" ON "WorkflowEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "VoiceProfile" ADD CONSTRAINT "VoiceProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSample" ADD CONSTRAINT "VoiceSample_voiceProfileId_fkey" FOREIGN KEY ("voiceProfileId") REFERENCES "VoiceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftItem" ADD CONSTRAINT "DraftItem_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftItem" ADD CONSTRAINT "DraftItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
