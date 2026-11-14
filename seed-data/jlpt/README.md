# JLPT Seed Data

Raw, unprocessed JLPT vocabulary and kanji reference lists for levels N5 (easiest)
through N1 (hardest). These are source files only — no ingestion/parsing logic
lives here yet. They exist so downstream ETL/import code has a trustworthy,
versioned raw input to read from.

## Layout

```
seed-data/jlpt/
├── vocab/
│   ├── n5.csv ... n1.csv   # vocabulary lists, one row per word
│   └── LICENSE             # license for the vocab source repo
├── kanji/
│   ├── n5.json ... n1.json # kanji lists, one entry per character
│   └── LICENSE             # license for the kanji source repo
└── README.md               # this file
```

## Vocabulary lists (`vocab/n{1..5}.csv`)

**Source:** [elzup/jlpt-word-list](https://github.com/elzup/jlpt-word-list)
(commit at time of import: `master` branch, fetched 2026-11-14), which itself
traces back to the Anki decks at https://github.com/chyyran/jlpt-anki-decks,
originally sourced from tanos.co.uk's JLPT vocabulary lists.

**License:** MIT (see `vocab/LICENSE`). Copyright (c) 2020 Jamie Sinclair,
elzup.

**Format:** CSV with header row:

| column       | description                                            |
|---------------|---------------------------------------------------------|
| `expression`  | the word as written (kanji/kana)                        |
| `reading`     | kana reading of the word                                 |
| `meaning`     | English gloss(es), comma-separated within the field      |
| `tags`        | space-separated tags, including the JLPT level, e.g. `JLPT JLPT_5 JLPT_N5` |

One file per level: `n5.csv`, `n4.csv`, `n3.csv`, `n2.csv`, `n1.csv`.

## Kanji lists (`kanji/n{1..5}.json`)

**Source:** [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data)
(`kanji.json`, `master` branch, fetched 2026-11-14), which is itself compiled
from KANJIDIC2 and the official Jōyō kanji grade-level tables (MEXT).

**License:** MIT (see `kanji/LICENSE`). Copyright (c) 2019 David Gouveia.

**Format:** JSON array of objects, one per kanji, filtered from the upstream
dataset's `jlpt_new` field (the current, post-2010 JLPT level scheme) and
split into one file per level:

```json
{
  "kanji": "日",
  "jlpt_level": 5,
  "grade": 1,
  "strokes": 4,
  "freq": 1,
  "meanings": ["Day", "Sun", "Japan", "Counter For Days"],
  "readings_on": ["にち", "じつ"],
  "readings_kun": ["ひ", "-び", "-か"]
}
```

| field          | description                                                          |
|----------------|-----------------------------------------------------------------------|
| `kanji`        | the character itself                                                  |
| `jlpt_level`   | JLPT level this file groups by (5=N5 ... 1=N1), kept on each entry for convenience when files are merged |
| `grade`        | Japanese school grade the kanji is taught in (Jōyō grade 1-6, 8 for secondary, or absent for non-Jōyō kanji outside the school curriculum) |
| `strokes`      | stroke count                                                           |
| `freq`         | newspaper frequency rank (lower = more common); may be absent          |
| `meanings`     | English meanings                                                       |
| `readings_on`  | on'yomi (Chinese-derived) readings                                     |
| `readings_kun` | kun'yomi (native Japanese) readings                                    |

Entries are sorted by frequency rank (most common first) within each file.

## Notes / caveats

- These are *unofficial* community-compiled lists, not a verbatim release
  from the Japan Foundation (which does not publish an official exhaustive
  vocab/kanji list for every level). They are widely used across JLPT study
  tools and are considered reliable approximations of the real exam scope.
- No transformation beyond splitting-by-level and re-serializing to JSON was
  applied to the kanji data; the vocab CSVs are byte-for-byte as published
  upstream.
- Ingestion/parsing into the app's own schema is explicitly out of scope for
  this ticket (LAB-5788) and should be handled by follow-up work.
