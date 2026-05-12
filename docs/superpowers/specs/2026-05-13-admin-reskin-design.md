# Admin Reskin + Dashboard Rebuild — Design Spec

**Date:** 2026-05-13
**Status:** Approved for implementation planning

## Purpose

Apply the visual design system from the Claude Design handoff bundle (`vivid-care/project/`) to the existing VividCare Next.js admin webapp. The current admin uses a teal `#0D9488` brand and cool slate greys; the design bundle uses the **actual logo colors** (purple primary, blue + green accents) with the same warm-cool-mixed neutral palette already in production.

This is **visual reskin + new shell components (topbar, Vivi drawer) + dashboard rebuild**. Business logic, Supabase queries, auth flow, and routing structure are not touched.

## Goals

1. Bring the admin webapp's visual identity in line with the brand defined by the VividCare logo (purple, not teal).
2. Match the bundle's information density on the admin dashboard — KPI sparklines, live roster timeline, donut chart, etc. — so admins get the operational picture at a glance.
3. Move the AI assistant from a standalone full-page route (`/admin/assistant`) into a slide-in drawer triggered from a new topbar — matches the bundle's "Vivi" UX pattern and frees the page route.
4. Add a live GPS map widget to the dashboard so admins see staff positions without navigating away (extension of the bundle).
5. Keep everything else stable — no schema changes, no business logic edits, no route changes outside the assistant deletion.

## Non-goals

- Mobile app changes (separate later phase)
- Warm-slate body-text migration (greys stay cool: `#0f172a`, `#64748b`)
- New Supabase tables or migrations
- Changes to staff portal, client portal, or any signing flow
- Re-engineering the existing `/admin/active-shifts` map page (stays as-is, just paint-reskinned)

## Design tokens

### Brand palette (replaces existing teal palette)

| Token | Hex | Use |
|---|---|---|
| `--vc-primary` (purple) | `#6B2C91` | Active states, primary buttons, focus rings, sidebar active bg → text |
| Purple 50 | `#F4ECF8` | Active nav background, hover surfaces |
| Purple 100 | `#E6D4F0` | Subtle accents, secondary button border |
| Purple 200 | `#C9A6DE` | Decorative |
| Purple 700 | `#54206F` | Pressed states, dark text on light |
| Purple 900 | `#2E1240` | Heaviest accent (rarely used) |
| Blue accent | `#2BAEE0` | **NDIS chip background tone source** |
| Blue 50 | `#E6F5FC` | NDIS chip background |
| Blue 700 | `#1380AB` | NDIS chip text |
| Green accent | `#8DC63F` | "In progress" indicator, success dot, sparkline trend up |
| Green 50 | `#F1F9E1` | Success chip background |
| Green 700 | `#5E8D1F` | Success chip text |

### Status colors (unchanged from current — re-confirmed)

- Success `#16A34A` / bg `#DCFCE7` (existing) → can stay, or migrate to bundle's `#E7F5E7`. **Decision: stay** (current is more accessible).
- Warning `#D97706` / bg `#FEF3D6`
- Danger `#DC2626` / bg `#FEE2E2`

### Slate (cool greys — unchanged from current)

`#0f172a` body, `#475569` / `#64748b` secondary, `#94a3b8` tertiary, `#e6e8ec` borders, `#f7f8f9` app background. Warm slates not adopted (user decision).

### Typography

- Body: `'IBM Plex Sans', -apple-system, system-ui, sans-serif` (replaces current sans)
- Mono: `'IBM Plex Mono', ui-monospace, monospace`
- Type scale stays as currently defined (h1 28/700, h2 20/600, h3 16/600, body 14/400, label 12/500 uppercase, micro 11/500).

### Radii (current values mostly already match)

- Cards: 16-20px (existing uses 16-24px range; keep current)
- Buttons: 14px
- Inputs: 12px
- Chips: 999px (pill)

### Shadows

Keep existing shadow stack. Brand-tinted shadows on primary buttons:
- Primary button: `0 6px 16px rgba(107,44,145,0.25)` (purple-tinted)

### NDIS chip recolor

