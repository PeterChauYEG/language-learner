import 'dotenv/config';

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import type { RawKanjiEntry } from './seed/jlpt-parser.js';
import { parseJlptLevelFromFilename, parseKanjiJson, parseVocabCsv } from './seed/jlpt-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JLPT_SEED_DATA_DIR = join(__dirname, '..', 'seed-data', 'jlpt');

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

function listDataFiles(dir: string, extension: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(extension))
    .map((name) => join(dir, name));
}

async function seedVocab(): Promise<void> {
  const vocabDir = join(JLPT_SEED_DATA_DIR, 'vocab');
  const files = listDataFiles(vocabDir, '.csv');

  const rows = files.flatMap((file) =>
    parseVocabCsv(readFileSync(file, 'utf-8'), parseJlptLevelFromFilename(file)),
  );

  // This seed only ever writes rows that have a jlptLevel, so scoping the
  // wipe to jlptLevel != null is safe even if other (e.g. frequency-sourced)
  // vocab rows exist in the table without going through this script.
  await prisma.$transaction([
    prisma.vocab.deleteMany({ where: { jlptLevel: { not: null } } }),
    prisma.vocab.createMany({
      data: rows.map((row) => ({
        word: row.word,
        reading: row.reading,
        meaning: row.meaning,
        jlptLevel: row.jlptLevel,
        source: 'jlpt',
      })),
    }),
  ]);

  console.warn(`Seeded ${rows.length} vocab rows from ${files.length} JLPT file(s).`);
}

async function seedKanji(): Promise<void> {
  const kanjiDir = join(JLPT_SEED_DATA_DIR, 'kanji');
  const files = listDataFiles(kanjiDir, '.json');

  const rows = files.flatMap((file) => {
    const entries = JSON.parse(readFileSync(file, 'utf-8')) as RawKanjiEntry[];
    return parseKanjiJson(entries);
  });

  // Same reasoning as seedVocab: only JLPT-sourced kanji rows ever have a
  // jlptLevel set, so this doesn't touch rows seeded by other sources.
  await prisma.$transaction([
    prisma.kanji.deleteMany({ where: { jlptLevel: { not: null } } }),
    prisma.kanji.createMany({
      data: rows.map((row) => ({
        char: row.char,
        meaning: row.meaning,
        jlptLevel: row.jlptLevel,
        grade: row.grade,
        readingsOn: row.readingsOn,
        readingsKun: row.readingsKun,
      })),
    }),
  ]);

  console.warn(`Seeded ${rows.length} kanji rows from ${files.length} JLPT file(s).`);
}

/** Logs a few N5/N1 rows so a human can eyeball that levels resolved correctly. */
async function spotCheck(): Promise<void> {
  const [n5Vocab, n1Vocab, n5Kanji, n1Kanji] = await Promise.all([
    prisma.vocab.findMany({ where: { jlptLevel: 'N5' }, take: 3 }),
    prisma.vocab.findMany({ where: { jlptLevel: 'N1' }, take: 3 }),
    prisma.kanji.findMany({ where: { jlptLevel: 'N5' }, take: 3 }),
    prisma.kanji.findMany({ where: { jlptLevel: 'N1' }, take: 3 }),
  ]);

  console.warn(
    'Spot check - N5 vocab:',
    n5Vocab.map((v) => `${v.word} (${v.jlptLevel})`),
  );
  console.warn(
    'Spot check - N1 vocab:',
    n1Vocab.map((v) => `${v.word} (${v.jlptLevel})`),
  );
  console.warn(
    'Spot check - N5 kanji:',
    n5Kanji.map((k) => `${k.char} (${k.jlptLevel})`),
  );
  console.warn(
    'Spot check - N1 kanji:',
    n1Kanji.map((k) => `${k.char} (${k.jlptLevel})`),
  );
}

async function main(): Promise<void> {
  await seedVocab();
  await seedKanji();
  await spotCheck();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
