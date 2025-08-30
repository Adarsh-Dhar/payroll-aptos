/*
  Warnings:

  - Added the required column `highestBounty` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lowestBounty` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "highestBounty" DOUBLE PRECISION NOT NULL DEFAULT 1000,
ADD COLUMN     "lowestBounty" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- Update existing projects with default bounty values
UPDATE "public"."Project" SET "highestBounty" = 1000, "lowestBounty" = 100 WHERE "highestBounty" IS NULL OR "lowestBounty" IS NULL;

-- Remove default constraints after setting values
ALTER TABLE "public"."Project" ALTER COLUMN "highestBounty" DROP DEFAULT;
ALTER TABLE "public"."Project" ALTER COLUMN "lowestBounty" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."PullRequest" ADD COLUMN     "bountyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bountyClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bountyClaimedAt" TIMESTAMP(3);
