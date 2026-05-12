# Admin Reskin + Dashboard Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the VividCare Next.js admin app from teal to purple (matching the actual logo), add a new glassmorphism topbar with a slide-in Vivi AI drawer, and rebuild the admin dashboard to match the Claude Design bundle — including a live GPS staff map, KPI cards with sparklines, a live roster timeline, and supporting widgets.

**Architecture:** Visual-only refactor. Brand color tokens flow from `tailwind.config.ts` + `app/globals.css` outward via Tailwind classes and CSS custom properties. Mechanical find/replace handles inline hex values across ~77 files. The Vivi drawer reuses the existing `/api/admin/assistant` API route. New dashboard widgets are custom SVG components — no chart library introduced.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind CSS, Supabase JS (existing), custom inline SVG for sparklines + donut.

**Verification gates:** After every task: `npx tsc --noEmit` must pass and `npm run build` must pass with exit 0. Spot-check visuals after each Group's last task.

**Spec:** `docs/superpowers/specs/2026-05-13-admin-reskin-design.md`

---

## Group A — Foundation (mechanical, low risk)

### Task 1: Replace brand tokens in tailwind.config.ts

**Files:**
- Modify: `tailwind.config.ts:12-69`

- [ ] **Step 1: Open tailwind.config.ts and replace the `vc-primary` color stops + legacy aliases.** Replace lines 12-69 of the `colors:` block with the version below.

Find this block:
```ts
        "vc-primary":     "#0d9488",
        "vc-primary-700": "#0f766e",
        "vc-primary-800": "#115e59",
        "vc-primary-50":  "#f0fdfa",
        "vc-primary-100": "#ccfbf1",
```

Replace with (keeping all surrounding lines intact, just swapping these 5 hex values):
```ts
        "vc-primary":     "#6B2C91",
        "vc-primary-700": "#54206F",
        "vc-primary-800": "#2E1240",
        "vc-primary-50":  "#F4ECF8",
        "vc-primary-100": "#E6D4F0",
```

Also find this block lower down (legacy neutral tokens):
```ts
        "primary":                    "#0d9488",
        "primary-container":          "#0f766e",
```
Replace with:
```ts
        "primary":                    "#6B2C91",
        "primary-container":          "#54206F",
```

And:
```ts
        "inverse-primary":            "#ccfbf1",
```
Replace with:
```ts
        "inverse-primary":            "#E6D4F0",
```

- [ ] **Step 2: Verify build still passes**

Run: `cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit`
Expected: exit 0, no errors

Run: `cd C:/Users/sabbi/vivid_care_web && npm run build`
Expected: exit 0, "✓ Compiled successfully"

- [ ] **Step 3: Commit**

```bash
cd C:/Users/sabbi/vivid_care_web
git add tailwind.config.ts
git commit -m "chore: install purple brand tokens in tailwind config"
```

---

### Task 2: Replace CSS custom properties in globals.css

**Files:**
- Modify: `app/globals.css:1-100`

- [ ] **Step 1: Replace the `:root` block lines 7-12 in `app/globals.css`.**

Find:
```css
  /* Primary — teal */
  --vc-primary:     #0d9488;
  --vc-primary-700: #0f766e;
  --vc-primary-800: #115e59;
  --vc-primary-50:  #f0fdfa;
  --vc-primary-100: #ccfbf1;
```

Replace with:
```css
  /* Primary — purple (VividCare logo) */
  --vc-primary:     #6B2C91;
  --vc-primary-700: #54206F;
  --vc-primary-800: #2E1240;
  --vc-primary-50:  #F4ECF8;
  --vc-primary-100: #E6D4F0;

  /* Brand accents (from logo) */
  --vc-blue:        #2BAEE0;
  --vc-blue-50:     #E6F5FC;
  --vc-blue-700:    #1380AB;
  --vc-green-brand: #8DC63F;
  --vc-green-50b:   #F1F9E1;
  --vc-green-700b:  #5E8D1F;
```

- [ ] **Step 2: Update the `::selection` rule on line ~57-60**

Find:
```css
::selection {
  background: rgba(13, 148, 136, 0.18);
  color: var(--vc-text);
}
```

Replace with:
```css
::selection {
  background: rgba(107, 44, 145, 0.18);
  color: var(--vc-text);
}
```

- [ ] **Step 3: Update FullCalendar today highlight rule (~line 158-161)**

Find:
```css
.vivid-roster-calendar .fc .fc-daygrid-day.fc-day-today,
.vivid-roster-calendar .fc .fc-timegrid-col.fc-day-today {
  background-color: rgba(13, 148, 136, 0.06) !important;
}
```

Replace with:
```css
.vivid-roster-calendar .fc .fc-daygrid-day.fc-day-today,
.vivid-roster-calendar .fc .fc-timegrid-col.fc-day-today {
  background-color: rgba(107, 44, 145, 0.06) !important;
}
```

- [ ] **Step 4: Verify build**

Run: `cd C:/Users/sabbi/vivid_care_web && npm run build`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "chore: swap teal CSS custom properties to purple + add brand accents"
```

---

### Task 3: Mechanical color sweep across all source files

**Files:**
- Modify: ~77 files matched by hex value

- [ ] **Step 1: Run the PowerShell color-sweep script**

Save this exact script content to a temp file and run it:

```powershell
$dir = "C:\Users\sabbi\vivid_care_web"

$replacements = @(
  # Primary teal → purple
  @{ from = '#0d9488'; to = '#6B2C91' },
  @{ from = '#0D9488'; to = '#6B2C91' },
  @{ from = '#0f766e'; to = '#54206F' },
  @{ from = '#0F766E'; to = '#54206F' },
  @{ from = '#115e59'; to = '#2E1240' },
  @{ from = '#f0fdfa'; to = '#F4ECF8' },
  @{ from = '#F0FDFA'; to = '#F4ECF8' },
  @{ from = '#ccfbf1'; to = '#E6D4F0' },
  @{ from = '#CCFBF1'; to = '#E6D4F0' },
  # NDIS chip: indigo → bundle blue
  @{ from = '#eef2ff'; to = '#E6F5FC' },
  @{ from = '#EEF2FF'; to = '#E6F5FC' },
  @{ from = '#3b5bdb'; to = '#1380AB' },
  @{ from = '#3B5BDB'; to = '#1380AB' },
  # Teal-tinted rgba shadows on buttons → purple-tinted
  @{ from = 'rgba(13,148,136,'; to = 'rgba(107,44,145,' },
  @{ from = 'rgba(13, 148, 136,'; to = 'rgba(107, 44, 145,' },
  @{ from = 'rgba(15,118,110,'; to = 'rgba(84,32,111,' },
  @{ from = 'rgba(15, 118, 110,'; to = 'rgba(84, 32, 111,' }
)

$extensions = @('*.tsx', '*.ts', '*.css')
$searchDirs = @('app', 'components', 'lib')
$count = 0

foreach ($searchDir in $searchDirs) {
  $fullPath = Join-Path $dir $searchDir
  if (-not (Test-Path $fullPath)) { continue }

  foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path $fullPath -Recurse -Filter $ext
    foreach ($file in $files) {
      $content = [System.IO.File]::ReadAllText($file.FullName)
      $original = $content
      foreach ($r in $replacements) {
        $content = $content.Replace($r.from, $r.to)
      }
      if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        $count++
      }
    }
  }
}

