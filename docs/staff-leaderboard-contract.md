# Staff leaderboard

GET `/api/v1/agency/staff/leaderboard?period=ALL_TIME|THIS_MONTH|LAST_MONTH`

Existing authorization and response envelope are unchanged.

- `items` are quality ordered. `rank` is null below five reviews; eligible ranks use competition ranking (1, 1, 3).
- `rankingScore` is (raw average * count + studio average * 5) / (count + 5). Sort descending, then review count descending; staff ID only stabilizes exact ties.
- `averageRating`, `fiveStarRate`, and `rankingScore` are null with no reviews. No assumed five-star rating.
- `primaryJobs` and `assistantJobs` count distinct completed bookings by active assignment role; `completedJobs` counts distinct bookings.
- Approved, nondeleted reviews on completed/paid-out studio bookings credit each active assigned staff member once. Legacy bookings without any active assignments fall back to the review recipient. Existing reviews are included without copying or rewriting review records.
- Current review schema has one review per booking, treated here as a shared booking review, not an individual skill rating. Individual reviews would need an explicit scope and recipient model.
- Studio average counts original eligible reviews once, including reviews involving former staff; never averages staff averages.
- Review period uses submission timestamp; job period uses appointment date, consistent with existing filters.
- The contribution tab sorts completed jobs descending and shares ranks for equal positive counts. Zero jobs have no contribution rank.
- Assignment attribution uses current active assignments on completed bookings. Historical assignment snapshots are not available in this query; subsequent assignment corrections affect attribution.

Validation: service regression tests cover eligibility, ties, Bayesian scores, and nulls. `AgencyStaffLeaderboardQueryTest` (infrastructure tag) checks actual PostgreSQL SQL for assistant attribution, duplicate assignments, cancelled assignments, legacy fallback, deleted reviews, studio deduplication and period filtering. Run with `gradlew integrationTest --tests '*AgencyStaffLeaderboardQueryTest'` when Docker is available.
