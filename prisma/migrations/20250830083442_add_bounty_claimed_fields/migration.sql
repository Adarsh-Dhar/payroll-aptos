-- AlterTable
ALTER TABLE "public"."PullRequest" ADD COLUMN     "bountyClaimedAmount" DOUBLE PRECISION,
ADD COLUMN     "bountyClaimedBy" INTEGER;

-- CreateIndex
CREATE INDEX "PullRequest_bountyClaimed_idx" ON "public"."PullRequest"("bountyClaimed");
