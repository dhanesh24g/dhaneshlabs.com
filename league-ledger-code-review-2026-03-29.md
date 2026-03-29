# League Ledger Code Review

Date: 2026-03-29

Repo reviewed: `/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger`

Review lens: senior architect perspective across security, backend logic, data integrity, frontend architecture, UI/UX quality, refresh/tab-close behavior, and operational risk.

## Executive Summary

The repo is a workable prototype, but it is not production-ready yet.

The biggest concerns are:

1. A confirmed path traversal vulnerability in static file serving.
2. Weak default authentication posture with default credentials and a default token secret.
3. XSS risk due to `innerHTML` rendering combined with tokens stored in `localStorage`.
4. A flawed financial/data model that does not store actual match participation.
5. Historical match outcomes can change when league defaults change.

From a product and UX perspective, the app looks visually ambitious, but the information architecture and state handling are still prototype-grade. Refreshes, tab closes, and deep links are not handled in an industry-standard way.

## Findings

### Critical

#### 1. Path traversal in static file serving

Severity: Critical

The custom static route joins `STATIC_DIR / file_path` and serves the file if it exists, but it does not normalize the path and verify that the final resolved file remains inside `static/`.

This allows requests like:

- `GET /static/%2e%2e/server/auth.py`

I verified this returns backend source code successfully.

Impact:

- Arbitrary repo files can be exposed.
- Sensitive source, secrets logic, or deployment internals can be downloaded.
- This materially weakens the entire app’s security model.

References:

