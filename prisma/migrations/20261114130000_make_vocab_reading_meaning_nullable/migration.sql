-- Frequency-list-only vocab rows (seed-data/frequency/) have no reading or
-- meaning available from the source data, so these columns must allow NULL.
-- A later enrichment step is expected to fill them in.
ALTER TABLE "vocab" ALTER COLUMN "reading" DROP NOT NULL;
ALTER TABLE "vocab" ALTER COLUMN "meaning" DROP NOT NULL;
