# Booking execution timestamps

The booking status detail response shared by instant/scheduled and freelance/studio bookings now includes:

- `startedAt`: ISO-8601 offset timestamp for the first `IN_PROGRESS` history event, or null.
- `completedAt`: ISO-8601 offset timestamp for the first `COMPLETED` history event, or null. Previously this was an offset-free local date-time and could fall back to `updatedAt`/`createdAt`.
- `bookingDate` and `startTime`: unchanged appointment fields, not actual execution timestamps.

Both actual timestamps are read from PostgreSQL `booking_history.created_at` (TIMESTAMPTZ) as epoch milliseconds and serialized with the Vietnam offset. This avoids interpretation through the legacy LocalDateTime entity mapping or the JVM/session default timezone. No migration or historical timestamp rewriting is required.

Example: `startedAt: "2026-10-26T20:21:00+07:00"`, `completedAt: "2026-10-26T20:22:00+07:00"` renders `20:21 - 20:22` in Vietnam time on every device.

History events remain available after payment, cancellation or dispute transitions. Missing execution events stay null; creation, payment and last-update times are never substituted. The mobile history screen and scheduled-booking header share one formatter. Cross-day ranges include dates; upcoming appointments are explicitly labeled as estimated.

Deploy backend and app together for the new timestamp contract. Existing offset-free completion payloads cannot establish the original instant reliably; the corrected backend response is required. This change corrects representation of recorded instants, not any historically incorrect database values.
