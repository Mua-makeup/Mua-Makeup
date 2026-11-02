-- Publish legacy machine-held reviews only for their actual customer's completed booking.
-- Deleted reviews and explicitly annotated moderation decisions are left untouched.
CREATE TEMP TABLE auto_published_review_targets ON COMMIT DROP AS
WITH promoted AS (
    UPDATE interaction_schema.reviews r
    SET status = 'APPROVED', fraud_risk_score = 0, fraud_reason = NULL,
        agency_id = COALESCE(r.agency_id, b.agency_id)
    FROM booking_schema.bookings b
    WHERE r.booking_id = b.id AND r.customer_id = b.customer_id
      AND b.status IN ('COMPLETED', 'PAID_OUT') AND r.is_deleted = false
      AND r.status IN ('PENDING_AUDIT', 'FLAGGED_FRAUD')
      AND NULLIF(TRIM(r.admin_note), '') IS NULL
    RETURNING r.mua_id, r.agency_id
) SELECT * FROM promoted;

WITH stats AS (
    SELECT r.agency_id, COUNT(*) AS total, AVG(r.rating) AS avg_rating
    FROM interaction_schema.reviews r
    WHERE r.status = 'APPROVED' AND r.is_deleted = false
      AND r.agency_id IN (SELECT agency_id FROM auto_published_review_targets)
    GROUP BY r.agency_id
), benchmark AS (
    SELECT COALESCE(AVG(rating), 4.65) AS c FROM interaction_schema.reviews
    WHERE status = 'APPROVED' AND is_deleted = false AND agency_id IS NOT NULL
)
UPDATE agency_schema.agency_profiles a
SET total_reviews = s.total, rating_avg = ROUND(s.avg_rating, 2),
    bayesian_rating = ROUND((s.total * s.avg_rating + 15 * benchmark.c) / (s.total + 15), 2)
FROM stats s CROSS JOIN benchmark WHERE a.id = s.agency_id;

WITH ranked AS (
    SELECT mua_id, rating, ROW_NUMBER() OVER (PARTITION BY mua_id ORDER BY created_at DESC, id DESC) AS n
    FROM interaction_schema.reviews
    WHERE status = 'APPROVED' AND is_deleted = false
      AND mua_id IN (SELECT mua_id FROM auto_published_review_targets)
), stats AS (
    SELECT mua_id, COUNT(*) AS total, AVG(rating) FILTER (WHERE n <= 100) AS rolling
    FROM ranked GROUP BY mua_id
), benchmark AS (
    SELECT COALESCE(AVG(rating), 4.60) AS c FROM interaction_schema.reviews
    WHERE status = 'APPROVED' AND is_deleted = false
)
UPDATE mua_schema.mua_profiles m
SET total_reviews = s.total, rating_avg = ROUND(s.rolling, 2), rolling_rating = ROUND(s.rolling, 2),
    bayesian_rating = ROUND((s.total * s.rolling + 10 * benchmark.c) / (s.total + 10), 2)
FROM stats s CROSS JOIN benchmark WHERE m.id = s.mua_id;
