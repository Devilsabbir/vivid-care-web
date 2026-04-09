# Roster Calendar Event Details + Staff Profile Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clickable shift detail modal to the admin roster calendar, and add a staff Profile page with sign-out to the bottom nav.

**Architecture:** Feature 1 adds `extendedProps` to FullCalendar events and an `eventClick` handler + detail modal in `RosterClient.tsx`. Feature 2 creates a new `/staff/profile` route (server component + client sign-out component) and adds a 6th item to `StaffBottomNav.tsx`.

**Tech Stack:** Next.js 14 App Router, Supabase SSR, FullCalendar, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `app/admin/roster/RosterClient.tsx` | Add extendedProps to events, add eventClick handler, add detail modal |
| `app/staff/profile/page.tsx` | New — server component, fetches profile data |
| `app/staff/profile/StaffProfileClient.tsx` | New — client component with sign out button |
| `components/staff/StaffBottomNav.tsx` | Add Profile nav item (6th) |

---

## Task 1: Add shift detail modal to roster calendar

**Files:**
- Modify: `app/admin/roster/RosterClient.tsx`

- [ ] **Step 1: Add extendedProps to the events array**

In `RosterClient.tsx`, find the `events` array (around line 56). Replace it with a version that includes `extendedProps`:

```tsx
const events = shifts.map(s => ({
  id: s.id,
  title: `${s.profiles?.full_name ?? 'Staff'} → ${s.clients?.full_name ?? 'Client'}`,
  start: s.start_time,
  end: s.end_time,
  backgroundColor:
    s.status === 'active' ? '#2c694e' :
    s.status === 'completed' ? '#717881' :
    s.status === 'cancelled' ? '#ba1a1a' : '#00446f',
  borderColor: 'transparent',
  extendedProps: {
    staffName: s.profiles?.full_name ?? 'Unknown Staff',
    clientName: s.clients?.full_name ?? 'Unknown Client',
    status: s.status ?? 'scheduled',
    notes: s.notes ?? '',
  },
}))
```

- [ ] **Step 2: Add selectedEvent state**

At the top of `RosterClient`, add a new state variable after the existing state declarations (after line 22):

```tsx
const [selectedEvent, setSelectedEvent] = useState<null | {
  staffName: string
  clientName: string
  status: string
  notes: string
  start: string
  end: string
}>(null)
```

- [ ] **Step 3: Pass onEventClick to CalendarWrapper**

Update the `<CalendarWrapper>` call (around line 94) to pass the handler:

```tsx
<CalendarWrapper
  events={events}
  onEventClick={(info: any) => {
    setSelectedEvent({
      staffName: info.event.extendedProps.staffName,
      clientName: info.event.extendedProps.clientName,
      status: info.event.extendedProps.status,
      notes: info.event.extendedProps.notes,
      start: info.event.startStr,
      end: info.event.endStr,
    })
  }}
/>
```

- [ ] **Step 4: Update CalendarWrapper to accept and use onEventClick**

Update the `CalendarWrapper` function signature and the `<FC>` component:

```tsx
function CalendarWrapper({ events, onEventClick }: { events: any[], onEventClick: (info: any) => void }) {
```

And add `eventClick={onEventClick}` to the `<FC>` component props:

```tsx
return (
  <FC
    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
    initialView="dayGridMonth"
    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
    events={events}
    eventClick={onEventClick}
    height="auto"
  />
)
```

- [ ] **Step 5: Add the detail modal JSX**

At the end of the component's return statement (after the existing `<Modal>` closing tag, before the final `</>`), add the shift detail modal:

```tsx
{selectedEvent && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={() => setSelectedEvent(null)}
  >
    <div
      className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-lg font-bold font-headline text-on-surface">Shift Details</h3>
        <button onClick={() => setSelectedEvent(null)} className="text-outline hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {selectedEvent.staffName.charAt(0)}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Staff</p>
            <p className="text-sm font-semibold text-on-surface">{selectedEvent.staffName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-secondary text-base">person</span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Client</p>
            <p className="text-sm font-semibold text-on-surface">{selectedEvent.clientName}</p>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl px-4 py-3 space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Time</p>
          <p className="text-sm font-semibold text-on-surface">
            {new Date(selectedEvent.start).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-on-surface-variant">
            {new Date(selectedEvent.start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            {' → '}
            {new Date(selectedEvent.end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Status</p>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
            selectedEvent.status === 'active' ? 'bg-secondary' :
            selectedEvent.status === 'completed' ? 'bg-outline' :
            selectedEvent.status === 'cancelled' ? 'bg-error' : 'bg-primary'
          }`}>
            {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
          </span>
        </div>

        {selectedEvent.notes && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Notes</p>
            <p className="text-sm text-on-surface bg-surface-container rounded-xl px-4 py-3">{selectedEvent.notes}</p>
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify**

Open the roster calendar at `/admin/roster`. Click any shift event — a modal should appear with staff name, client name, time, status badge, and notes. Click outside or X to close.

- [ ] **Step 7: Commit**

```bash
git add app/admin/roster/RosterClient.tsx
git commit -m "feat: add shift detail modal to roster calendar"
```

---

## Task 2: Create staff profile page

**Files:**
- Create: `app/staff/profile/page.tsx`
- Create: `app/staff/profile/StaffProfileClient.tsx`

- [ ] **Step 1: Create StaffProfileClient.tsx**

Create `app/staff/profile/StaffProfileClient.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StaffProfileClient({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col items-center pt-10 pb-6 px-6">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full primary-gradient flex items-center justify-center text-white text-2xl font-bold font-headline mb-4">
        {fullName.charAt(0).toUpperCase()}
      </div>

      <h2 className="text-xl font-bold font-headline text-on-surface">{fullName}</h2>
      <p className="text-sm text-on-surface-variant mt-1 mb-8">{email}</p>

      <div className="w-full max-w-sm space-y-3">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Full Name</p>
          <p className="text-sm font-semibold text-on-surface">{fullName}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Email</p>
          <p className="text-sm font-semibold text-on-surface">{email}</p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sky-900/5 text-sky-900 font-headline text-sm font-bold border border-sky-900/10 hover:bg-sky-900/10 transition-colors mt-4"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create page.tsx**

Create `app/staff/profile/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffProfileClient from './StaffProfileClient'

export default async function StaffProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <StaffProfileClient
      fullName={profile?.full_name ?? 'Staff'}
      email={user.email ?? ''}
    />
  )
}
```

- [ ] **Step 3: Verify files exist**

Confirm both files are created at the correct paths:
- `app/staff/profile/page.tsx`
- `app/staff/profile/StaffProfileClient.tsx`

- [ ] **Step 4: Commit**

```bash
git add app/staff/profile/page.tsx app/staff/profile/StaffProfileClient.tsx
git commit -m "feat: add staff profile page with sign out"
```

---

## Task 3: Add Profile to staff bottom nav

**Files:**
- Modify: `components/staff/StaffBottomNav.tsx`

- [ ] **Step 1: Add Profile to navItems**

In `components/staff/StaffBottomNav.tsx`, update the `navItems` array to add Profile as the 6th item:

```tsx
const navItems = [
  { href: '/staff/home', icon: 'calendar_month', label: 'Home' },
  { href: '/staff/clock', icon: 'timer', label: 'Clock' },
  { href: '/staff/documents', icon: 'folder', label: 'Documents' },
  { href: '/staff/payments', icon: 'payments', label: 'Payments' },
  { href: '/staff/support', icon: 'smart_toy', label: 'Support' },
  { href: '/staff/profile', icon: 'person', label: 'Profile' },
]
```

- [ ] **Step 2: Verify bottom nav**

Open the staff portal and confirm the bottom nav shows 6 items: Home, Clock, Documents, Payments, Support, Profile. Tap Profile to navigate to `/staff/profile`.

- [ ] **Step 3: Commit**

```bash
git add components/staff/StaffBottomNav.tsx
git commit -m "feat: add profile tab to staff bottom nav"
```

---

## Verification Checklist

- [ ] Admin roster: clicking any shift event opens a detail modal
- [ ] Detail modal shows staff name, client name, date/time, status badge, notes (if any)
- [ ] Clicking outside modal or X closes it
- [ ] Staff bottom nav has 6 items including Profile
- [ ] `/staff/profile` shows staff name, email, and Sign Out button
- [ ] Sign Out clears session and redirects to `/login`
