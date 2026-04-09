# UI Polish — Design Spec
**Date:** 2026-04-09  
**Scope:** Icon fix + logo + animations on 3 key surfaces (sidebar, dashboard, login)

---

## Context

The app is functionally complete but the UI appears broken because Material Symbols icons render as plain text (e.g. "medical_services", "location_off"). Additionally, the UI lacks polish, animations, and a warm logo appropriate for a disability/aged care platform.

## Goals

1. Fix icon rendering bug
2. Add icon + text logo with a warm, professional feel
3. Add gentle entrance animations and hover polish to dashboard cards
4. Polish the login page with animations and the new logo

## Out of Scope

All pages other than sidebar/nav, dashboard cards, and login page.

---

## Section 1 — Icon Fix

**Problem:** `globals.css` loads Material Symbols via `@import url(...)` which browsers deprioritize.  
**Fix:** Remove the `@import` from `globals.css` and add `<link>` tags directly to `app/layout.tsx`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
```

**Files:** `app/layout.tsx`, `app/globals.css`

---

## Section 2 — Logo

Replace the existing `clinical_notes` icon in the sidebar and login page with:

- Rounded square container with existing blue primary gradient (`#00446f → #225c8a`)
- `favorite` icon (filled, white) inside — conveys warmth and care
- "Vivid Care" in bold Manrope font, white
- "Clinical Atelier" tagline in small caps, semi-transparent white

**Files:** `components/admin/AdminSidebar.tsx`, `app/login/page.tsx`

---

## Section 3 — Dashboard Card Animations

Apply to the 4 stat cards in `app/admin/dashboard/page.tsx`:

- **Entrance:** fade + slide-up, staggered delays (0ms, 75ms, 150ms, 225ms)
- **Hover:** `translateY(-2px)` lift + soft box shadow, 200ms ease transition
- **Subtle border:** `1px solid` using `surface-container-high` token
- **Icon containers:** slightly larger, softer pill shape

**Files:** `app/admin/dashboard/page.tsx`, `app/globals.css` (animation keyframes)

---

## Section 4 — Login Page Polish

- **Background:** soft gradient wash (surface → light blue tint) replacing flat white
- **Card:** fade-in + slide-up on load
- **Logo:** new heart icon + wordmark centered above form
- **Input focus:** smooth bottom-border color transition
- **Button hover:** `scale(1.01)` + shadow transition
- **Error shake:** horizontal shake keyframe animation on invalid login

**Files:** `app/login/page.tsx`, `app/globals.css` (shake keyframe)

---

## Animation Keyframes to Add (globals.css)

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
```

---

## Verification

1. Icons render correctly on all pages (no raw text like "location_off")
2. Sidebar shows heart icon + "Vivid Care" wordmark
3. Login page shows new logo, card animates in, error shakes
4. Dashboard cards stagger in on load, lift on hover
5. No layout regressions on other admin pages