Write-Host "Updated $count files."
```

Run from a PowerShell terminal. Expected: "Updated 70-80 files."

- [ ] **Step 2: Verify nothing teal remains**

Run from Git Bash:
```bash
cd C:/Users/sabbi/vivid_care_web && grep -rn "#0d9488\|#0f766e\|#f0fdfa\|#ccfbf1\|#3b5bdb\|#eef2ff" --include="*.tsx" --include="*.ts" --include="*.css" app/ components/ lib/ 2>&1 | grep -v "node_modules"
```
Expected: NO output (zero remaining hits)

- [ ] **Step 3: Verify build + tsc still pass**

Run:
```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```
Expected: both pass

- [ ] **Step 4: Commit**

```bash
cd C:/Users/sabbi/vivid_care_web
git add -A
git commit -m "style: mechanical color sweep teal → purple across admin app"
```

---

### Task 4: Swap logo assets

**Files:**
- Modify: `public/logo.png`
- Create: `public/logo-light.png`, `public/logo-transparent.png`

- [ ] **Step 1: Copy the three logo variants from the design bundle into public/**

Run:
```bash
cp "C:/Users/sabbi/OneDrive/Desktop/VividCare Webapp/staff-design/vivid-care/project/assets/vividcare-logo.png" "C:/Users/sabbi/vivid_care_web/public/logo.png"
cp "C:/Users/sabbi/OneDrive/Desktop/VividCare Webapp/staff-design/vivid-care/project/assets/vividcare-logo-light.png" "C:/Users/sabbi/vivid_care_web/public/logo-light.png"
cp "C:/Users/sabbi/OneDrive/Desktop/VividCare Webapp/staff-design/vivid-care/project/assets/vividcare-logo-transparent.png" "C:/Users/sabbi/vivid_care_web/public/logo-transparent.png"
ls -la "C:/Users/sabbi/vivid_care_web/public/"
```
Expected: three logo files present

- [ ] **Step 2: Commit**

```bash
cd C:/Users/sabbi/vivid_care_web
git add public/logo.png public/logo-light.png public/logo-transparent.png
git commit -m "assets: replace logo with purple wordmark + light/transparent variants"
```

**🛑 GROUP A STOP POINT.** Spot-check by opening the admin dashboard in a browser. Everything should be purple. Verify with user before moving on.

---

## Group B — Shell (new components)

### Task 5: Redesign AdminSidebar to match bundle

**Files:**
- Modify: `components/admin/AdminSidebar.tsx` (full rewrite of NAV_GROUPS + body)

- [ ] **Step 1: Open `components/admin/AdminSidebar.tsx` and replace `NAV_GROUPS` (lines 8-43)**

Find the existing `NAV_GROUPS` constant (4 groups, ending with `Settings`). Replace with:

```ts
const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { href: '/admin/dashboard',     icon: 'dashboard',      label: 'Dashboard' },
      { href: '/admin/roster',        icon: 'calendar_month', label: 'Schedule' },
      { href: '/admin/shifts',        icon: 'event_note',     label: 'Shifts' },
      { href: '/admin/shift-history', icon: 'history',        label: 'Shift history' },
      { href: '/admin/active-shifts', icon: 'location_on',    label: 'Live shifts' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/clients', icon: 'group', label: 'Clients' },
      { href: '/admin/staff',   icon: 'badge', label: 'Staff' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/admin/compliance',            icon: 'description', label: 'Documents' },
      { href: '/admin/agreements',            icon: 'draw',        label: 'Agreements' },
      { href: '/admin/incidents',             icon: 'warning',     label: 'Incidents' },
      { href: '/admin/service-documentation', icon: 'fact_check',  label: 'Service docs' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/payments',      icon: 'payments',      label: 'Payments' },
      { href: '/admin/notifications', icon: 'notifications', label: 'Notifications' },
      { href: '/admin/settings',      icon: 'tune',          label: 'Settings' },
    ],
  },
]
```

Note: `Assistant` nav item is **removed** (drawer replaces it).

- [ ] **Step 2: Update the logo block in `sidebarContent` to use the new purple logo**

The current logo block (around line 117-125) renders a teal square + img with `brightness-0 invert`. Replace it with the actual purple logo at 56px height (no recoloring needed since it's already purple). Find:

```tsx
        <Link href="/admin/dashboard" title="Vivid Care" onClick={onClose} className="flex items-center gap-2.5">
          <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[#6B2C91]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-4 w-4 object-contain brightness-0 invert" />
          </div>
          <div className="text-[14px] font-semibold tracking-[-0.01em] text-[#0f172a]">VividCare</div>
          <span className="ml-auto text-[10.5px] font-medium text-[#94a3b8]">Admin</span>
        </Link>
```

Replace with:

```tsx
        <Link href="/admin/dashboard" title="Vivid Care" onClick={onClose} className="flex items-center justify-center w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VividCare" className="h-12 w-auto object-contain" />
        </Link>
```

- [ ] **Step 3: Add the org switcher card immediately after the logo block**

Right after the closing `</div>` of the logo header section (before the search bar), insert:

```tsx
      {/* Org switcher */}
      <div className="border-b border-[#e6e8ec] px-3 py-3">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-[10px] border border-[#e6e8ec] bg-white px-2.5 py-2 hover:bg-[#f7f8f9]"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-gradient-to-br from-[#6B2C91] to-[#2BAEE0] text-[10px] font-semibold text-white">
            WA
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[12px] font-semibold leading-tight text-[#0f172a]">
              Western Australia · Perth
            </div>
            <div className="text-[10.5px] text-[#94a3b8]">Region · 42 clients</div>
          </div>
          <span className="material-symbols-outlined text-[14px] text-[#94a3b8]" aria-hidden="true">expand_more</span>
        </button>
      </div>
```

- [ ] **Step 4: Verify**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "feat(admin): redesign sidebar — org switcher, logo, remove Assistant item"
```

---

### Task 6: Delete the standalone /admin/assistant page

**Files:**
- Delete: `app/admin/assistant/page.tsx`
- Delete: `app/admin/assistant/AssistantClient.tsx`
- Delete: `app/admin/assistant/` (directory)

- [ ] **Step 1: Remove the directory**

```bash
cd C:/Users/sabbi/vivid_care_web
rm -rf app/admin/assistant
```

- [ ] **Step 2: Verify no other file imports from that path**

```bash
grep -rn "admin/assistant" --include="*.tsx" --include="*.ts" app/ components/ 2>&1 | grep -v "api/admin/assistant"
```
Expected: no output (the API route should be the only remaining `admin/assistant` reference).

- [ ] **Step 3: Verify build + tsc**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove standalone /admin/assistant page (drawer replaces it)"
```

---

### Task 7: Build AdminTopbar component

**Files:**
- Create: `components/admin/AdminTopbar.tsx`
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Create `components/admin/AdminTopbar.tsx`**

```tsx
'use client'

import { useEffect } from 'react'

interface AdminTopbarProps {
  adminName?: string
  unreadCount?: number
  onViviOpen: () => void
}

export default function AdminTopbar({ adminName, unreadCount = 0, onViviOpen }: AdminTopbarProps) {
  const initials = adminName
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AD'

  // Global ⌘/ shortcut to open Vivi
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        onViviOpen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onViviOpen])

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-[#e6e8ec] bg-white/85 px-6 backdrop-blur-xl lg:flex">
      {/* Search */}
      <button
        type="button"
        className="flex h-9 min-w-[280px] items-center gap-2 rounded-[10px] border border-[#e6e8ec] bg-[#fafbfc] px-3 text-left text-[12.5px] text-[#94a3b8] hover:bg-white"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">search</span>
        <span className="flex-1 truncate">Search clients, shifts, notes…</span>
        <kbd className="font-mono text-[10.5px] text-[#94a3b8]">⌘ K</kbd>
      </button>

      <div className="flex-1" />

      {/* Vivi trigger */}
      <button
        type="button"
        onClick={onViviOpen}
        className="group flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[#6B2C91] to-[#2BAEE0] px-3.5 text-[12.5px] font-semibold text-white shadow-[0_4px_14px_rgba(107,44,145,0.25)] transition-transform hover:scale-[1.02]"
        aria-label="Open Vivi AI assistant"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/30 blur-md animate-pulse" />
          <span className="material-symbols-outlined relative text-[14px]" aria-hidden="true">auto_awesome</span>
        </span>
        <span>Ask Vivi</span>
        <kbd className="rounded-[4px] bg-white/20 px-1.5 py-0.5 font-mono text-[9px]">⌘ /</kbd>
      </button>

      {/* Quick add */}
      <button
        type="button"
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#e6e8ec] bg-white px-3.5 text-[12.5px] font-semibold text-[#0f172a] hover:bg-[#f7f8f9]"
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
        Quick add
      </button>

      {/* Bell */}
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#475569] hover:bg-[#f7f8f9]"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#DC2626]" />
        )}
      </button>

      {/* Help */}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-[#475569] hover:bg-[#f7f8f9]"
        aria-label="Help"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">help</span>
      </button>

      {/* Avatar */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4ECF8] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#54206F]"
        title={adminName ?? 'Admin'}
      >
        {initials}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Update `app/admin/layout.tsx` to mount the topbar + drawer state.**

First read the current layout:
```bash
cat C:/Users/sabbi/vivid_care_web/app/admin/layout.tsx
```

Then update it. The exact diff depends on its current content. The shape after editing should be:

```tsx
'use client'

import { useState } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopbar from '@/components/admin/AdminTopbar'
import ViviDrawer from '@/components/admin/ViviDrawer'

export default function AdminLayout({
  children,
  // ... existing props
}: {
  children: React.ReactNode
}) {
  const [viviOpen, setViviOpen] = useState(false)

  // (keep any existing server-side data fetching)

  return (
    <div className="min-h-screen bg-[#f7f8f9]">
      <AdminSidebar adminName={/* existing */} />
      <div className="lg:pl-[232px]">
        <AdminTopbar
          adminName={/* existing */}
          unreadCount={/* existing */}
          onViviOpen={() => setViviOpen(true)}
        />
        <main className="px-6 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <ViviDrawer open={viviOpen} onClose={() => setViviOpen(false)} />
    </div>
  )
}
```

**Note:** If `app/admin/layout.tsx` is currently a server component (no `'use client'`) and fetches data, refactor by splitting: keep the data-fetching server component, mount a new `<AdminShell>` client component that takes the fetched data as props and holds the `viviOpen` state. Apply the same shape inside `AdminShell`.

- [ ] **Step 3: Add a temporary placeholder ViviDrawer component so the layout compiles before Task 8**

Create `components/admin/ViviDrawer.tsx`:

```tsx
'use client'

export default function ViviDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return null // Full implementation in Task 8
}
```

- [ ] **Step 4: Verify build + tsc**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```
Expected: both pass

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminTopbar.tsx components/admin/ViviDrawer.tsx app/admin/layout.tsx
git commit -m "feat(admin): new glassmorphism topbar with Vivi trigger + ⌘/ shortcut"
```

---

### Task 8: Build the Vivi drawer with chat UI

**Files:**
- Modify: `components/admin/ViviDrawer.tsx` (full implementation)

- [ ] **Step 1: Replace `components/admin/ViviDrawer.tsx` with the full implementation**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

const SUGGESTED_PROMPTS = [
  'Show me live shifts',
  'Any open incidents?',
  'Run an NDIS claim summary',
  'Explain SCHADS pay rates',
  'Whose credentials expire this month?',
  'Find shift clashes this week',
]

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface ViviDrawerProps {
  open: boolean
  onClose: () => void
}

export default function ViviDrawer({ open, onClose }: ViviDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Esc to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setError(null)
    const userMsg: Message = { id: newId(), role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'The assistant could not respond.')
        setSending(false)
        return
      }
      setMessages(curr => [...curr, { id: newId(), role: 'assistant', content: data.content ?? '' }])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function newChat() {
    if (messages.length === 0) return
    if (!confirm('Start a new conversation?')) return
    setMessages([])
    setError(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Vivi"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="vivi-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-[0_24px_44px_rgba(46,18,64,0.25)] animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#e6e8ec] px-5 py-4">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6B2C91] to-[#2BAEE0] text-white">
            <span className="absolute inset-0 rounded-[10px] bg-white/10 blur-sm animate-pulse" />
            <span className="material-symbols-outlined relative text-[18px]" aria-hidden="true">auto_awesome</span>
          </span>
          <div className="flex-1">
            <p id="vivi-title" className="text-[14px] font-semibold text-[#0f172a]">Ask Vivi</p>
            <p className="text-[11px] text-[#94a3b8]">Operations assistant · powered by Claude</p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={newChat}
              className="rounded-[8px] border border-[#e6e8ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#475569] hover:bg-[#f7f8f9]"
            >
              New chat
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#94a3b8] hover:bg-[#f7f8f9]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#F4ECF8] to-[#E6F5FC] text-[#54206F]">
                <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
              </div>
              <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.01em] text-[#0f172a]">How can I help?</h3>
              <p className="mt-1 max-w-[300px] text-[13px] text-[#64748b]">
                Ask about workflows, NDIS terms, drafting comms, or anything in the admin platform.
              </p>
              <div className="mt-5 grid w-full grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-[10px] border border-[#e6e8ec] bg-white px-3 py-2.5 text-left text-[12px] text-[#0f172a] transition-colors hover:border-[#6B2C91] hover:bg-[#F4ECF8]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => <ViviBubble key={m.id} message={m} />)}
              {sending && <ViviBubble message={{ id: 't', role: 'assistant', content: '' }} typing />}
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-[#fee2e2] bg-[#fef2f2] px-5 py-2 text-[11.5px] text-[#991b1b]">
            {error}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input) }}
          className="border-t border-[#e6e8ec] bg-[#fafbfc] px-4 py-3"
        >
          <div className="flex items-end gap-2 rounded-[14px] border border-[#e6e8ec] bg-white px-3 py-2 focus-within:border-[#6B2C91] focus-within:ring-2 focus-within:ring-[#E6D4F0]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
              }}
              rows={1}
              placeholder="Ask anything…"
              disabled={sending}
              className="flex-1 resize-none bg-transparent text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8] disabled:opacity-60"
              style={{ minHeight: 22, maxHeight: 140 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#6B2C91] text-white disabled:opacity-40"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#94a3b8]">Enter to send · Shift+Enter for newline · ⌘/ to toggle</p>
        </form>
      </aside>
    </div>
  )
}

