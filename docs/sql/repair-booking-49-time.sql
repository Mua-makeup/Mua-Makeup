-- Manual repair only: user confirmed creation at 09:58 Vietnam, 29 Oct 2026.
-- Back up these rows first. Default is a dry run (ROLLBACK).
-- After reviewing results, rerun with the final ROLLBACK changed to COMMIT.
-- Do not apply a blanket +7 hours to other bookings or scheduled times.
BEGIN;

SELECT id, booking_code, created_at, updated_at
FROM booking_schema.bookings WHERE id = 49 FOR UPDATE;
SELECT id, to_status, created_at
FROM booking_schema.booking_history WHERE booking_id = 49
ORDER BY created_at FOR UPDATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM booking_schema.bookings
        WHERE id = 49 AND booking_code = 'BK-SCHED-2717982'
          AND created_at = TIMESTAMPTZ '2026-10-28T19:58:38.019967Z'
    ) THEN
        RAISE EXCEPTION 'Booking 49 does not match the confirmed original timestamp; stopping';
    END IF;
    IF (SELECT count(*) FROM booking_schema.booking_history WHERE booking_id = 49) <> 9
       OR NOT EXISTS (
           SELECT 1 FROM booking_schema.booking_history WHERE booking_id = 49
             AND to_status = 'IN_PROGRESS'
             AND created_at = TIMESTAMPTZ '2026-10-28T20:00:12.258751Z'
       ) OR NOT EXISTS (
           SELECT 1 FROM booking_schema.booking_history WHERE booking_id = 49
             AND to_status = 'COMPLETED'
             AND created_at = TIMESTAMPTZ '2026-10-28T20:06:55.255333Z'
       ) OR EXISTS (
           SELECT 1 FROM booking_schema.booking_history WHERE booking_id = 49
             AND created_at NOT BETWEEN TIMESTAMPTZ '2026-10-28T19:58:38Z'
                                    AND TIMESTAMPTZ '2026-10-28T20:06:56Z'
       ) THEN
        RAISE EXCEPTION 'History differs from the observed nine events; inspect DB before repair';
    END IF;

    UPDATE booking_schema.bookings
    SET created_at = created_at + INTERVAL '7 hours', version = version + 1
    WHERE id = 49;
    -- updated_at is deliberately excluded: a later, correctly timed update may exist.
    UPDATE booking_schema.booking_history
    SET created_at = created_at + INTERVAL '7 hours' WHERE booking_id = 49;
END $$;

SELECT booking_code, created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS created_vietnam
FROM booking_schema.bookings WHERE id = 49;
SELECT to_status, created_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS event_vietnam
FROM booking_schema.booking_history WHERE booking_id = 49 ORDER BY created_at;

ROLLBACK;