Current: indigo `#eef2ff` background / `#3b5bdb` text.
New: blue `#E6F5FC` background / `#1380AB` text. (Pulled from VividCare logo's blue figure.)

## Build slices (12 total, grouped into A/B/C)

### Group A — Foundation (mechanical, low risk)

**Slice 1 — Brand tokens**
- `tailwind.config.ts`: replace primary color stops, add IBM Plex font family
- `app/globals.css`: import IBM Plex Sans + Mono from Google Fonts, replace `--vc-primary`, `--vc-primary-700`, `--vc-primary-50`, `--vc-primary-100` etc. with purple equivalents
- Verification: `npm run build` passes

**Slice 2 — Mechanical color sweep**
- Find/replace across all `.tsx`, `.ts`, `.css` in `app/`, `components/`, `lib/`:
  - `#0d9488` → `#6B2C91`
  - `#0f766e` → `#54206F`
  - `#f0fdfa` → `#F4ECF8`
  - `#ccfbf1` → `#E6D4F0`
  - `#eef2ff` (NDIS bg) → `#E6F5FC`
  - `#3b5bdb` (NDIS text) → `#1380AB`
- Skip teal-tinted shadows on primary buttons — explicitly rewrite to purple-tinted
- Verification: `tsc --noEmit` + `npm run build`

**Slice 3 — Logo assets**
- Replace `/public/logo.png` with `staff-design/vivid-care/project/assets/vividcare-logo.png` (purple wordmark)
- Add `/public/logo-light.png` (white-on-purple variant) and `/public/logo-transparent.png`
- No code changes — pure asset swap
- Verification: visual render

### Group B — Shell (new components)

**Slice 4 — Sidebar redesign**
- `components/admin/AdminSidebar.tsx`: rewrite to match bundle
  - Top: VividCare logo (purple wordmark, 56px height, centered)
  - Org switcher card: gradient "WA" glyph + "Western Australia · Perth" + "42 clients" subtitle + chevron-down
  - Primary nav group: Dashboard, Schedule, Clients (badge: count), Team, Notes & incidents (badge: count)
  - "Operations" sub-label
  - Secondary nav group: Billing · NDIS, Reports, Settings
  - Footer: coordinator avatar + name + role + help icon
- **Remove "Assistant" nav item** (handled by drawer)
- Active state: purple-50 bg, purple-700 text, left accent bar (4px purple)
- Verification: render-check, all routes still resolve

**Slice 5 — Delete `/admin/assistant` page**
- Delete `app/admin/assistant/page.tsx` and `app/admin/assistant/AssistantClient.tsx` and the directory
- **Keep `app/api/admin/assistant/route.ts`** — drawer reuses it
- Verification: `tsc --noEmit` passes (no dangling imports)

**Slice 6 — AdminTopbar component**
- New `components/admin/AdminTopbar.tsx`:
  - Glassmorphism: `bg-white/85 backdrop-blur-xl`, 64px height
  - Global search input (left): `Search clients, shifts, notes…` with ⌘K hint
  - "Ask Vivi" button: pill with animated purple→blue gradient orb icon + "Ask Vivi" label + ⌘/ hint badge
  - Quick add pill (right cluster)
  - Notification bell with red dot
  - Help icon
  - Avatar (admin)
- Integrate into `app/admin/layout.tsx` above main content area
- `viviOpen` state lives in `app/admin/layout.tsx`
- Verification: build + render, all pages have the topbar

**Slice 7 — Vivi drawer**
- New `components/admin/ViviDrawer.tsx`:
  - Slide-in from right, 460px wide, full viewport height
  - Backdrop overlay (`bg-black/40 backdrop-blur-sm`) — click to close
  - Header: animated gradient orb + "Ask Vivi" title + "New chat" button + close X
  - Empty state: 6 suggested prompts in 2-column grid:
    1. "Show me live shifts"
    2. "Any open incidents?"
    3. "Run an NDIS claim summary"
    4. "Explain SCHADS pay rates"
    5. "Whose credentials expire this month?"
    6. "Find shift clashes this week"
  - Active chat: user bubbles (purple, right), AI bubbles (white with border, left)
  - **Minimal inline markdown rendering** in AI bubbles: parse `**bold**` to `<strong>`, lines starting with `• ` or `- ` to bulleted lists. No external markdown library.
  - Animated typing indicator (3 bouncing dots)
  - Footer composer: rounded textarea + purple send circle
  - ⌘/ shortcut: toggle open globally (works from any admin page)
  - Esc: close
  - Click outside (overlay): close
- API: POST to existing `/api/admin/assistant` — request/response contract unchanged
- Verification: end-to-end chat works, ⌘/ opens from any page, Esc closes

### Group C — Dashboard rebuild

**Slice 8 — Dashboard page header + alert banner**
- Top of `app/admin/dashboard/page.tsx`:
  - Greeting block: "Good morning, {firstName}" + "Tuesday, 13 May 2026 · X shifts scheduled across N support workers"
  - Right-aligned actions: Day/Week/Month segmented tabs + Export button + New shift primary button
- Alert banner (conditional, only when at least one open critical incident):
  - Amber warn icon + "{Client Name} — incident filed {date} ({severity}). Awaiting your review before NDIS reporting window closes {deadline}."
  - "Review now" CTA → links to incident detail
  - Dismiss X (sets `seen_at` in local state for this session, doesn't update DB)
- Verification: header and banner render with real data; banner hidden when no open critical incidents

**Slice 9 — KPI cards (4 in a row)**
- New `components/admin/dashboard/KpiCard.tsx`:
  - Card with corner icon (colored bg circle)
  - Label (uppercase 11/500)
  - Big value with subscript (e.g., "18" + "of 20 scheduled")
  - Delta badge (`↑ +3 vs last Tue` / `→ On track for month` / `↓ −2 this week`)
  - Context bar: progress-to-target with "On target" / "Above average" caption
  - **Custom SVG sparkline** (no chart library) — 8-point trend line, colored by KPI tone. Historical data points come from aggregating the relevant metric over the last 8 days (e.g., "Shifts today" sparkline = daily shift counts from 7 days ago through today; query is a simple `GROUP BY date_trunc('day', start_time)`)
- Four KPIs:
  1. Shifts today — count from `shifts` table (start_time in today)
  2. Hours this week — sum of `(clock_out_time - clock_in_time)` from `shifts` this week
  3. NDIS revenue — sum of `(hours × hourly_rate)` for paid+pending shifts of NDIS clients this month
  4. Open incidents — count from `incidents` where `status='open'`
- All queries against existing tables; no schema changes
- Verification: data renders correctly with real records

**Slice 10 — Live staff map widget**
- Use existing `components/maps/LiveMap.tsx` (built in commit `ab2af96`)
- Wrap in dashboard card:
  - Header: "Where staff are now" title + "{count} on shift" subtitle + "View full board →" link to `/admin/active-shifts`
  - 360px tall map area
  - Pins: staff (purple) with name on hover; clients of in-progress shifts (blue)
- Realtime: existing `staff_locations` subscription continues to flow
- Verification: pins update in real time on first render and on subscription events

**Slice 11 — Live roster timeline**
- New `components/admin/dashboard/RosterTimeline.tsx`:
  - Card with header: "Live roster · {date}" + meta "X workers · Y shifts · Z in progress" + Filter button + Today/Tomorrow/Week tabs
  - Grid: left column = worker avatar + name + role; right area = 12-hour timeline (7a–6p)
  - Hour markers across the top
  - **Color-coded shift blocks**, positioned by CSS grid based on start hour and duration:
    - Purple = personal care
    - Green = physio / activity
    - Blue = NDIS service
    - Amber = admin / care plan review
    - Outline = transport
    - Red = missed shift
  - "Live" indicator: pulsing green dot on in-progress shifts
  - **Vertical "NOW" line** at the current hour position
  - 5 workers visible by default; scrollable
- Data: `shifts` for today joined with `profiles` (staff) and `clients`
- Realtime: subscribe to `shifts` table changes
- Verification: alignment correct (blocks land on the right hour columns), NOW line at current hour, colors match design bundle

**Slice 12 — Side widgets (3-column row)**
- Three cards in a horizontal grid below the timeline:

  a) **Client mix donut**
  - SVG donut chart (custom, no library)
  - Two arcs: NDIS Clients (blue) vs Standard Clients (slate)
  - Center label: total client count
  - Legend with counts
  - Data: `SELECT client_type, count(*) FROM clients GROUP BY client_type`

  b) **Compliance widget**
  - "Expiring credentials" header + "{n} in next 30 days"
  - List of 5 docs nearing expiry: doc type, staff/client name, days remaining (color: red <7d, amber <30d)
  - "View all" link to `/admin/compliance`
  - Data: `documents` where `expiry_date` between now and now+30d

  c) **Team status panel**
  - "Team status now" header + "{count} workers" subtitle
  - List of workers with status pill: "On shift" (green dot), "En route · {n} min away" (amber), "On break" (slate), "Available · next {time}" (slate), "Off today" (slate muted)
  - Data: `profiles` where `role='staff'`, joined with current shift status; status derived from latest `staff_locations` ping + shift status
