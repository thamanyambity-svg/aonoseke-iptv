# AXIS 3: UX & Product — User Experience & Interface Design

## Executive Summary

**Plateforme**: Web (SPA), mobile-responsive, PWA installable  
**Design**: Glassmorphism, dark mode, moderne  
**Persona principal**: Mobile-first TV viewer (francophone RDC/Africa)  
**État UX**: **3.5/5 — Intuitif mais friction importante à certains points.**

---

## 1. Core User Journeys

### Journey 1: Discover → Watch → Favorite

```
1. Landing page
   ↓ [Sign up / Demo]
2. Browse channels
   ├─ Search (debounced 220ms)
   ├─ Filter by Country
   ├─ Filter by Category
   └─ Virtual scroll (2000+ channels)
   ↓ [Select channel]
3. Player loads
   ├─ HLS adaptive bitrate
   ├─ Fullscreen, pause, volume
   └─ [Star to favorite]
   ↓ [Back to list]
4. End
```

**Friction points detected**:
- ❌ **No preview before play**: User can't see what's on without loading stream
- ❌ **Slow channel switch**: Each new channel = new HLS fetch + manifest parse (2-3s)
- ⚠️ **Dead channels**: If channel fails, filters it but no feedback ("Oops, this is down")

### Journey 2: Premium Upgrade

```
1. Free trial 30 days
   ↓ [Day 31]
2. Paywall modal appears
   ├─ "Unlock verified directory"
   ├─ Benefits list
   └─ Price: 2.5k CDF / month
   ↓ [S'abonner]
3. Flutterwave checkout
   ├─ Mobile Money (M-Pesa, Orange, Airtel)
   ├─ Or credit card
   └─ [Pay]
   ↓ [Success]
4. Premium unlocked locally (localStorage!)
   ↓ [No ads]
5. End
```

**Friction points**:
- ❌ **Flutterwave checkout external**: Leaves app, kills immersion
- ❌ **No order confirmation**: After payment, how does user know it succeeded?
- ❌ **Premium status client-side**: User could set localStorage directly (security flaw)

### Journey 3: Favorites Management

```
1. While watching → [Star icon]
2. Favorites saved to localStorage
3. "Favorites" tab shows starred channels
4. Can unstar anytime
```

**Strengths**:
- ✅ Instant feedback (star changes color)
- ✅ Persistent across sessions
- ✅ Works offline (PWA + localStorage)

**Gaps**:
- ⚠️ No sync across devices (localStorage is per-device)
- ⚠️ Favorites lost if localStorage cleared

### Journey 4: Admin Dashboard

```
1. Admin login
   ↓ [Profile role = admin]
2. Dashboard loads
   ├─ Real-time stats (users, engagement, geo)
   ├─ Heatmap of activity
   ├─ Recent users list
   └─ Content affinity
   ↓ [Export / Refresh]
3. End
```

**Friction**:
- ⚠️ **RPC calls unoptimized**: 9 parallel RPCs on load (AdminDashboard.tsx ~120)
- ⚠️ **No drill-down**: Can't click on country to see specific user breakdown
- ❌ **No dead channel alerting**: Admin can't see which channels are failing

---

## 2. Information Architecture

### Navigational Structure

```
App Root
├─ Landing (Auth page)
│  ├─ Sign up
│  ├─ Sign in
│  ├─ Social login
│  └─ Demo mode
├─ Main App
│  ├─ Sidebar
│  │  ├─ Tabs: All | Favorites | Directory
│  │  ├─ Filters: Country | Category
│  │  ├─ Search
│  │  └─ Profile (dropdown)
│  ├─ Main content
│  │  ├─ Channel list (virtual scroll)
│  │  └─ Currently selected channel
│  ├─ Player (full video)
│  │  ├─ Fullscreen controls
│  │  ├─ Error handling
│  │  └─ Loading indicator
│  ├─ Paywall (conditional)
│  │  └─ Upgrade CTA
│  ├─ Admin Dashboard (role = admin)
│  │  ├─ Stats cards
│  │  ├─ Geo heatmap
│  │  └─ Recent users
│  └─ Pre-roll Ad (before channel)
│
└─ Static Pages
   ├─ Privacy policy (/privacy.html)
   └─ Terms (/terms.html)
```

**IA Quality**:
- ✅ Logical grouping (filters together, player separate)
- ✅ Prominent CTA (play button, favorite star)
- ⚠️ Admin dashboard hidden (no visible link from main app for non-admins)
- ❌ "Directory" tab not clear — is it different from All/Favorites?

