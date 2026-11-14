-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "JlptLevel" AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');

-- CreateTable
CREATE TABLE "vocab" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "jlpt_level" "JlptLevel",
    "frequency_rank" INTEGER,
    "part_of_speech" TEXT,
    "source" TEXT,

    CONSTRAINT "vocab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanji" (
    "id" SERIAL NOT NULL,
    "char" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "jlpt_level" "JlptLevel",
    "grade" INTEGER,
    "readings_on" TEXT[],
    "readings_kun" TEXT[],

    CONSTRAINT "kanji_pkey" PRIMARY KEY ("id")
);

