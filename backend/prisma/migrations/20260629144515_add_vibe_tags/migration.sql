-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "vibeTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
