-- CreateEnum
CREATE TYPE "FeedType" AS ENUM ('NATIVE', 'CUSTOM');

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "cloudflareProtected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cloudflareWarningShown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customRSSConfig" JSONB,
ADD COLUMN     "detectionMetadata" JSONB,
ADD COLUMN     "feedType" "FeedType" NOT NULL DEFAULT 'NATIVE';

-- CreateIndex
CREATE INDEX "Source_feedType_idx" ON "Source"("feedType");
