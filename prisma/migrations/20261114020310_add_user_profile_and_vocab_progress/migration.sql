-- CreateEnum
CREATE TYPE "VocabProgressStatus" AS ENUM ('NEW', 'LEARNING', 'KNOWN');

-- CreateTable
CREATE TABLE "user_profile" (
    "id" SERIAL NOT NULL,
    "current_level_estimate" "JlptLevel",
    "goals" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vocab_progress" (
    "user_id" INTEGER NOT NULL,
    "vocab_id" INTEGER NOT NULL,
    "status" "VocabProgressStatus" NOT NULL DEFAULT 'NEW',
    "interval" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_result" INTEGER,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "user_vocab_progress_pkey" PRIMARY KEY ("user_id","vocab_id")
);

-- CreateIndex
CREATE INDEX "user_vocab_progress_next_review_at_idx" ON "user_vocab_progress"("next_review_at");

-- AddForeignKey
ALTER TABLE "user_vocab_progress" ADD CONSTRAINT "user_vocab_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vocab_progress" ADD CONSTRAINT "user_vocab_progress_vocab_id_fkey" FOREIGN KEY ("vocab_id") REFERENCES "vocab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
