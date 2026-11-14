import type { JlptLevel } from '../../generated/prisma/client.js';

export interface ParsedVocabRow {
  word: string;
  reading: string;
  meaning: string;
  jlptLevel: JlptLevel;
}

export interface ParsedKanjiRow {
  char: string;
  meaning: string;
  jlptLevel: JlptLevel;
  grade: number | null;
  readingsOn: string[];
  readingsKun: string[];
}

/** Raw shape of one entry in seed-data/jlpt/kanji/n{1..5}.json. */
export interface RawKanjiEntry {
  kanji: string;
  jlpt_level: number;
  grade?: number;
  meanings: string[];
  readings_on: string[];
  readings_kun: string[];
}

/** Maps the kanji source's 1-5 (N1 easiest..N5? no: 5=N5 easiest, 1=N1 hardest) scale to the enum. */
const KANJI_LEVEL_MAP: Record<number, JlptLevel> = {
  5: 'N5',
  4: 'N4',
  3: 'N3',
  2: 'N2',
  1: 'N1',
};

/** Derives the JlptLevel from a seed-data filename like "n5.csv" or "n1.json". */
export function parseJlptLevelFromFilename(filename: string): JlptLevel {
  const match = /\bn([1-5])\b/i.exec(filename);
  if (!match) {
    throw new Error(`Could not determine JLPT level from filename: ${filename}`);
  }
  return `N${match[1]}` as JlptLevel;
}

export function mapKanjiJlptLevel(level: number): JlptLevel {
  const mapped = KANJI_LEVEL_MAP[level];
  if (!mapped) {
    throw new Error(`Unknown kanji jlpt_level: ${level}`);
  }
  return mapped;
}

/**
 * Extracts the JLPT level from a vocab row's space-separated `tags` column,
 * e.g. "JLPT JLPT_4 JLPT_5 JLPT_N5" -> "N5". Tags may contain both the
 * legacy numeric tag (JLPT_5) and the current one (JLPT_N5) - only the
 * `JLPT_N{1-5}` form is unambiguous, so that's what we parse.
 */
export function parseJlptLevelFromTags(tags: string): JlptLevel | null {
  const match = /\bJLPT_N([1-5])\b/.exec(tags);
  if (!match) {
    return null;
  }
  return `N${match[1]}` as JlptLevel;
}

/**
 * Minimal CSV line parser supporting double-quoted fields that may contain
 * commas (e.g. `"Ah!, Oh!"`) and escaped quotes (`""`). Sufficient for the
 * jlpt-word-list source files, which don't contain embedded newlines within
 * a field.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Parses a full vocab CSV file (header row: expression,reading,meaning,tags)
 * into rows with a resolved JlptLevel.
 *
 * The `tags` column is the primary source for the level (parsed via
 * `parseJlptLevelFromTags`), but the upstream source only tags every row
 * with the unambiguous `JLPT_N{1-5}` form in the n4/n5 files - the n1-n3
 * files only carry legacy numeric tags (e.g. `JLPT_1 JLPT_2 JLPT_3`) that
 * can appear multiple times per row and aren't a reliable per-row level
 * signal. Since each source file is itself already split by level (see
 * seed-data/jlpt/README.md), `fallbackLevel` (derived from the filename)
 * is used whenever the tags don't resolve to a level.
 */
export function parseVocabCsv(content: string, fallbackLevel: JlptLevel): ParsedVocabRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.length > 0);
  const [header, ...rows] = lines;
  if (!header) {
    return [];
  }

  const columns = parseCsvLine(header);
  const expressionIdx = columns.indexOf('expression');
  const readingIdx = columns.indexOf('reading');
  const meaningIdx = columns.indexOf('meaning');
  const tagsIdx = columns.indexOf('tags');

  const result: ParsedVocabRow[] = [];
  for (const line of rows) {
    const fields = parseCsvLine(line);
    const expression = fields[expressionIdx];
    const reading = fields[readingIdx];
    const meaning = fields[meaningIdx];
    const tags = fields[tagsIdx];
    if (!expression || !reading || !meaning || !tags) {
      continue;
    }

    const jlptLevel = parseJlptLevelFromTags(tags) ?? fallbackLevel;

    result.push({ word: expression, reading, meaning, jlptLevel });
  }

  return result;
}

/** Parses a full kanji JSON file (array of RawKanjiEntry) into normalized rows. */
export function parseKanjiJson(entries: RawKanjiEntry[]): ParsedKanjiRow[] {
  return entries.map((entry) => ({
    char: entry.kanji,
    meaning: entry.meanings.join(', '),
    jlptLevel: mapKanjiJlptLevel(entry.jlpt_level),
    grade: entry.grade ?? null,
    readingsOn: entry.readings_on,
    readingsKun: entry.readings_kun,
  }));
}