function ViviBubble({ message, typing }: { message: Message; typing?: boolean }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#F4ECF8] to-[#E6F5FC] text-[#54206F]">
          <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-[14px] px-3 py-2 text-[13px] leading-[20px] ${
          isUser
            ? 'bg-[#6B2C91] text-white'
            : 'border border-[#e6e8ec] bg-white text-[#0f172a]'
        }`}
      >
        {typing ? <TypingDots /> : <FormattedContent content={message.content} />}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[#6B2C91] animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-[#6B2C91] animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-[#6B2C91] animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

/**
 * Minimal inline formatter — handles **bold** and lines starting with `• ` or `- ` as a bulleted list.
 * Avoids pulling in a full markdown library.
 */
function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`b-${blocks.length}`} className="my-1 ml-4 list-disc space-y-0.5">
          {bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: boldify(b) }} />)}
        </ul>,
      )
      bullets = []
    }
  }

  lines.forEach((line, i) => {
    const m = line.match(/^\s*[•\-]\s+(.*)$/)
    if (m) {
      bullets.push(m[1])
    } else {
      flushBullets()
      if (line.trim()) {
        blocks.push(<p key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: boldify(line) }} />)
      }
    }
  })
  flushBullets()
  return <>{blocks}</>
}

function boldify(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
```

- [ ] **Step 2: Verify build + tsc**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```
Expected: both pass

- [ ] **Step 3: Commit**

```bash
git add components/admin/ViviDrawer.tsx
git commit -m "feat(admin): Vivi AI drawer with chat, suggested prompts, ⌘/ shortcut"
```

**🛑 GROUP B STOP POINT.** Open the admin app: sidebar should match the bundle, topbar visible, ⌘/ opens Vivi, chat works end-to-end. Verify with user.

---

## Group C — Dashboard rebuild

> **Note for Group C:** Before each task, read the current dashboard page first to understand the existing data fetching. Most dashboard data already exists in queries used elsewhere — we're rebuilding the visual layer on top.

### Task 9: Dashboard page header + alert banner

**Files:**
- Modify: `app/admin/dashboard/page.tsx`
- Create: `components/admin/dashboard/AlertBanner.tsx`

- [ ] **Step 1: Read the current dashboard page**

```bash
cat C:/Users/sabbi/vivid_care_web/app/admin/dashboard/page.tsx | head -80
```

Note: keep all existing data fetching. We're adding a new header on top and an alert banner.

- [ ] **Step 2: Create `components/admin/dashboard/AlertBanner.tsx`**

```tsx
import Link from 'next/link'

interface AlertBannerProps {
  clientName: string
  reportedAt: string // ISO
  severity: string
  deadline: string // human-readable
  href: string
}

export default function AlertBanner({ clientName, reportedAt, severity, deadline, href }: AlertBannerProps) {
  const reported = new Date(reportedAt).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
  return (
    <div className="flex items-center gap-4 rounded-[16px] border border-[#FEF3D6] bg-[#FFFBEB] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#D97706] text-white">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">warning</span>
      </div>
      <div className="min-w-0 flex-1 text-[13px] leading-5 text-[#78350F]">
        <strong className="text-[#5C2E08]">{clientName}</strong> — incident filed {reported} ({severity}).
        Awaiting your review before NDIS reporting window closes {deadline}.
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-full border border-[#D97706] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#78350F] hover:bg-[#FEF3D6]"
      >
        Review now
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Add a new page header section at the top of the dashboard**

In `app/admin/dashboard/page.tsx`, immediately after the existing header h1/greeting, add (or replace existing header with) this block. Keep any existing greeting logic; just restructure to add the action cluster on the right:

```tsx
{/* Page header */}
<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
  <div>
    <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#0f172a]">
      Good morning, {firstName}
    </h1>
    <p className="mt-1 text-[13px] text-[#64748b]">
      {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      {' · '}
      {shiftsToday} shifts scheduled across {staffCount} support workers
    </p>
  </div>
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex rounded-full bg-[#f1eef4] p-1 text-[12px] font-medium">
      <button className="rounded-full px-3 py-1.5 text-[#64748b]">Day</button>
      <button className="rounded-full bg-[#0f172a] px-3 py-1.5 text-white">Week</button>
      <button className="rounded-full px-3 py-1.5 text-[#64748b]">Month</button>
    </div>
    <button className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e8ec] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#0f172a] hover:bg-[#f7f8f9]">
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
      Export
    </button>
    <Link
      href="/admin/roster"
      className="inline-flex items-center gap-1.5 rounded-full bg-[#6B2C91] px-4 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_14px_rgba(107,44,145,0.25)] hover:bg-[#54206F]"
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
      New shift
    </Link>
  </div>
</header>
```

You'll need `firstName`, `shiftsToday`, `staffCount` computed from the existing data fetch. Add this above the `return`:

```ts
const firstName = (adminName ?? 'there').split(' ')[0]
const shiftsToday = shifts.filter(s => isToday(new Date(s.start_time))).length
const staffCount = new Set(shifts.filter(s => isToday(new Date(s.start_time))).map(s => s.staff_id).filter(Boolean)).size
```

If `isToday` isn't imported: add `import { isToday } from 'date-fns'` at the top.

- [ ] **Step 4: Add alert banner below the header**

Below the header block, query open critical incidents at the top of the page and render the banner if any:

```ts
// Add to data fetching
const { data: openIncidents } = await supabase
  .from('incidents')
  .select('id, title, severity, reported_at, clients(full_name)')
  .eq('status', 'open')
  .in('severity', ['high', 'emergency'])
  .order('reported_at', { ascending: false })
  .limit(1)
const topIncident = openIncidents?.[0]
```

Then in JSX:

```tsx
{topIncident && (
  <AlertBanner
    clientName={(topIncident.clients as any)?.full_name ?? 'Client'}
    reportedAt={topIncident.reported_at}
    severity={topIncident.severity}
    deadline="Thursday"
    href={`/admin/incidents/${topIncident.id}`}
  />
)}
```

- [ ] **Step 5: Verify build + tsc**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/dashboard/page.tsx components/admin/dashboard/AlertBanner.tsx
git commit -m "feat(admin): dashboard header with action cluster + alert banner"
```

---

### Task 10: KPI cards with sparklines

**Files:**
- Create: `components/admin/dashboard/Sparkline.tsx`
- Create: `components/admin/dashboard/KpiCard.tsx`
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create `components/admin/dashboard/Sparkline.tsx`**

```tsx
interface SparklineProps {
  data: number[]
  color: string
  height?: number
}

export default function Sparkline({ data, color, height = 32 }: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ height }} />
  }

  const width = 100 // viewBox width — scales via CSS
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height }}
      aria-hidden="true"
    >
      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