- Verification: all three widgets render, donut math correct, compliance and team status update on realtime events

## Files changed (high-level)

### Modified
- `tailwind.config.ts`
- `app/globals.css`
- `components/admin/AdminSidebar.tsx`
- `app/admin/layout.tsx` (mount topbar + drawer state)
- `app/admin/dashboard/page.tsx` (rebuild)
- ~50-70 existing files via mechanical color sweep (Slice 2)

### Created
- `components/admin/AdminTopbar.tsx`
- `components/admin/ViviDrawer.tsx`
- `components/admin/dashboard/KpiCard.tsx`
- `components/admin/dashboard/Sparkline.tsx`
- `components/admin/dashboard/AlertBanner.tsx`
- `components/admin/dashboard/RosterTimeline.tsx`
- `components/admin/dashboard/ClientMixDonut.tsx`
- `components/admin/dashboard/ComplianceWidget.tsx`
- `components/admin/dashboard/TeamStatusPanel.tsx`
- `public/logo.png` (replace existing)
- `public/logo-light.png`
- `public/logo-transparent.png`

### Deleted
- `app/admin/assistant/page.tsx`
- `app/admin/assistant/AssistantClient.tsx`
- `app/admin/assistant/` (directory)

### Untouched (explicitly)
- All `/api/*` routes (including `/api/admin/assistant`)
- Supabase migrations and schema
- All `/staff/*` routes
- All `/client/*` routes
- All `/sign/*` and `/sign-inperson/*` routes
- `/admin/active-shifts` page (gets re-painted via mechanical sweep, structure unchanged)
- `/admin/clients`, `/admin/staff`, `/admin/roster`, etc. — re-painted only
- Middleware
- Auth flow

