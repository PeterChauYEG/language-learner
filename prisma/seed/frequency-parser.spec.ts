import { describe, expect, it } from 'vitest';

import { parseFrequencyJson, type RawFrequencyEntry } from './frequency-parser.js';

describe('parseFrequencyJson', () => {
  it('drops punctuation-only tokens', () => {
    const entries: RawFrequencyEntry[] = [
      { rank: 1, word: '、', count: 100 },
      { rank: 2, word: '。', count: 90 },
      { rank: 3, word: '）', count: 80 },
      { rank: 4, word: '何', count: 70 },
    ];

    expect(parseFrequencyJson(entries, 10)).toEqual([{ word: '何', frequencyRank: 4 }]);
  });

  it('keeps real words, including single-character kana/kanji', () => {
    const entries: RawFrequencyEntry[] = [
      { rank: 1, word: 'あなた', count: 100 },
      { rank: 2, word: '気', count: 90 },
    ];

    expect(parseFrequencyJson(entries, 10)).toEqual([
      { word: 'あなた', frequencyRank: 1 },
      { word: '気', frequencyRank: 2 },
    ]);
  });

  it('drops blank entries', () => {
    const entries: RawFrequencyEntry[] = [{ rank: 1, word: '   ', count: 100 }];

    expect(parseFrequencyJson(entries, 10)).toEqual([]);
  });

  it('limits to the top N entries after filtering, preserving rank order', () => {
    const entries: RawFrequencyEntry[] = [
      { rank: 1, word: '、', count: 100 },
      { rank: 2, word: '何', count: 90 },
      { rank: 3, word: 'あなた', count: 80 },
      { rank: 4, word: '言', count: 70 },
    ];

    expect(parseFrequencyJson(entries, 2)).toEqual([
      { word: '何', frequencyRank: 2 },
      { word: 'あなた', frequencyRank: 3 },
    ]);
  });
});