```

- [ ] **Step 2: Create `components/admin/dashboard/KpiCard.tsx`**

```tsx
import Sparkline from './Sparkline'

interface KpiCardProps {
  icon: string
  label: string
  value: string | number
  sub?: string
  delta: string
  direction: 'up' | 'down' | 'flat'
  target: number // 0-100 percentage
  context: string
  color: string
  bg: string
  spark: number[]
}

export default function KpiCard({
  icon, label, value, sub, delta, direction, target, context, color, bg, spark,
}: KpiCardProps) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const deltaColor =
    direction === 'up' ? '#16A34A' : direction === 'down' ? '#DC2626' : '#64748b'
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: bg, color }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5 text-[28px] font-semibold tracking-[-0.02em] text-[#0f172a]">
        {value}
        {sub && <span className="text-[12px] font-medium text-[#94a3b8]">{sub}</span>}
      </p>
      <p className="mt-1 text-[12px] font-medium" style={{ color: deltaColor }}>
        {arrow} {delta}
      </p>
      <div className="mt-3">
        <div className="h-1 overflow-hidden rounded-full bg-[#f1eef4]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, target)}%`, backgroundColor: color }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] font-medium text-[#64748b]">
          <span>{context}</span>
          <span>Target {target}%</span>
        </div>
      </div>
      <div className="mt-3">
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add KPI data fetching + grid to dashboard page**

Inside `app/admin/dashboard/page.tsx`, compute these from existing queries (or add the queries). Below alert banner, render:

```tsx
import KpiCard from '@/components/admin/dashboard/KpiCard'

// ... inside the page component
const kpis = [
  {
    icon: 'calendar_month',
    label: 'Shifts today',
    value: shiftsToday,
    sub: `of ${shiftsTodayScheduled} scheduled`,
    delta: '+3 vs last Tue',
    direction: 'up' as const,
    target: 90,
    context: 'On target',
    color: '#6B2C91',
    bg: '#F4ECF8',
    spark: shiftsSpark, // array of 8 daily counts
  },
  {
    icon: 'schedule',
    label: 'Hours this week',
    value: `${hoursThisWeek}h`,
    sub: 'team total',
    delta: '+12% vs avg',
    direction: 'up' as const,
    target: 93,
    context: 'Above average',
    color: '#1380AB',
    bg: '#E6F5FC',
    spark: hoursSpark,
  },
  {
    icon: 'payments',
    label: 'NDIS revenue',
    value: `$${(ndisRevenue / 1000).toFixed(0)}k`,
    sub: 'unbilled',
    delta: 'On track for month',
    direction: 'flat' as const,
    target: 78,
    context: 'Normal',
    color: '#5E8D1F',
    bg: '#F1F9E1',
    spark: revenueSpark,
  },
  {
    icon: 'warning',
    label: 'Open incidents',
    value: openIncidentsCount,
    sub: openIncidentsCount > 0 ? `${pendingReviewCount} awaiting review` : 'all clear',
    delta: '−2 this week',
    direction: 'up' as const,
    target: 60,
    context: 'Below threshold',
    color: '#D97706',
    bg: '#FEF3D6',
    spark: incidentsSpark,
  },
]
```

Render:

```tsx
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
</div>
```

Data fetching: add queries to the existing supabase calls at the top of the page:

```ts
// 8-day shift counts for sparkline
const eightDaysAgo = new Date()
eightDaysAgo.setDate(eightDaysAgo.getDate() - 7)
eightDaysAgo.setHours(0, 0, 0, 0)
const { data: recentShifts } = await supabase
  .from('shifts')
  .select('start_time, status, clock_in_time, clock_out_time, staff:profiles!staff_id(hourly_rate)')
  .gte('start_time', eightDaysAgo.toISOString())

// Build daily buckets for the 4 sparklines
const days: number[][] = [[], [], [], []] // shifts, hours, revenue, incidents
for (let d = 7; d >= 0; d--) {
  const day = new Date()
  day.setDate(day.getDate() - d)
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999)
  const onDay = (recentShifts ?? []).filter(s => {
    const t = new Date(s.start_time).getTime()
    return t >= dayStart.getTime() && t <= dayEnd.getTime()
  })
  days[0].push(onDay.length)
  let hours = 0, revenue = 0
  onDay.forEach((s: any) => {
    if (s.clock_in_time && s.clock_out_time) {
      const h = (new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / 3600000
      hours += h
      const rate = Array.isArray(s.staff) ? s.staff[0]?.hourly_rate : s.staff?.hourly_rate
      revenue += h * Number(rate ?? 0)
    }
  })
  days[1].push(Math.round(hours))
  days[2].push(Math.round(revenue))
}

const shiftsSpark = days[0]
const hoursSpark = days[1]
const revenueSpark = days[2]

// Incidents sparkline (last 8 days)
const { data: recentIncidents } = await supabase
  .from('incidents')
  .select('reported_at, status')
  .gte('reported_at', eightDaysAgo.toISOString())
const incidentsSpark: number[] = []
for (let d = 7; d >= 0; d--) {
  const day = new Date(); day.setDate(day.getDate() - d)
  const ds = new Date(day); ds.setHours(0, 0, 0, 0)
  const de = new Date(day); de.setHours(23, 59, 59, 999)
  incidentsSpark.push((recentIncidents ?? []).filter(i => {
    const t = new Date(i.reported_at).getTime()
    return t >= ds.getTime() && t <= de.getTime()
  }).length)
}

const shiftsTodayScheduled = days[0][7] // today's bucket
const hoursThisWeek = days[1].reduce((a, b) => a + b, 0)
const ndisRevenue = days[2].reduce((a, b) => a + b, 0)
const openIncidentsCount = (recentIncidents ?? []).filter(i => i.status === 'open').length
const pendingReviewCount = openIncidentsCount
```

- [ ] **Step 4: Verify build + tsc**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/dashboard/Sparkline.tsx components/admin/dashboard/KpiCard.tsx app/admin/dashboard/page.tsx
git commit -m "feat(admin): dashboard KPI cards with sparklines and target bars"
```

---

### Task 11: Live staff map widget on dashboard

**Files:**
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Inspect the existing LiveMap component**

```bash
cat C:/Users/sabbi/vivid_care_web/components/maps/LiveMap.tsx | head -60
```

Note the props it accepts (likely `markers` or similar). Reuse it as-is.

- [ ] **Step 2: Add a dashboard card wrapping LiveMap**

Below the KPI grid in `app/admin/dashboard/page.tsx`, add:

```tsx
import LiveMap from '@/components/maps/LiveMap'
import Link from 'next/link'

// ... inside JSX, after KPI grid:
<section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
  <div className="mb-4 flex items-end justify-between gap-3">
    <div>
      <h3 className="text-[14px] font-semibold text-[#0f172a]">Where staff are now</h3>
      <p className="mt-1 text-[12px] text-[#64748b]">
        {liveCount} on shift · positions update in real time
      </p>
    </div>
    <Link
      href="/admin/active-shifts"
      className="inline-flex items-center gap-1 rounded-full border border-[#e6e8ec] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0f172a] hover:bg-[#f7f8f9]"
    >
      View full board
      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">arrow_forward</span>
    </Link>
  </div>
  <div className="h-[360px] overflow-hidden rounded-[12px]">
    <LiveMap markers={liveMapMarkers} />
  </div>
</section>
```

Build `liveMapMarkers` from existing data (in-progress shifts + their clients):

```ts
const liveShifts = (shifts ?? []).filter(s =>
  s.status === 'active' || (s.clock_in_time && !s.clock_out_time),
)
const liveCount = liveShifts.length

// Marker shape — match what LiveMap currently expects.
// Inspect components/maps/LiveMap.tsx to confirm the exact field names; this is the typical shape:
const liveMapMarkers = liveShifts.flatMap((s: any) => {
  const out: any[] = []
  const client = Array.isArray(s.clients) ? s.clients[0] : s.clients
  if (client?.lat && client?.lng) {
    out.push({
      id: `client-${s.client_id}`,
      lat: client.lat,
      lng: client.lng,
      label: client.full_name ?? 'Client',
      kind: 'client',
    })
  }
  // Staff live location markers come from realtime channel inside LiveMap component
  return out
})
```

**Important:** If LiveMap's prop signature differs, adapt this block to match. Read its existing usage in `app/admin/active-shifts/ActiveShiftsClient.tsx` for reference.

- [ ] **Step 3: Verify build + tsc**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/dashboard/page.tsx
git commit -m "feat(admin): live staff GPS map widget on dashboard"
```

---

### Task 12: Live roster timeline

**Files:**
- Create: `components/admin/dashboard/RosterTimeline.tsx`
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create `components/admin/dashboard/RosterTimeline.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

interface ShiftBlock {
  id: string
  staffId: string
  staffName: string
  clientName: string
  startHour: number // 7 to 18 (24h)
  endHour: number
  color: 'purple' | 'green' | 'blue' | 'amber' | 'red' | 'outline'
  sub: string
  live?: boolean
}

interface StaffRow {
  id: string
  name: string
  role: string
  tone: 'purple' | 'blue' | 'green' | 'amber' | 'peach' | 'warm'
}

interface RosterTimelineProps {
  staff: StaffRow[]
  blocks: ShiftBlock[]
}

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

const BLOCK_PALETTE: Record<ShiftBlock['color'], { bg: string; text: string; border: string }> = {
  purple:  { bg: '#F4ECF8', text: '#54206F', border: '#C9A6DE' },
  green:   { bg: '#F1F9E1', text: '#5E8D1F', border: '#B6D896' },
  blue:    { bg: '#E6F5FC', text: '#1380AB', border: '#9BD7EE' },
  amber:   { bg: '#FEF3D6', text: '#78350F', border: '#FCD9A1' },
  red:     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  outline: { bg: 'transparent', text: '#475569', border: '#e6e8ec' },
}

const AVATAR_TONES: Record<StaffRow['tone'], { bg: string; fg: string }> = {
  purple: { bg: '#F4ECF8', fg: '#54206F' },
  blue:   { bg: '#E6F5FC', fg: '#1380AB' },
  green:  { bg: '#F1F9E1', fg: '#5E8D1F' },
  amber:  { bg: '#FEF3D6', fg: '#78350F' },
  peach:  { bg: '#FFE4E1', fg: '#B0364E' },
  warm:   { bg: '#FCE4D6', fg: '#B85A1C' },
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

export default function RosterTimeline({ staff, blocks }: RosterTimelineProps) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // NOW line position (percent of grid width)
  const nowHour = now.getHours() + now.getMinutes() / 60
  const inRange = nowHour >= HOURS[0] && nowHour <= HOURS[HOURS.length - 1] + 1
  const nowPct = ((nowHour - HOURS[0]) / HOURS.length) * 100

  return (
    <section className="overflow-hidden rounded-[16px] border border-[#e6e8ec] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="flex items-end justify-between gap-3 border-b border-[#f1eef4] px-5 py-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0f172a]">
            Live roster · {now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
          </h3>
          <p className="mt-1 text-[12px] text-[#64748b]">
            {staff.length} workers · {blocks.length} shifts · {blocks.filter(b => b.live).length} in progress
          </p>
        </div>
        <div className="flex rounded-full bg-[#f1eef4] p-1 text-[11px] font-medium">
          <button className="rounded-full bg-[#0f172a] px-3 py-1 text-white">Today</button>
          <button className="rounded-full px-3 py-1 text-[#64748b]">Tomorrow</button>
          <button className="rounded-full px-3 py-1 text-[#64748b]">Week</button>
        </div>
      </header>

      <div className="relative overflow-x-auto">
        {/* Hour header */}
        <div className="grid sticky top-0 z-10 border-b border-[#f1eef4] bg-white" style={{ gridTemplateColumns: '180px repeat(12, minmax(56px, 1fr))' }}>
          <div className="px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
            Worker
          </div>
          {HOURS.map(h => (
            <div key={h} className="border-l border-[#f1eef4] px-2 py-2 text-[10.5px] font-medium text-[#94a3b8]">
              {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="relative">
          {/* NOW line */}
          {inRange && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-20"
              style={{ left: `calc(180px + ${nowPct}% * (100% - 180px) / 100)` }}
            >
              <div className="h-full w-px bg-[#6B2C91]" />
              <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#6B2C91]" />
            </div>
          )}

          {staff.map(row => {
            const tone = AVATAR_TONES[row.tone]
            const rowBlocks = blocks.filter(b => b.staffId === row.id)
            return (
              <div
                key={row.id}
                className="grid border-b border-[#f1eef4]"
                style={{ gridTemplateColumns: '180px repeat(12, minmax(56px, 1fr))' }}
              >
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: tone.bg, color: tone.fg }}
                  >
                    {initials(row.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold text-[#0f172a]">{row.name}</div>
                    <div className="truncate text-[10.5px] text-[#94a3b8]">{row.role}</div>
                  </div>
                </div>

                {/* Hour cells (one per hour, used purely for grid alignment) */}
                {HOURS.map((_, hi) => (
                  <div key={hi} className="border-l border-[#f1eef4]" />
                ))}

                {/* Shift blocks (absolutely positioned on top of the row grid) */}
                {rowBlocks.map(b => {
                  const p = BLOCK_PALETTE[b.color]
                  const startCol = Math.max(0, b.startHour - HOURS[0]) + 1 // +1 for staff label column
                  const span = Math.max(1, Math.round(b.endHour - b.startHour))
                  return (
                    <div
                      key={b.id}
                      className="my-2 flex flex-col justify-center gap-0.5 rounded-[8px] px-2 py-1.5"
                      style={{
                        gridColumn: `${startCol + 1} / span ${span}`, // +1 because hour cols start after worker col
                        backgroundColor: p.bg,
                        border: `1px solid ${p.border}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold leading-none" style={{ color: p.text }}>
                        {b.live && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                        )}
                        <span className="truncate">{b.clientName}</span>
                      </div>
                      <div className="truncate text-[10px] leading-tight" style={{ color: p.text, opacity: 0.75 }}>
                        {b.sub}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add the timeline to the dashboard page**

