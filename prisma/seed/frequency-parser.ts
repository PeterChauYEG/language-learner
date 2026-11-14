/** Raw shape of one entry in seed-data/frequency/ja_10k.json. */
export interface RawFrequencyEntry {
  rank: number;
  word: string;
  count: number;
}

export interface ParsedFrequencyRow {
  word: string;
  frequencyRank: number;
}

/**
 * The source list (hermitdave/FrequencyWords, OpenSubtitles corpus) includes
 * punctuation tokens ranked as "words" (e.g. "、" "。" "）" "（" "」"). Matches
 * any entry made up entirely of characters that aren't a letter or digit in
 * any script, so real Japanese tokens (kanji/kana/romaji/numerals) survive.
 */
const PUNCTUATION_ONLY_PATTERN = /^[^\p{L}\p{N}]+$/u;

/** Drops punctuation-only tokens and anything blank. */
function isUsefulEntry(entry: RawFrequencyEntry): boolean {
  const word = entry.word.trim();
  return word.length > 0 && !PUNCTUATION_ONLY_PATTERN.test(word);
}

/**
 * Filters out punctuation/non-word tokens, then takes the top `limit` most
 * frequent (lowest-rank) entries. The source is already rank-ordered, so
 * taking the first `limit` entries after filtering preserves that ordering.
 */
export function parseFrequencyJson(
  entries: RawFrequencyEntry[],
  limit: number,
): ParsedFrequencyRow[] {
  return entries
    .filter(isUsefulEntry)
    .slice(0, limit)
    .map((entry) => ({ word: entry.word, frequencyRank: entry.rank }));
}
