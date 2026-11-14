import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  mapKanjiJlptLevel,
  parseCsvLine,
  parseJlptLevelFromFilename,
  parseJlptLevelFromTags,
  parseKanjiJson,
  parseVocabCsv,
  type RawKanjiEntry,
} from './jlpt-parser.js';

const SEED_DATA_DIR = join(import.meta.dirname, '..', '..', 'seed-data', 'jlpt');

describe('parseJlptLevelFromTags', () => {
  it('extracts the current-scheme JLPT_N tag', () => {
    expect(parseJlptLevelFromTags('JLPT JLPT_4 JLPT_5 JLPT_N5')).toBe('N5');
  });

  it('returns null when no JLPT_N tag is present', () => {
    expect(parseJlptLevelFromTags('Genki Genki_Ln.9')).toBeNull();
  });
});

describe('mapKanjiJlptLevel', () => {
  it('maps the source 1-5 scale onto the N1-N5 enum', () => {
    expect(mapKanjiJlptLevel(5)).toBe('N5');
    expect(mapKanjiJlptLevel(1)).toBe('N1');
  });

  it('throws on an out-of-range level', () => {
    expect(() => mapKanjiJlptLevel(6)).toThrow();
  });
});

describe('parseCsvLine', () => {
  it('splits plain comma-separated fields', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps commas inside quoted fields intact', () => {
    expect(parseCsvLine('ああ,ああ,"Ah!, Oh!",JLPT JLPT_N5')).toEqual([
      'ああ',
      'ああ',
      'Ah!, Oh!',
      'JLPT JLPT_N5',
    ]);
  });
});

describe('parseVocabCsv', () => {
  it('parses rows, preferring the tag-derived level over the fallback', () => {
    const csv = [
      'expression,reading,meaning,tags',
      'ああ,ああ,"Ah!, Oh!",JLPT JLPT_4 JLPT_5 JLPT_N5',
      '赤い,あかい,red,Genki Genki_Ln.9 JLPT JLPT_5 JLPT_N5',
      'no-jlpt-n-tag,no-jlpt-n-tag,falls back to file level,Genki',
    ].join('\n');

    const rows = parseVocabCsv(csv, 'N4');

    expect(rows).toEqual([
      { word: 'ああ', reading: 'ああ', meaning: 'Ah!, Oh!', jlptLevel: 'N5' },
      { word: '赤い', reading: 'あかい', meaning: 'red', jlptLevel: 'N5' },
      {
        word: 'no-jlpt-n-tag',
        reading: 'no-jlpt-n-tag',
        meaning: 'falls back to file level',
        jlptLevel: 'N4',
      },
    ]);
  });

  describe('against the committed seed-data files', () => {
    it('resolves a sample of real N5 words to N5', () => {
      const rows = parseVocabCsv(
        readFileSync(join(SEED_DATA_DIR, 'vocab', 'n5.csv'), 'utf-8'),
        'N5',
      );
      const byWord = new Map(rows.map((row) => [row.word, row]));

      expect(byWord.get('青')).toMatchObject({ reading: 'あお', jlptLevel: 'N5' });
      expect(byWord.get('会う')).toMatchObject({ jlptLevel: 'N5' });
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.jlptLevel === 'N5')).toBe(true);
    });

    it('resolves a sample of real N1 words to N1 (using the filename fallback, since this source file only tags levels N4/N5 unambiguously)', () => {
      const rows = parseVocabCsv(
        readFileSync(join(SEED_DATA_DIR, 'vocab', 'n1.csv'), 'utf-8'),
        'N1',
      );

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.jlptLevel === 'N1')).toBe(true);
    });
  });
});

describe('parseJlptLevelFromFilename', () => {
  it('derives the level from n{1-5}.csv / n{1-5}.json style filenames', () => {
    expect(parseJlptLevelFromFilename('seed-data/jlpt/vocab/n5.csv')).toBe('N5');
    expect(parseJlptLevelFromFilename('seed-data/jlpt/kanji/n1.json')).toBe('N1');
  });

  it('throws when no level can be determined', () => {
    expect(() => parseJlptLevelFromFilename('vocab.csv')).toThrow();
  });
});

describe('parseKanjiJson', () => {
  it('normalizes raw entries, mapping jlpt_level and defaulting missing grade to null', () => {
    const entries: RawKanjiEntry[] = [
      {
        kanji: '日',
        jlpt_level: 5,
        grade: 1,
        meanings: ['Day', 'Sun'],
        readings_on: ['にち', 'じつ'],
        readings_kun: ['ひ'],
      },
      {
        kanji: '鬱',
        jlpt_level: 1,
        meanings: ['Depression'],
        readings_on: ['うつ'],
        readings_kun: [],
      },
    ];

    expect(parseKanjiJson(entries)).toEqual([
      {
        char: '日',
        meaning: 'Day, Sun',
        jlptLevel: 'N5',
        grade: 1,
        readingsOn: ['にち', 'じつ'],
        readingsKun: ['ひ'],
      },
      {
        char: '鬱',
        meaning: 'Depression',
        jlptLevel: 'N1',
        grade: null,
        readingsOn: ['うつ'],
        readingsKun: [],
      },
    ]);
  });

  describe('against the committed seed-data files', () => {
    it('resolves real N5 and N1 kanji to the right level', () => {
      const n5Entries = JSON.parse(
        readFileSync(join(SEED_DATA_DIR, 'kanji', 'n5.json'), 'utf-8'),
      ) as RawKanjiEntry[];
      const n1Entries = JSON.parse(
        readFileSync(join(SEED_DATA_DIR, 'kanji', 'n1.json'), 'utf-8'),
      ) as RawKanjiEntry[];

      const n5Rows = parseKanjiJson(n5Entries);
      const n1Rows = parseKanjiJson(n1Entries);

      expect(n5Rows.find((row) => row.char === '日')).toMatchObject({ jlptLevel: 'N5', grade: 1 });
      expect(n5Rows.every((row) => row.jlptLevel === 'N5')).toBe(true);
      expect(n1Rows.length).toBeGreaterThan(0);
      expect(n1Rows.every((row) => row.jlptLevel === 'N1')).toBe(true);
    });
  });
});