In `app/admin/dashboard/page.tsx`, below the map widget:

```tsx
import RosterTimeline from '@/components/admin/dashboard/RosterTimeline'

// In data section, build the staff + blocks arrays from today's shifts.
const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
const todayShifts = (shifts ?? []).filter(s => {
  const t = new Date(s.start_time).getTime()
  return t >= todayStart.getTime() && t <= todayEnd.getTime()
})

const staffMap = new Map<string, { id: string; name: string; role: string; tone: any }>()
const toneOptions: Array<'warm' | 'blue' | 'peach' | 'green' | 'amber' | 'purple'> = ['warm', 'blue', 'peach', 'green', 'amber', 'purple']
todayShifts.forEach((s: any, i: number) => {
  if (!s.staff_id) return
  if (!staffMap.has(s.staff_id)) {
    const staffName = Array.isArray(s.staff) ? s.staff[0]?.full_name : s.staff?.full_name
    staffMap.set(s.staff_id, {
      id: s.staff_id,
      name: staffName ?? 'Staff',
      role: 'Support · NDIS',
      tone: toneOptions[staffMap.size % toneOptions.length],
    })
  }
})
const staffRows = Array.from(staffMap.values()).slice(0, 6)

const blocks = todayShifts.map((s: any) => {
  const start = new Date(s.start_time)
  const end = new Date(s.end_time)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const clientName = (Array.isArray(s.clients) ? s.clients[0]?.full_name : s.clients?.full_name) ?? 'Client'
  const isLive = s.status === 'active' || (s.clock_in_time && !s.clock_out_time)
  const isMissed = s.status === 'missed' || (s.status === 'scheduled' && end.getTime() < Date.now())
  return {
    id: s.id,
    staffId: s.staff_id,
    staffName: '',
    clientName,
    startHour,
    endHour,
    color: (isMissed ? 'red' : isLive ? 'green' : 'purple') as any,
    sub: `${start.getHours()}:${String(start.getMinutes()).padStart(2,'0')} – ${end.getHours()}:${String(end.getMinutes()).padStart(2,'0')}`,
    live: isLive,
  }
})

// In JSX:
<RosterTimeline staff={staffRows} blocks={blocks} />
```

