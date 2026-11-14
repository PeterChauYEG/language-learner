# Frequency List Source Data

Raw word frequency data used as the seed source for the frequency-list feature.
This directory currently contains only the raw source file — no ingestion
logic yet (see LAB-5789).

## File

- `en_10k.json` — top 10,000 most frequent English words, ranked.

## Format

A JSON array of 10,000 objects, ordered by descending frequency (i.e. array
index + 1 == rank):

```json
{
  "rank": 1,
  "word": "you",
  "count": 28787591
}
```

- `rank` — 1-based rank, 1 = most frequent word.
- `word` — lowercase word/token as it appears in the source corpus.
- `count` — raw occurrence count from the source corpus (not normalized or
  deduplicated beyond what the source list already does).

## Provenance

Sourced from the [`hermitdave/FrequencyWords`](https://github.com/hermitdave/FrequencyWords)
project, specifically:

```
https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt
```

That file lists the top 50,000 English words by frequency, derived from the
[OpenSubtitles](https://opus.nlpl.eu/OpenSubtitles.php) 2018 subtitle corpus
(word counts aggregated across subtitle files). This repo's `en_10k.json` is
the top 10,000 entries from that list, converted from the original
whitespace-separated `word count` text format into ranked JSON.

- **Original format**: plain text, one entry per line, `word count`
  separated by a single space, already sorted by descending count.
- **License**: `hermitdave/FrequencyWords` is released under the
  [MIT License](https://github.com/hermitdave/FrequencyWords/blob/master/LICENSE).
- **Retrieved**: 2026-11-14.

## Not yet included

- Ingestion/import logic (loading this file into the app's database or
  domain models) is out of scope for this ticket and will be handled
  separately.
