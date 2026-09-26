# የንብረትና ሂሳብ ቁጥጥር ክፍል — Asset & Finance Control (PWA)

Offline-first tool for the ንብረት ክፍል (Property & Accounts Control department),
built the same way as the HR attendance app — but for what this department
actually does: asset tracking, income/expense control, repairs, leader
contributions, and their own Ethiopian-calendar-aware ዕቅድ. No attendance/QR
here on purpose; that was HR-specific.

Works fully on-device via IndexedDB, no backend required. Supabase is
**optional** — connect it if several phones need to share one set of
records; skip it and it runs entirely offline/local, same as before.

## Deploy
1. Push this folder to a GitHub Pages repo (e.g. `tools/neberet-kefel/`),
   same pattern as the other tools.
2. Open the URL on a phone → "Add to Home Screen" / "Install app".
3. First load must happen **online once** so the service worker can cache
   the app shell and CDN libraries (Excel + Supabase client). After that
   it works fully offline.

## Optional: connect Supabase (for multiple phones)
1. Create a free project at supabase.com.
2. **SQL Editor** → paste and run `supabase-schema.sql` — creates
   `assets`, `income`, `expenses`, `repairs`, `contributions`,
   `plan_items`, `user_roles`, and `profiles` + RLS (any signed-in
   member can read/write; delete and the report generator are admin-only).
3. **Authentication → Providers**: confirm Email is on; for a small
   trusted team you can turn off "Confirm email".
4. **Project Settings → API**: copy the Project URL and anon public key
   into `config.js` before deploying — then every member lands straight
   on sign-in, nobody pastes anything by hand. It's safe to ship the
   anon key here; every table it touches is RLS-protected. Never put the
   `service_role` key in `config.js`.
5. Everyone who signs up starts as `member`. In the Supabase dashboard,
   edit their `user_roles` row to `admin` if they should be able to
   delete records or run the report generator.
6. Don't want the cloud at all? Leave `config.js` blank — Settings tab
   shows "Skip — offline only" and the app just runs local.

## Modules
- **ንብረት (Assets)** — register every asset (code, source, status,
  location); nothing is tracked as "removed" without a letter reference.
- **ገቢና ወጪ (Income & Expense)** — log every income source (holiday
  collections, sub-unit income, Development-dept transfers) with a
  deposited-to-bank flag, and every expense with its authorizer and a
  reconciled flag. Dashboard totals and an undeposited-cash flag are
  computed live, entirely offline.
- **ጥገና (Repairs)** — track damaged items from report through resolution
  and cost.
- **መዋጮ (Contributions)** — track leader contribution rounds: expected
  vs. paid, who collected it, when.
- **Import/Export Excel on every module** — Assets, Income, Expenses,
  Repairs, and Contributions each have their own ⬆ Import Excel / ⬇
  Export Excel buttons (same pattern as the ዕቅድ tab). Import recognizes
  either the Amharic or English column header for each field. Re-importing
  updates existing rows instead of duplicating them, matched by a
  sensible key per module: Assets by code, Income by date+source+amount,
  Expenses by date+purpose+amount, Repairs by item+date reported,
  Contributions by period+leader. Rows missing that key are always
  added as new.
- **ዕቅድ (Plan)** — the department's exact 14-item 2018 ዓ/ም plan (from
  `2018_የንብረት_ክፍል_እቅድ.docx`) is seeded automatically on first load.
  - Each item's due date is computed from its own `timing` text using
    exact Ethiopian↔Gregorian conversion (`ethiopian-calendar.js`) — a
    named month like ጥቅምት or a list like "ህዳር የካቲት ግንቦት ነሐሴ" schedules
    the nearest upcoming occurrence; a count like "12 ጊዜ" becomes a
    monthly cadence; "እንደአስፈላጊነቱ" has no fixed date.
  - **ተከናውኗል ✓** logs a completion note with today's date and
    recalculates the next due date from the same timing rule.
  - **Import/Export Excel** to hand-edit the plan or bring in next
    year's version; matched by title + sub-unit so re-importing updates
    rather than duplicates.
  - **ወደ መጀመሪያው ዕቅድ መልስ** wipes edits and restores the exact docx-derived
    plan.
  - **🖨 Generate report** (admin-only when Supabase is connected; open
    to whoever's on the device in offline-only mode) opens a printable
    period summary — totals, plan-item completion counts, and status —
    that can be saved as a PDF via the browser's print dialog.

## Files
- `index.html` — app shell, ledger-inspired dark green/brass styling
  (Noto Serif/Sans Ethiopic + IBM Plex Mono), print CSS for reports
- `config.js` — deploy-time Supabase URL/anon key
- `i18n.js` — full AM/EN dictionary + `t()` helper + language toggle
- `ethiopian-calendar.js` — exact Ethiopian↔Gregorian conversion +
  month-name parsing, used to schedule and display plan due dates
- `db.js` — IndexedDB wrapper (no external library, works fully offline)
- `plan-seed.js` — the department's 2018 ዓ/ም plan, seeded on first load
- `auth.js` — optional Supabase client, sign-in/up, roles, sync
- `app.js` — all module CRUD (assets/income/expenses/repairs/
  contributions), dashboard, ዕቅድ engine, Excel import/export, report
  generation, tab routing
- `manifest.json`, `sw.js` — PWA installability + offline caching (bump
  the `CACHE` version string in `sw.js` whenever you redeploy changed
  files, so phones pick up the update)
- `supabase-schema.sql` — one-time table + RLS + role setup
- `icon-192.png`, `icon-512.png` — app icons

## Next for other departments
Same pattern again: get their plan doc, map their actual weekly/monthly
work into modules (not a copy of this one), reuse `ethiopian-calendar.js`,
`i18n.js`, `db.js`, and the CRUD/plan-engine patterns in `app.js` as a
starting point rather than starting from zero each time.