- [ ] **Step 3: Verify build + tsc**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/dashboard/RosterTimeline.tsx app/admin/dashboard/page.tsx
git commit -m "feat(admin): live roster timeline grid with NOW line"
```

---

### Task 13: Side widgets row (donut + compliance + activity feed + team status)

**Files:**
- Create: `components/admin/dashboard/ClientMixDonut.tsx`
- Create: `components/admin/dashboard/ComplianceWidget.tsx`
- Create: `components/admin/dashboard/ActivityFeed.tsx`
- Create: `components/admin/dashboard/TeamStatusPanel.tsx`
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create `components/admin/dashboard/ClientMixDonut.tsx`**

```tsx
interface ClientMixDonutProps {
  ndis: number
  standard: number
}

export default function ClientMixDonut({ ndis, standard }: ClientMixDonutProps) {
  const total = ndis + standard
  const ndisPct = total > 0 ? (ndis / total) * 100 : 0

  // SVG donut math
  const r = 42
  const c = 2 * Math.PI * r
  const ndisStroke = (ndisPct / 100) * c

  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <h3 className="text-[14px] font-semibold text-[#0f172a]">Client mix</h3>
      <p className="mt-1 text-[12px] text-[#64748b]">NDIS vs standard</p>
      <div className="mt-4 flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="h-[110px] w-[110px] -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1eef4" strokeWidth="14" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#1380AB"
            strokeWidth="14"
            strokeDasharray={`${ndisStroke} ${c}`}
            strokeLinecap="butt"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 50 50)"
            style={{ fontFamily: 'IBM Plex Sans', fontSize: 18, fontWeight: 600, fill: '#0f172a' }}
          >
            {total}
          </text>
        </svg>
        <div className="flex-1 space-y-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#1380AB]" />
            <span className="flex-1 text-[#0f172a]">NDIS Clients</span>
            <span className="font-semibold text-[#0f172a]">{ndis}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#94a3b8]" />
            <span className="flex-1 text-[#0f172a]">Standard</span>
            <span className="font-semibold text-[#0f172a]">{standard}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create `components/admin/dashboard/ComplianceWidget.tsx`**

