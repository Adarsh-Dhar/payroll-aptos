/*
  Warnings:

  - A unique constraint covering the columns `[projectId,prNumber,developerId]` on the table `PullRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."PullRequest_projectId_prNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_projectId_prNumber_developerId_key" ON "public"."PullRequest"("projectId", "prNumber", "developerId");