## Verification gates

After **every slice**:
1. `npx tsc --noEmit` — must pass with zero errors
2. `npm run build` — must pass with exit 0
3. Manual visual check of affected pages

After **Group A complete** (slices 1-3): all admin pages should render in purple. Spot-check Dashboard, Clients, Staff, Compliance, Agreements, Incidents pages.

After **Group B complete** (slices 4-7): new sidebar + topbar visible everywhere; Vivi drawer opens via ⌘/ and produces real responses.

After **Group C complete** (slices 8-12): dashboard matches the bundle's layout pixel-approximately.

## Risks + mitigations

1. **Color sweep breaks unrelated UI** (false positive replacements)
   - Mitigation: replace only specific hex values (not regex). Verify build after sweep. Visual check after.

2. **Sparkline / donut SVG looks off across viewports**
   - Mitigation: use viewBox-based SVG with `preserveAspectRatio`. Test at 4 viewport widths.

3. **Roster timeline grid alignment drifts on wide screens**
   - Mitigation: CSS Grid with `grid-template-columns: 200px repeat(12, 1fr)` for hour cells. Position shift blocks by `grid-column-start/end` rather than absolute positioning.

4. **Vivi drawer ⌘/ shortcut conflicts with browser**
   - Mitigation: only listen when admin layout is mounted; `preventDefault` on capture; verify no browser default action for ⌘/ on Chrome/Safari.

5. **Mechanical sweep misses files**
   - Mitigation: after sweep, grep for the old hex values across the entire codebase; any remaining hits flagged.

6. **Existing live-map widget styling breaks when moved into dashboard card**
   - Mitigation: Slice 10 wraps in a card without modifying `LiveMap.tsx` itself. Cards have explicit height; map fills 100%.

## Stop points for review

Three checkpoints — implementation pauses for user visual review:

1. **After Slice 3** (Foundation complete): "Everything is purple now, sidebar still old. Take a look."
2. **After Slice 7** (Shell complete): "New sidebar + topbar + Vivi drawer all live. Try ⌘/ to open Vivi."
3. **After Slice 12** (Dashboard complete): "Dashboard matches the bundle. Done."

## Out of scope (separate later projects)

- Mobile NDIS client tabs (Documents + Agreements + Profile)
- Mobile app wiring to live Supabase data (currently demo)
- Mobile app push notifications
- Warm-slate body-text migration
- Dashboard time-range filter behavior (Day/Week/Month tabs render but don't yet refilter — first pass)
- Quick-add button menu behavior (renders but no-op on first pass)

## Approval

User approved the **brainstormed approach** in the 2026-05-13 brainstorming session. Spec written same day; awaiting spec review before plan-writing.

Next step after spec approval: invoke `superpowers:writing-plans` to produce the detailed implementation plan from these slices.
