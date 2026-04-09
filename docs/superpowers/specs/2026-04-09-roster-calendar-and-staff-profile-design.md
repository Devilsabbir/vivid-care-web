# Roster Calendar Event Details + Staff Profile Page — Design Spec
**Date:** 2026-04-09  
**Scope:** Two independent features: (1) clickable shift details modal on admin roster calendar, (2) staff profile page with sign out

---

## Context

Two usability gaps:
1. Admin roster calendar shows shift events but clicking them does nothing — admins need to see full shift details without navigating away.
2. Staff portal has no way to sign out — there is no logout button anywhere in the staff UI.

---

## Feature 1 — Roster Calendar Event Detail Modal

### How it works

When an admin clicks any event on the FullCalendar roster calendar, a modal appears overlaying the page with full shift details.

### Modal content
- Staff name
- Client name
- Date + start time → end time (formatted, e.g. "Thursday 9 April, 9:00 AM – 5:00 PM")
- Status badge (colour-coded: scheduled=blue, active=green, completed=grey, cancelled=red)
- Notes (shown only if present)
- Close button (X top-right + click outside to dismiss)

### Data source
The shift data is already passed into FullCalendar events via `extendedProps` when events are built in `RosterClient.tsx`. No additional Supabase query needed — just read from the clicked event object in the `eventClick` callback.

### Implementation
- Add `eventClick` prop to the `<FullCalendar>` component in `RosterClient.tsx`
- Add `selectedEvent` state (null or the clicked event's extendedProps + title + start + end)
- Render a modal div conditionally when `selectedEvent` is not null
- Close on backdrop click or X button

**File:** `app/admin/roster/RosterClient.tsx`

---

## Feature 2 — Staff Profile Page + Bottom Nav

### Profile page (`/staff/profile`)

A simple page showing:
- Avatar circle (initials, primary gradient background, large — 64px)
- Full name (bold, headline font)
- Email address (muted text)
- **Sign Out** button — full width, rounded, sky-900/5 background with sky-900 text and border (same style as admin sidebar logout button)

Data: fetch staff profile (full_name, email) from Supabase server-side in the page component. Sign out calls `supabase.auth.signOut()` from a client component and redirects to `/login`.

**Files:**
- `app/staff/profile/page.tsx` (new — server component fetches profile, renders `StaffProfileClient`)
- `app/staff/profile/StaffProfileClient.tsx` (new — client component handles sign out)

### Bottom nav update

Add `{ href: '/staff/profile', icon: 'person', label: 'Profile' }` as the 6th item to `StaffBottomNav.tsx`.

**File:** `components/staff/StaffBottomNav.tsx`

---

## Verification

1. Admin clicks a shift on roster calendar → modal appears with correct staff, client, time, status, notes
2. Click outside modal or X → modal closes
3. Staff bottom nav shows 6 items including Profile
4. `/staff/profile` shows staff name, email, and Sign Out button
5. Clicking Sign Out → redirects to `/login`, session cleared
