import 'dotenv/config';

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import type { RawFrequencyEntry } from './seed/frequency-parser.js';
import { parseFrequencyJson } from './seed/frequency-parser.js';
import type { RawKanjiEntry } from './seed/jlpt-parser.js';
import { parseJlptLevelFromFilename, parseKanjiJson, parseVocabCsv } from './seed/jlpt-parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JLPT_SEED_DATA_DIR = join(__dirname, '..', 'seed-data', 'jlpt');
const FREQUENCY_SEED_DATA_FILE = join(__dirname, '..', 'seed-data', 'frequency', 'ja_10k.json');
const FREQUENCY_SOURCE = 'frequency';
// Only the most useful N entries are merged - the full list's tail is mostly
// rare/noisy tokenizer artifacts, not real vocabulary worth surfacing.
const FREQUENCY_SEED_LIMIT = 5000;

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

/**
 * Merges seed-data/frequency/ja_10k.json onto vocab, matching on `word`:
 * existing rows get `frequencyRank` set, and frequency-only words (not
 * already present from any JLPT list) are inserted with `jlptLevel: null`
 * and no reading/meaning (not derivable from a frequency list alone - a
 * later enrichment step fills those in).
 */
async function seedFrequencyRanks(): Promise<void> {
  const entries = JSON.parse(
    readFileSync(FREQUENCY_SEED_DATA_FILE, 'utf-8'),
  ) as RawFrequencyEntry[];
  const rows = parseFrequencyJson(entries, FREQUENCY_SEED_LIMIT);

  // Idempotent like the other seed steps: frequency-only rows this function
  // previously inserted are wiped, and any frequencyRank it previously set
  // is cleared, before being recomputed from the current source list - so
  // re-running reflects that list exactly instead of layering stale data.
  await prisma.$transaction([
    prisma.vocab.deleteMany({ where: { source: FREQUENCY_SOURCE } }),
    prisma.vocab.updateMany({
      where: { frequencyRank: { not: null } },
      data: { frequencyRank: null },
    }),
  ]);

  const existing = await prisma.vocab.findMany({
    where: { word: { in: rows.map((row) => row.word) } },
    select: { word: true },
  });
  const existingWords = new Set(existing.map((v) => v.word));

  const updates = rows
    .filter((row) => existingWords.has(row.word))
    .map((row) =>
      prisma.vocab.updateMany({
        where: { word: row.word },
        data: { frequencyRank: row.frequencyRank },
      }),
    );
  const newRows = rows.filter((row) => !existingWords.has(row.word));

  await prisma.$transaction([
    ...updates,
    prisma.vocab.createMany({
      data: newRows.map((row) => ({
        word: row.word,
        reading: null,
        meaning: null,
        jlptLevel: null,
        frequencyRank: row.frequencyRank,
        source: FREQUENCY_SOURCE,
      })),
    }),
  ]);

  console.warn(
    `Seeded frequency ranks: ${updates.length} existing vocab row(s) updated, ${newRows.length} new frequency-only row(s) inserted.`,
  );
}

/** Logs a few N5/N1 rows so a human can eyeball that levels resolved correctly. */
async function spotCheck(): Promise<void> {
  const [n5Vocab, n1Vocab, n5Kanji, n1Kanji, jlptAndFrequency, frequencyOnly] = await Promise.all([
    prisma.vocab.findMany({ where: { jlptLevel: 'N5' }, take: 3 }),
    prisma.vocab.findMany({ where: { jlptLevel: 'N1' }, take: 3 }),
    prisma.kanji.findMany({ where: { jlptLevel: 'N5' }, take: 3 }),
    prisma.kanji.findMany({ where: { jlptLevel: 'N1' }, take: 3 }),
    // Words that have both tags set confirms the frequency merge matched
    // onto existing JLPT rows instead of creating duplicates.
    prisma.vocab.findMany({
      where: { jlptLevel: { not: null }, frequencyRank: { not: null } },
      take: 5,
    }),
    prisma.vocab.findMany({ where: { source: FREQUENCY_SOURCE }, take: 3 }),
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
  console.warn(
    'Spot check - vocab with both JLPT level and frequency rank:',
    jlptAndFrequency.map((v) => `${v.word} (${v.jlptLevel}, rank ${v.frequencyRank})`),
  );
  console.warn(
    'Spot check - frequency-only vocab (no JLPT level):',
    frequencyOnly.map((v) => `${v.word} (rank ${v.frequencyRank}, jlptLevel ${v.jlptLevel})`),
  );
}

async function main(): Promise<void> {
  await seedVocab();
  await seedKanji();
  await seedFrequencyRanks();
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
