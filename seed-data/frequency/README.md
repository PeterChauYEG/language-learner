# Frequency List Source Data

Raw word frequency data used as the seed source for the frequency-list feature.
This directory currently contains only the raw source file — no ingestion
logic yet (see LAB-5789).

## File

- `ja_10k.json` — top 10,000 most frequent Japanese words/tokens, ranked.

## Format

A JSON array of 10,000 objects, ordered by descending frequency (i.e. array
index + 1 == rank):

```json
{
  "rank": 5,
  "word": "あなた",
  "count": 61249
}
```

Other sample entries from the file: `何` (rank 3), `ありがとう` (rank 41),
`自分` (rank 33), `大丈夫` (rank 30), `必要` (rank 27).

- `rank` — 1-based rank, 1 = most frequent word.
- `word` — word/token as it appears in the source corpus.
- `count` — raw occurrence count from the source corpus (not normalized or
  deduplicated beyond what the source list already does).

## Provenance

Sourced from the [`hermitdave/FrequencyWords`](https://github.com/hermitdave/FrequencyWords)
project, specifically:

```
https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ja/ja_full.txt
```

Note: unlike most other languages in that project, Japanese does not have a
pre-cut `ja_50k.txt` top-N file — the `content/2018/ja/` directory only
contains `ja_full.txt` (the complete list, 34,504 entries) and
`ja_ignored.txt`. `ja_10k.json` here is the top 10,000 entries from
`ja_full.txt`.

That file is derived from the
[OpenSubtitles](https://opus.nlpl.eu/OpenSubtitles.php) 2018 subtitle corpus
(word counts aggregated across subtitle files). This repo's `ja_10k.json` is
the top 10,000 entries from that list, converted from the original
whitespace-separated `word count` text format into ranked JSON.

- **Original format**: plain text, one entry per line, `word count`
  separated by a single space, already sorted by descending count — same
  shape as the English list, so no special re-sorting was needed.
- **Segmentation note**: Japanese doesn't use spaces between words, but the
  source project pre-segments/tokenizes each line into a single token before
  counting, so parsing is identical to the English format (split on the
  last space). Two surprises worth flagging for anyone consuming this data:
  - Punctuation tokens (`、`, `。`, `「`, `」`, `（`, `）`) appear ranked
    alongside words (e.g. `、` is rank 1) — the source list does not filter
    them out.
  - Many common grammatical particles and auxiliary verbs (e.g. `の`, `を`,
    `は`, `する`) do **not** appear as standalone tokens anywhere in the
    full list. The tokenizer used to build the corpus appears to drop or
    fold these into adjacent tokens / lemmatize verbs down to a stem (e.g.
    `言` rather than `言う`/`言います`), rather than segmenting them the way
    a word-boundary-aware Japanese tokenizer normally would. Anything built
    on top of this list should treat it as a token-frequency list, not a
    complete dictionary-word-frequency list.
- **License**: `hermitdave/FrequencyWords` is released under the
  [MIT License](https://github.com/hermitdave/FrequencyWords/blob/master/LICENSE).
- **Retrieved**: 2026-11-14.

## Not yet included

- Ingestion/import logic (loading this file into the app's database or
  domain models) is out of scope for this ticket and will be handled
  separately.
