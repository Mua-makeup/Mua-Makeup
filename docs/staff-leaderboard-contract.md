# Staff leaderboard

GET `/api/v1/agency/staff/leaderboard?period=ALL_TIME|THIS_MONTH|LAST_MONTH`

Existing authorization and response envelope are unchanged.

- `items` are quality ordered. `rank` is null below five reviews; eligible ranks use competition ranking (1, 1, 3).
- `rankingScore` remains in the API for compatibility and equals the unrounded review average. Sort descending, then review count descending; staff ID only stabilizes exact ties. Studio average and completed jobs have no influence on quality ranking. The UI shows the average rating only, without a duplicate ranking-score column.
- `averageRating`, `fiveStarRate`, and `rankingScore` are null with no reviews. No assumed five-star rating.
- `primaryJobs` and `assistantJobs` count distinct completed bookings by active assignment role; `completedJobs` counts distinct bookings.
- Approved, nondeleted reviews on completed/paid-out studio bookings credit each active assigned staff member once. Legacy bookings without any active assignments fall back to the review recipient. Existing reviews are included without copying or rewriting review records.
- Current review schema has one review per booking, treated here as a shared booking review, not an individual skill rating. Individual reviews would need an explicit scope and recipient model.
- Studio average counts original eligible reviews once, including reviews involving former staff; never averages staff averages.
- Review period uses submission timestamp; job period uses appointment date, consistent with existing filters.
- The contribution tab sorts completed jobs descending and shares ranks for equal positive counts. Zero jobs have no contribution rank.
- Assignment attribution uses current active assignments on completed bookings. Historical assignment snapshots are not available in this query; subsequent assignment corrections affect attribution.

Validation: service regression tests cover eligibility, average-first ordering, review-count tie breaks, independence from Studio average, ties, and nulls. `AgencyStaffLeaderboardQueryTest` (infrastructure tag) checks actual PostgreSQL SQL for assistant attribution, duplicate assignments, cancelled assignments, legacy fallback, deleted reviews, studio deduplication and period filtering. Run with `gradlew integrationTest --tests '*AgencyStaffLeaderboardQueryTest'` when Docker is available.

## Automatic publication

Customer-owned COMPLETED and PAID_OUT bookings publish reviews as APPROVED immediately, including repeat customers/devices. Ownership, one review per booking, rating validation, submission/edit windows and deleted-review restrictions remain enforced. Editing a review updates the existing record and republishes legacy machine-held reviews; it does not increment the count.

ReviewSubmittedEvent aggregation now runs synchronously in the publishing transaction so profile totals read the saved review before the request succeeds. Leaderboard aggregation still reads the source review rows on refresh.

Migration V20261030110000 publishes nondeleted legacy PENDING_AUDIT/FLAGGED_FRAUD reviews attached to their actual customer's completed/paid-out booking, excluding records with an explicit admin note. It recalculates affected Studio totals/averages/Bayesian ratings and recipient MUA totals/rolling/Bayesian ratings. Flyway applies this on backend startup; it does not change review timestamps or create duplicate reviews.

Dispatch matrix ratings, review counts and completed-job totals reuse the all-time Studio leaderboard query, including assistant participation. They do not use personal MUA profile counters. No-review staff show an explicit no-reviews label, not a new-artist badge.
