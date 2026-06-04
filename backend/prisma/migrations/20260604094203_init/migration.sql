-- CreateTable
CREATE TABLE "Book" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'хочу прочитать',

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);
