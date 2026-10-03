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
7. **When Supabase is connected**, the app now shows a full-screen
   sign-in/sign-up gate before anything else — the person must sign in
   or explicitly tap "Skip — offline only" before the dashboard and
   tabs appear. With `config.js` left blank, there's nothing to gate
   and the app boots straight to the dashboard as before.

## Modules
- **ንብረት (Assets)** — register every asset (code, source, status,
  location); nothing is tracked as "removed" without a letter reference.
- **ገቢና ወጪ (Income & Expense)** — log every income source (holiday
  collections, sub-unit income, Development-dept transfers) with a
  deposited-to-bank flag, and every expense with its authorizer and a
  reconciled flag. **Total Income automatically includes money marked
  paid on the መዋጮ (Contributions) tab** — don't log that same money again
  as a separate Income entry, it's already counted (the stat card shows
  the ገቢ + መዋጮ breakdown). Dashboard totals and an undeposited-cash flag
  are computed live, entirely offline.
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
  - **🖨 Generate report** (print/PDF) and **📊 Generate PowerPoint** — both
    admin-only when Supabase is connected (open to whoever's on the device
    in offline-only mode). Both only count records **dated inside the
    selected 3/6/12-month window** — that's intentional (a "last quarter"
    report shouldn't include five-year-old entries), but it means a
    record dated outside that window shows as 0 in the report even
    though it's still there on its own tab. The PowerPoint version builds
    a bar chart (income/መዋጮ/expense/balance) and two doughnut charts
    (plan on-track vs needs-attention, repairs done vs pending), then a
    per-plan-item completion table, chunked across slides so it stays
    readable. The .pptx downloads straight to the phone/device, built
    entirely client-side with PptxGenJS (no server). To make someone an
    admin: edit their row in Supabase's `user_roles` table
    (`update user_roles set role = 'admin' where user_id = '...'`).
    Text uses the **Nyala** font for Ethiopic-script rendering — widely
    available on Windows; if a viewer's device lacks it, PowerPoint/
    Keynote will substitute a fallback font automatically.

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


## Local reminders
Settings → 🔔 Local reminders lets a device opt in to a once-a-day
on-device notification summarizing anything that needs attention
(follow-ups needed, items/inventory needing attention, upcoming
programs/events, plan items coming due) — plus a "Check now" button to
check immediately rather than waiting. This uses the browser's
Notification API directly; it is **not** server push. There's no
backend to wake the app when it's closed, so this only fires while the
app is open on that device (same limitation as the HR app's version of
this feature, and for the same reason: no server, zero-cost static
site).


## Offline-only is a deploy-time choice, not a sign-in bypass
"Skip — offline only" no longer appears on the sign-in screen. Someone
without an account can no longer tap past sign-in to get in — offline
mode has no role restriction (admin-equivalent access, by design, since
there's no shared team to check against when nobody's signed in), so
letting anyone skip would have meant anyone without an account could get
full access. A person who **has** signed up still gets offline access
automatically the next time they open the app without a connection —
their session is remembered on that device, no button needed. True
"nobody needs an account" offline mode is still available, but only as
a deploy-time choice: leave `config.js` blank and the app never shows a
sign-in screen at all.
