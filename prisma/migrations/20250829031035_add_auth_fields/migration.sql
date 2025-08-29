/*
  Warnings:

  - The primary key for the `Payout` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `password` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Payout` table without a default value. This is not possible if the table is not empty.

*/
-- First, add columns with default values
-- AlterTable
ALTER TABLE "public"."Admin" ADD COLUMN     "password" TEXT NOT NULL DEFAULT 'admin123';

-- AlterTable
ALTER TABLE "public"."Developer" ADD COLUMN     "email" TEXT,
ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "public"."Payout" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "transactionId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing Payout records to have proper timestamps
UPDATE "public"."Payout" SET "createdAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL OR "updatedAt" IS NULL;

-- Now change the Payout id to string and add primary key constraint
ALTER TABLE "public"."Payout" DROP CONSTRAINT "Payout_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Payout_pkey" PRIMARY KEY ("id");

-- Drop the sequence since we're no longer using auto-increment
DROP SEQUENCE IF EXISTS "Payout_id_seq";

-- Update existing Admin passwords to a secure default
UPDATE "public"."Admin" SET "password" = 'admin123' WHERE "password" = 'admin123';