```tsx
import Link from 'next/link'

interface ExpiringDoc {
  id: string
  docType: string
  ownerName: string
  daysLeft: number
}

interface ComplianceWidgetProps {
  docs: ExpiringDoc[]
  totalCount: number
}

export default function ComplianceWidget({ docs, totalCount }: ComplianceWidgetProps) {
  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0f172a]">Expiring credentials</h3>
          <p className="mt-1 text-[12px] text-[#64748b]">{totalCount} in next 30 days</p>
        </div>
        <Link href="/admin/compliance" className="text-[11.5px] font-semibold text-[#6B2C91]">
          View all
        </Link>
      </div>
      {docs.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#94a3b8]">No documents expiring soon.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {docs.slice(0, 5).map(d => {
            const tone = d.daysLeft < 7 ? '#DC2626' : d.daysLeft < 30 ? '#D97706' : '#5E8D1F'
            return (
              <li key={d.id} className="flex items-center gap-2 text-[12px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                <span className="flex-1 truncate font-medium text-[#0f172a]">{d.docType}</span>
                <span className="truncate text-[#64748b]">{d.ownerName}</span>
                <span className="shrink-0 font-semibold" style={{ color: tone }}>
                  {d.daysLeft}d
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 2b: Create `components/admin/dashboard/ActivityFeed.tsx`**

```tsx
import Link from 'next/link'

interface ActivityRow {
  id: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  time: string
  href?: string
}