- [server/main.py#L76](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/main.py#L76)
- [server/main.py#L79](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/main.py#L79)

#### 2. Authentication is insecure by default

Severity: Critical

The app ships with:

- A default signing secret
- Default admin/viewer usernames and passwords
- A public auth config endpoint that exposes available usernames and roles
- A login page that displays those accounts

If environment variables are missed or misconfigured in deployment, the app is effectively open to trivial compromise. Even worse, a known default token secret enables token forgery.

Impact:

- Easy unauthorized access
- Easy admin takeover
- Predictable token signing

References:

- [server/auth.py#L17](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/auth.py#L17)
- [server/auth.py#L25](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/auth.py#L25)
- [server/auth.py#L36](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/auth.py#L36)
- [server/api.py#L69](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/api.py#L69)
- [static/login.js#L24](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/login.js#L24)
- [static/login.js#L46](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/login.js#L46)

### High

#### 3. Stored XSS risk with token theft potential

Severity: High

The frontend interpolates server-originated values into `innerHTML` in several places, while auth tokens are stored in `localStorage`. If malicious content is ever persisted in player names, match titles, or related text, it can execute in the browser and exfiltrate auth state.

Impact:

- Stored XSS
- Session/token theft
- Admin compromise if an admin views poisoned content

References:

- [static/app.js#L39](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L39)
- [static/app.js#L396](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L396)
- [static/app.js#L805](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L805)
- [static/stats.js#L109](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/stats.js#L109)
- [static/stats.js#L130](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/stats.js#L130)

#### 4. Financial model is not trustworthy because match participation is not stored

Severity: High

The app never records which players actually participated in a specific match.

Instead:

- Ledger charges every current player for every completed/canceled match
- Cancel/refund logic refunds all current players
- `active_player_count` exists in setup but is not used as a reliable source of truth

This means financial results become wrong as soon as roster participation varies over time.

Impact:

- Incorrect settlement values
- Wrong refund distribution
- Loss of trust in the app’s core purpose

References:

- [static/index.html#L90](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/index.html#L90)
- [server/service.py#L224](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L224)
- [server/service.py#L232](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L232)
- [server/service.py#L258](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L258)

#### 5. Historical matches are not immutable

Severity: High

If a match does not carry explicit override values, winner count and payouts are resolved from the current league defaults when later viewed or saved. That means changing league settings can silently alter the interpretation of older matches.

Impact:

- Historical records are not auditable
- Old match outcomes can change after config edits
- Users can lose trust in settlement history

References:

- [server/service.py#L177](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L177)
- [server/service.py#L178](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L178)
- [static/app.js#L393](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L393)
- [static/app.js#L401](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L401)

#### 6. Player deletion can corrupt history

Severity: High

Players are hard-deleted. SQLite foreign keys are declared but not enforced by default here, and stats reporting joins historical winner entries back to the current `players` table.

This means deleting players can orphan historical finance/winner data or hide it from reporting entirely.

I also verified local SQLite has `PRAGMA foreign_keys = 0`.

Impact:

- Historical data corruption
- Missing winners in stats
- Broken financial traceability

References:

- [server/database.py#L141](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/database.py#L141)
- [server/database.py#L154](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/database.py#L154)
- [server/service.py#L130](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L130)
- [server/service.py#L300](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L300)

### Medium

#### 7. Payout invariants are not enforced server-side

Severity: Medium

League-level default payouts are validated in the UI against the prize pool, but the backend does not enforce these invariants robustly, and match-level overrides are not validated against the prize pool in the UI flow either.

Impact:

- Invalid payout structures can be persisted
- API clients can bypass UI rules
- Ledger correctness depends too much on a single frontend

References:

- [static/app.js#L151](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L151)
- [static/app.js#L980](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L980)
- [server/service.py#L142](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L142)
- [server/service.py#L166](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L166)

#### 8. Supabase write flows are not atomic

Severity: Medium

In Supabase mode, winner replacement and cancellation flows delete old rows and then insert new rows one by one without transaction protection.

Impact:

- Partial writes on failure
- Inconsistent winner state
- Harder incident recovery

References:

- [server/supabase_service.py#L186](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/supabase_service.py#L186)
- [server/supabase_service.py#L235](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/supabase_service.py#L235)

#### 9. Money should not use floating point

Severity: Medium

Currency is modeled with `float`/`REAL`, and payout splits are rounded ad hoc.

Impact:

- Rounding drift
- Hard-to-reconcile totals over time
- Unnecessary finance bugs

Recommendation:

- Store integer cents or use fixed-precision decimals end to end.

References:

- [server/database.py#L104](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/database.py#L104)
- [server/database.py#L140](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/database.py#L140)
- [server/service.py#L200](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L200)
- [server/service.py#L267](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/server/service.py#L267)

#### 10. Winners-to-ledger flow has UI state bugs

Severity: Medium

Two UX/state issues stand out:

- The next button is hidden on ledger and not reliably restored on return navigation.
- The winners “Continue” path saves and navigates, but does not refresh ledger before showing the ledger screen.

Impact:

- Stale ledger UI
- Confusing navigation state
- Lower confidence in whether data actually saved

References:

- [static/app.js#L190](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L190)
- [static/app.js#L210](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L210)
- [static/app.js#L833](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L833)
- [static/app.js#L861](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L861)

## UI/UX Review

### Overall UI quality

The styling is visually attractive for a prototype. The typography, glassmorphism treatment, step pills, and layout effort show product intent.

That said, this is not at industry-standard UX maturity yet.

Why:

- The application is built as one large page with hidden panels rather than route-based task screens.
- Different responsibilities are mixed into one controller and one route.
- The primary flows are not resilient to interruption.
- Error handling relies heavily on blocking browser dialogs.
- Accessibility is not where it needs to be.

### Page segregation / screen architecture

The pages are not well segregated from a product architecture perspective.

Current structure:

- Main ledger workflow is one document with section toggling
- Stats is a separate page
- Login is a separate page

Problems:

- No route per major task
- No deep-linking into current workflow step
- No refresh-safe step restoration
- Harder testing and future extension

References:

- [static/index.html#L67](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/index.html#L67)
- [static/app.js#L34](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L34)

### Refresh, tab closing, and abnormal session handling

This is one of the weaker product areas.

Observed behavior from the code:

- Refresh resets the interface to setup step
- Unsaved data entry is lost
- Winner assignment drafts are lost
- No draft persistence
- No `beforeunload` warning
- No session restore for current workflow context

This is not industry standard for a finance-adjacent workflow tool.

References:

- [static/app.js#L1051](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L1051)
- [static/app.js#L816](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L816)

### Accessibility and interaction quality

Notable concerns:

- Icon-only delete buttons do not have accessible labels
- `alert()` and `confirm()` are used instead of inline feedback or modals
- No strong progressive disclosure for validation and save states
- Stats presentation is functional but basic and text-heavy

References:

- [static/app.js#L73](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L73)
- [static/app.js#L262](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L262)
- [static/app.js#L349](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L349)
- [static/app.js#L525](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L525)
- [static/app.js#L1028](/Users/parveenshaikh/Study/AI/Courses/Git-Repo/league-ledger/league-ledger/static/app.js#L1028)

## Backend / Architecture Notes

### Positive aspects

- Compact codebase, easy to reason about initially
- Clear separation between API layer and service layer
- Good prototype velocity
- Supabase fallback concept shows deployment awareness

### Structural concerns

- Business rules depend too heavily on frontend behavior
- Historical state is under-modeled
- Persistence model is not audit-safe
- SQLite and Supabase implementations can drift over time
- No transaction strategy abstraction
- No automated test coverage for core money logic

## Recommended Priority Order

### Phase 1: Immediate fixes

1. Remove the path traversal vulnerability.
2. Remove default credentials and default secret behavior from production paths.
3. Stop rendering untrusted values with `innerHTML`.

### Phase 2: Data model correction

1. Introduce per-match participant records.
2. Snapshot entry fee, payouts, and winner count onto each match at creation time.
3. Replace hard deletes with soft deletes or archival semantics.
4. Enforce foreign keys and referential integrity.
5. Move money to integer cents / fixed precision.

### Phase 3: UX modernization

1. Break the workflow into route-based screens.
2. Persist draft state locally for unfinished forms.
3. Restore current step and active match after refresh.
4. Replace blocking alerts with inline feedback/toasts.
5. Improve accessibility labels and keyboard flows.

### Phase 4: Engineering maturity

1. Add tests for payout logic, ties, cancellations, and historical invariants.
2. Add auth/security tests.
3. Add migration-backed schema management.
4. Add transactional protection for Supabase flows.

## Verification Notes

What was verified during review:

- Backend and frontend sources were inspected end to end.
- Python modules and JS files were syntax-checked.
- Live HTTP checks were run locally against the app.
- The path traversal issue was confirmed via an actual request.

Constraints:

- Full browser automation screenshots were not available because the browser automation CLI was not installed in this environment.