### Finding
**Structure clair pour TV Lover, mais confus pour Import Buyer (pas d'UX dédiée).**

---

## 3. Design System & Consistency

### Visual Language

#### Color Palette (CSS variables in App.css)
```css
--void: #0a0a0a        (black background)
--text-1: #e8e8e8      (primary text)
--text-2: #a8a8a8      (secondary)
--text-3: #6a6a6a      (tertiary)
--accent: #c9a84c      (gold/lime highlight)
--surface-1/2/3/4: Gray steps for layers
--red: #ff6b7a         (error)
--green: #81c784        (success)
```

#### Typography
- **Display**: Custom mono for headings (strong, uppercase)
- **Body**: System sans-serif, readable
- **Icons**: Lucide React (consistent across app)

#### Components
- **Buttons**: Consistent styling (lime background for CTA)
- **Cards**: Glassmorphism (semi-transparent bg, blur)
- **Modals**: Paywall, Admin Dashboard (overlay with close button)

#### ✅ Strengths
- **Dark mode**: Excellent for video-watching (eye comfort)
- **Spacing**: Consistent padding/margins
- **Focus states**: Buttons have :focus visual feedback

#### ⚠️ Gaps
- **No design tokens file**: Variables scattered in CSS
- **No storybook**: Components not showcased
- **Inconsistent icon sizes**: Some 14px, some 16px, some 24px
- **No hover states on all interactive**: Some buttons missing :hover

### Finding
**Design consistent but informal. Needs design system documentation.**

---

## 4. Accessibility (WCAG 2.1 AA)

### ✅ Implemented
1. **Semantic HTML**: `<button>`, `<form>`, `<section>` used correctly
2. **ARIA labels**: Visible on close buttons, nav items
3. **Keyboard nav**: Tab order maintained, focus visible
4. **Color contrast**: Dark bg + light text meets AA minimum
5. **Form labels**: All inputs properly labeled with `<label>`
6. **Alt text**: Images have alt or aria-hidden
7. **Error messages**: Clear and actionable (Landing.tsx error handling)

### ⚠️ Gaps (Level A/AA failures)
1. **No skip-to-content link**: Always have to tab through nav
2. **Focusable divs not keyboard-accessible**: `.error-banner` is div with click, should be button
3. **Focus indicator weak**: Hard to see on dark backgrounds
4. **No ARIA live regions**: Dynamic updates (error messages) not announced to screen readers
5. **Video player accessibility**: HLS.js doesn't expose captions/subtitles (no keyboard control documented)
6. **Form validation**: Errors appear but not announced to assistive tech
7. **Admin dashboard**: Complex table not accessible (custom rendering)

### Testing Needed
- [ ] WAVE or Axe automated scan
- [ ] Screen reader test (NVDA, JAWS)
- [ ] Keyboard-only navigation full app
- [ ] Zoom to 200% test
- [ ] Color blindness simulation (Coblis)

### Finding
**Accessibility basics good, but gaps at AA level. Needs audit + fixes.**

---

## 5. Mobile Experience

### Viewport Coverage
- ✅ Responsive design (breakpoints in CSS)
- ✅ Touch-friendly buttons (min 44px tap target)
- ✅ Mobile Money payment (Flutterwave SMS-based)
- ✅ PWA installable ("Add to home screen")

### Mobile Friction
1. **Sidebar on mobile**: Takes up half screen in portrait
   - ⚠️ Hamburger menu not visible (no visible toggle)
   - Behavior on small screens not tested

2. **Search box**: Small on mobile
   - Keyboard opens, covers content

3. **Channel list scrolling**: Virtual scroll works
   - But lazy-load images might cause layout shift

4. **Player controls**: Tiny on phone
   - Play/pause/fullscreen buttons hard to hit

### Finding
**Mobile responsive but not mobile-optimized. Needs device testing.**

---

## 6. Usability Testing Insights (Inferred from Design)

### Strengths (Implied by design choices)
1. **Fast search**: Debounce prevents lag
2. **Visual hierarchy**: Player large, controls smaller
3. **Color coding**: Country flags + category labels clear
4. **Feedback**: Loading spinner, error banners explicit

### Assumptions (Unvalidated)
- ⚠️ Users can find channels quickly (Search vs. Browse trade-off not tested)
- ⚠️ Paywall timing (Day 31) feels fair
- ⚠️ Premium price (2.5k CDF) perceived as affordable
- ⚠️ Users understand "Directory" vs. "All"

### Finding
**No usability research data. Entire UX based on assumption.**

---

## 7. Friction Point Map

### High Friction (Blocks usage)

| Scenario | Issue | Impact | Effort Fix |
|----------|-------|--------|------------|
| **Find specific channel** | Country filter requires scroll in list | Med (50ms) | S |
| **Switch channels fast** | Each load ~2-3s HLS | High | M |
| **Watch on day 31** | Paywall pops up unexpectedly | High | M |
| **Pay with Mobile Money** | Checkout is external (leaves app) | High | L |
| **Watch Premium** | Premium status in localStorage | High (security) | M |

### Medium Friction

| Scenario | Issue | Impact | Effort Fix |
|----------|-------|--------|------------|
| **Favorite sync** | No cross-device sync | Med | M |
| **Admin insights** | Can't drill-down on geo data | Med | M |
| **Dead channel** | User gets error, no hint to retry | Low-Med | S |

---

## 8. Feature Completeness

### MVP Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Browse channels** | ✅ Live | 2000+ channels, filters |
| **Search** | ✅ Live | Debounced, across name/group/country |
| **Favorites** | ✅ Live | localStorage, no sync |
| **Play stream** | ✅ Live | HLS.js, adaptive bitrate |
| **Fullscreen** | ✅ Live | Native browser fullscreen |
| **Dark theme** | ✅ Live | Glassmorphism design |
| **PWA install** | ✅ Live | Offline support, service worker |

### Premium Features (Roadmap)

| Feature | Status | Notes |
|---------|--------|-------|
| **Verified sources** | ❌ Not implemented | Paywall gates it but feature incomplete |
| **Ad-free** | ✅ Logic in place | `adsHidden` flag, ads config in JSON |
| **Device sync** | ❌ Not implemented | Favorites could sync to Supabase profiles |
| **Parental controls** | ❌ Not planned | Age range collected but unused |
| **Import integration** | ❌ Not implemented | **CRITICAL for funnel** |

---

## 9. Ad Strategy

### Current Implementation

#### Pre-roll ads (PreRollAd.tsx)
```typescript
interface PrerollAd {
  id: string;
  title: string;
  subtitle?: string;
  cta?: string;
  url?: string;
  variant?: 'souverain' | 'corridor';
  emblem?: boolean;
}
```

- ✅ JSON config-based
- ✅ Skippable after 5s
- ✅ Max 12s duration, frequency 1 per 3 plays
- ❌ **Not integrated with import platform**
  - CTAs are generic, no "Importer des produits" link

#### Banner ads (BannerAd.tsx)
- ✅ Configurable images + links
- ❌ **No analytics on clicks**
  - `trackEvent('ad_click')` called but not validated in Supabase

### Finding
**Ad infrastructure present but not utilized for funnel. Missing: click attribution → import signup.**

---

## 10. Content & Copy

### Messaging Quality

#### ✅ Clear
- "Essai gratuit terminé" → upgrade CTA
- Channel names, groups clear
- Error messages actionable

#### ⚠️ Gaps
- **No guidance on premium value**: Paywall lists perks but why verify all 2000 sources?
- **No onboarding**: First-time user doesn't know what to do
- **No contextual help**: Hover states don't explain features

### Localization
- ✅ French interface (labels, placeholders, errors)
- ✅ Country names localized (France, Belgique, RDC...)
- ✅ Dates/times in fr-FR locale
- ⚠️ Only French — no switch for English

---

## Évaluation Axis 3: UX & Product

### Grille (1-5)

| Dimension | Score | Justification |
|-----------|-------|---|
| **Information Architecture** | 3 | Logical but hidden complexity (Directory tab unclear) |
| **Design Consistency** | 4 | Strong visual language, but informal system |
| **Accessibility** | 2 | Basics OK, fails WCAG AA on live regions, focus mgmt |
| **Mobile UX** | 2 | Responsive but not optimized; hamburger unclear |
| **Usability** | 3 | Intuitive for TV Lover, but zero user research |
| **Feature completeness** | 2 | MVP good, Premium incomplete, Import missing |
| **Ad integration** | 1 | Infrastructure ready but not connected to funnel |

**OVERALL**: **2.6/5 — Looks good, but UX gaps on accessibility + mobile + funnel integration**

---

## Recommandations Axis 3

### Immédiat (Semaines 1-2)
1. 📱 **Add hamburger menu on mobile**
   - Toggle sidebar visibility
   - Effort: 1 day

2. ♿ **WCAG audit** with Axe DevTools
   - Document failures
   - Effort: 1 day

3. 🎯 **Clarify "Directory" tab**
   - Rename or explain in UI
   - Effort: 2 hours

### Court Terme (Mois 1)
1. 🔗 **Connect ads to import funnel**
   - Preroll CTA → import landing
   - Track clicks with UTM params
   - Effort: 3-5 days

2. ♿ **Fix critical a11y issues**
   - Add skip-to-content link
   - ARIA live regions for errors
   - Improve focus indicator
   - Effort: 1 week

3. 🧪 **Usability testing** (5-10 users)
   - Test channel discovery
   - Watch paywall reaction
   - Mobile experience
   - Effort: 1 week (recruit + analyze)

### Moyen Terme (Mois 2-3)
1. 📖 **Create onboarding flow**
   - First-time user walkthrough
   - Explain search vs. browse
   - Effort: 1 week

2. 🎨 **Formalize design system**
   - Document components (Storybook)
   - Create token file
   - Effort: 1-2 weeks

3. 📱 **Mobile optimization sprint**
   - Hamburger → responsive drawer
   - Touch targets audit
   - Vertical video player (Portrait mode)
   - Effort: 1-2 weeks

4. 🔄 **Sync favorites to Supabase**
   - Cross-device persistence
   - Effort: 1 week

---

## Conclusion Axis 3

**État**: **2.6/5 — Visually strong, but UX depth lacking**

**Enjeu principal**: 
- ✅ TV Lover experience is solid (search, watch, favorite)
- ❌ Accessibility gaps prevent some users from using app
- ❌ **Mobile experience not optimized** (hamburger missing, tiny buttons)
- ❌ **No integration to import funnel** (ads sit unused)
- ❌ **Zero user research** (all assumptions)

**Action clé**: Audit accessibility, optimize mobile, connect ads to import funnel before major launch.

---

*Fin Axis 3 — Ready for Axis 4: Sentiment d'équipe*
