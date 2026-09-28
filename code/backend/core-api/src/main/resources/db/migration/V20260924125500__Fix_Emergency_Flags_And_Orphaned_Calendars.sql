-- ==============================================================================
-- Migration: V20260924125500__Fix_Emergency_Flags_And_Orphaned_Calendars.sql
-- Description: Clean up stale emergency flags on cancelled/completed bookings
--              and purge orphaned calendar locks for cancelled bookings and
--              staff who reported emergency unavailable.
-- ==============================================================================

-- 1. Reset emergency reassignment flags on terminated bookings
UPDATE booking_schema.bookings
SET needs_emergency_reassignment = FALSE,
    emergency_reason = NULL
WHERE status IN ('CANCELLED', 'CANCELLED_EXPIRED', 'COMPLETED', 'REFUNDED')
  AND (needs_emergency_reassignment = TRUE OR emergency_reason IS NOT NULL);

-- 2. Release calendar slots for cancelled bookings
DELETE FROM mua_schema.mua_calendars c
WHERE c.booking_id IN (
    SELECT b.id FROM booking_schema.bookings b
    WHERE b.status IN ('CANCELLED', 'CANCELLED_EXPIRED', 'REFUNDED')
);

-- 3. Release calendar slots held by staff who reported EMERGENCY_CANCELLED
DELETE FROM mua_schema.mua_calendars c
WHERE EXISTS (
    SELECT 1 
    FROM booking_schema.booking_staff_assignments bsa
    JOIN agency_schema.agency_staff s ON bsa.staff_id = s.id
    WHERE bsa.booking_id = c.booking_id
      AND s.mua_id = c.mua_id
      AND bsa.status = 'EMERGENCY_CANCELLED'
);

-- 4. Strip bracketed tier prefixes from active emergency reasons
UPDATE booking_schema.bookings
SET emergency_reason = REGEXP_REPLACE(emergency_reason, '^\[[^\]]*\]\s*', '')
WHERE emergency_reason ~ '^\[[^\]]*\]';

