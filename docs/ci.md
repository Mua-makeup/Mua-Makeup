# Continuous integration

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on every push,
pull request, and manual dispatch. It runs two independent checks:

- **Backend tests**: Java 17 and the checked-in Gradle Wrapper run every test in
  `code/backend/core-api` with `test --no-daemon --console=plain`. HTML and JUnit
  XML reports are uploaded as `backend-test-reports` even when tests fail, and
  retained for 14 days. The current tests use mocks and do not require database,
  Redis, or production credentials.
- **Frontend build**: Node.js 22 installs the locked dependencies with `npm ci`
  and runs `npm run build` in `code/frontend`.

Dependency caches speed up subsequent runs. A newer run on the same branch or
pull request cancels its previous run. A failed test or build fails its check.

Commit and push the workflow to run it on GitHub. To require both checks before
merging, configure a branch protection rule or ruleset requiring **Backend tests**
and **Frontend build** after their first run. The workflow does not configure
branch protection or deployment.

## Run locally

Backend (Java 17):

```powershell
cd code/backend/core-api
.\gradlew.bat test --no-daemon --console=plain
```

On Linux/macOS, use `bash ./gradlew test --no-daemon --console=plain`.

Frontend (Node.js 22):

```powershell
cd code/frontend
npm ci --no-audit --no-fund
npm run build
```