interface ActivityFeedProps {
  items: ActivityRow[]
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-end justify-between">
        <h3 className="text-[14px] font-semibold text-[#0f172a]">Recent activity</h3>
        <Link href="/admin/notifications" className="text-[11.5px] font-semibold text-[#6B2C91]">
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#94a3b8]">No recent activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.slice(0, 5).map(it => {
            const Inner = (
              <>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: it.iconBg, color: it.iconColor }}
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{it.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-[#0f172a]">{it.title}</div>
                  <div className="text-[10.5px] text-[#94a3b8]">{it.time}</div>
                </div>
              </>
            )
            return (
              <li key={it.id}>
                {it.href ? (
                  <Link href={it.href} className="flex items-center gap-2.5 rounded-[10px] py-1 hover:bg-[#f7f8f9]">
                    {Inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 py-1">{Inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Create `components/admin/dashboard/TeamStatusPanel.tsx`**

```tsx
interface TeamMember {
  id: string
  name: string
  detail: string
  status: 'on_shift' | 'en_route' | 'on_break' | 'available' | 'off'
}

interface TeamStatusPanelProps {
  members: TeamMember[]
}

const STATUS_LABELS: Record<TeamMember['status'], string> = {
  on_shift: 'On shift',
  en_route: 'En route',
  on_break: 'On break',
  available: 'Available',
  off: 'Off',
}

const STATUS_STYLES: Record<TeamMember['status'], { bg: string; text: string; dot?: string }> = {
  on_shift:  { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  en_route:  { bg: '#FEF3D6', text: '#78350F' },
  on_break:  { bg: '#F1EEF4', text: '#475569' },
  available: { bg: '#E6F5FC', text: '#1380AB' },
  off:       { bg: '#F1EEF4', text: '#94a3b8' },
}

export default function TeamStatusPanel({ members }: TeamStatusPanelProps) {
  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-end justify-between">
        <h3 className="text-[14px] font-semibold text-[#0f172a]">Team status now</h3>
        <p className="text-[11.5px] text-[#64748b]">{members.length} workers</p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {members.slice(0, 6).map(m => {
          const s = STATUS_STYLES[m.status]
          return (
            <li key={m.id} className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1eef4] text-[10px] font-semibold uppercase text-[#475569]">
                {m.name.split(' ').filter(Boolean).slice(0,2).map(p => p[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium text-[#0f172a]">{m.name}</div>
                <div className="truncate text-[10.5px] text-[#94a3b8]">{m.detail}</div>
              </div>
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                style={{ backgroundColor: s.bg, color: s.text }}
              >
                {s.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />}
                {STATUS_LABELS[m.status]}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: Wire all three into dashboard page**

In `app/admin/dashboard/page.tsx`, add the queries:

```ts
// Client mix
const { data: clientsCounts } = await supabase
  .from('clients')
  .select('client_type')
const ndisCount = (clientsCounts ?? []).filter(c => c.client_type === 'ndis').length
const standardCount = (clientsCounts ?? []).filter(c => c.client_type === 'standard').length

// Expiring docs (next 30 days)
const thirtyDaysOut = new Date(); thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)
const { data: expiring } = await supabase
  .from('documents')
  .select('id, doc_type, expiry_date, owner_id, owner_type')
  .not('expiry_date', 'is', null)
  .lte('expiry_date', thirtyDaysOut.toISOString().split('T')[0])
  .gte('expiry_date', new Date().toISOString().split('T')[0])
  .order('expiry_date', { ascending: true })
  .limit(20)

// Resolve owner names (one batch query per owner_type)
const staffIds = (expiring ?? []).filter(d => d.owner_type === 'staff').map(d => d.owner_id)
const clientIds = (expiring ?? []).filter(d => d.owner_type === 'client').map(d => d.owner_id)
const [staffNamesRes, clientNamesRes] = await Promise.all([
  staffIds.length ? supabase.from('profiles').select('id, full_name').in('id', staffIds) : Promise.resolve({ data: [] }),
  clientIds.length ? supabase.from('clients').select('id, full_name').in('id', clientIds) : Promise.resolve({ data: [] }),
])
const nameMap = new Map<string, string>()
;(staffNamesRes.data ?? []).forEach((r: any) => nameMap.set(r.id, r.full_name))
;(clientNamesRes.data ?? []).forEach((r: any) => nameMap.set(r.id, r.full_name))

const expiringDocs = (expiring ?? []).map(d => {
  const daysLeft = Math.max(0, Math.round((new Date(d.expiry_date).getTime() - Date.now()) / 86_400_000))
  return {
    id: d.id,
    docType: d.doc_type,
    ownerName: nameMap.get(d.owner_id) ?? 'Unknown',
    daysLeft,
  }
})

// Team status — derived from staff profiles + their current shift state.
const { data: allStaff } = await supabase
  .from('profiles')
  .select('id, full_name')
  .eq('role', 'staff')
  .order('full_name')
const teamMembers = (allStaff ?? []).map((p: any) => {
  const currentShift = (shifts ?? []).find((s: any) =>
    s.staff_id === p.id && (s.status === 'active' || (s.clock_in_time && !s.clock_out_time))
  )
  const nextShift = (shifts ?? []).find((s: any) =>
    s.staff_id === p.id && s.status === 'scheduled' && new Date(s.start_time).getTime() > Date.now()
  )
  let status: 'on_shift' | 'en_route' | 'on_break' | 'available' | 'off' = 'off'
  let detail = 'Off today'
  if (currentShift) {
    status = 'on_shift'
    const clientName = Array.isArray(currentShift.clients) ? currentShift.clients[0]?.full_name : currentShift.clients?.full_name
    detail = `Support · ${clientName ?? 'client'}`
  } else if (nextShift) {
    const next = new Date(nextShift.start_time)
    status = 'available'
    detail = `Available · next ${next.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: false })}`
  }
  return {
    id: p.id,
    name: p.full_name ?? 'Staff',
    detail,
    status,
  }
})
```

Add the activity feed query (recent notifications):

```ts
const { data: recentNotifs } = await supabase
  .from('notifications')
  .select('id, type, title, created_at')
  .order('created_at', { ascending: false })
  .limit(8)

const ICON_MAP: Record<string, { icon: string; bg: string; color: string }> = {
  clock_in:    { icon: 'login',          bg: '#F1F9E1', color: '#5E8D1F' },
  clock_out:   { icon: 'logout',         bg: '#F1EEF4', color: '#475569' },
  incident:    { icon: 'warning',        bg: '#FEF3D6', color: '#78350F' },
  doc_expiry:  { icon: 'description',    bg: '#FEE2E2', color: '#991B1B' },
  roster:      { icon: 'calendar_month', bg: '#F4ECF8', color: '#54206F' },
  default:     { icon: 'notifications',  bg: '#F1EEF4', color: '#475569' },
}

const activityItems = (recentNotifs ?? []).map((n: any) => {
  const meta = ICON_MAP[n.type] ?? ICON_MAP.default
  const date = new Date(n.created_at)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  const time = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : mins > 0 ? `${mins}m ago` : 'just now'
  return {
    id: n.id,
    icon: meta.icon,
    iconBg: meta.bg,
    iconColor: meta.color,
    title: n.title,
    time,
  }
})
```

Render the row (4 widgets in a 2×2 grid on large screens, 1 column on mobile):

```tsx
import ClientMixDonut from '@/components/admin/dashboard/ClientMixDonut'
import ComplianceWidget from '@/components/admin/dashboard/ComplianceWidget'
import ActivityFeed from '@/components/admin/dashboard/ActivityFeed'
import TeamStatusPanel from '@/components/admin/dashboard/TeamStatusPanel'

// In JSX below RosterTimeline:
<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
  <ClientMixDonut ndis={ndisCount} standard={standardCount} />
  <ComplianceWidget docs={expiringDocs} totalCount={(expiring ?? []).length} />
  <ActivityFeed items={activityItems} />
  <TeamStatusPanel members={teamMembers} />
</div>
```

- [ ] **Step 5: Verify build + tsc**

```bash
cd C:/Users/sabbi/vivid_care_web && npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/dashboard/ClientMixDonut.tsx components/admin/dashboard/ComplianceWidget.tsx components/admin/dashboard/ActivityFeed.tsx components/admin/dashboard/TeamStatusPanel.tsx app/admin/dashboard/page.tsx
git commit -m "feat(admin): dashboard side widgets (donut, compliance, activity, team status)"
```

**🛑 GROUP C STOP POINT.** Open the admin dashboard — header + alert + KPIs + live map + roster timeline + 3 side widgets should all be present and rendering live data. Verify with user.

---

## Final verification

- [ ] **Step 1: Full build + lint pass**

```bash
cd C:/Users/sabbi/vivid_care_web
npx tsc --noEmit
npm run build
npm run lint
```
All three: exit 0.

- [ ] **Step 2: Smoke check across all admin pages**

Open the running app and visit each in turn — confirm purple branding throughout, no broken styling:
- /admin/dashboard
- /admin/roster
- /admin/shifts
- /admin/active-shifts (live map page — should still work)
- /admin/clients
- /admin/staff
- /admin/compliance
- /admin/agreements
- /admin/incidents
- /admin/payments
- /admin/notifications
- /admin/settings

Open Vivi (⌘/) from any page, ask a question, confirm a response.

- [ ] **Step 3: Final commit if any cleanup needed**

If lint flagged anything: fix it and commit as `style: post-reskin lint cleanup`.

---

## Done

The admin app should now visually match the Claude Design bundle: purple brand, IBM Plex Sans, new sidebar with org switcher, glassmorphism topbar with Vivi trigger, slide-in Vivi drawer, and a rebuilt dashboard with header + alert + KPIs + live map + roster timeline + 3 side widgets.

Out of scope (separate later projects): mobile NDIS client tabs, mobile app Supabase wiring, dashboard time-range filter behaviour, quick-add menu behaviour.
