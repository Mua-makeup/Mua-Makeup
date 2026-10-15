-- Migration: Add total_reviews and bayesian_rating to agency_schema.agency_profiles
ALTER TABLE agency_schema.agency_profiles
    ADD COLUMN IF NOT EXISTS total_reviews INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bayesian_rating NUMERIC(3, 2);

-- Remove fake 5.0 default for rating_avg
ALTER TABLE agency_schema.agency_profiles ALTER COLUMN rating_avg DROP DEFAULT;

-- Backfill review stats for agencies with existing reviews
UPDATE agency_schema.agency_profiles ap
SET total_reviews = sub.cnt,
    rating_avg = sub.avg_rating
FROM (
    SELECT agency_id, COUNT(id) AS cnt, ROUND(AVG(rating), 2) AS avg_rating
    FROM interaction_schema.reviews
    WHERE status = 'APPROVED' AND is_deleted = false AND agency_id IS NOT NULL
    GROUP BY agency_id
) sub
WHERE ap.id = sub.agency_id;

-- Reset rating_avg to NULL for agencies with 0 reviews
UPDATE agency_schema.agency_profiles
SET rating_avg = NULL, bayesian_rating = NULL
WHERE total_reviews = 0;
