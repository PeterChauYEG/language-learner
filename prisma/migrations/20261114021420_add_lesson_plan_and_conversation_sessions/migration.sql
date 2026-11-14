-- CreateTable
CREATE TABLE "lesson_plan" (
    "user_id" INTEGER NOT NULL,
    "active_situations" TEXT[],
    "focus_vocab_ids" INTEGER[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_plan_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "situation" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "words_introduced" INTEGER[],
    "words_reviewed" INTEGER[],

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lesson_plan" ADD CONSTRAINT "lesson_plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
