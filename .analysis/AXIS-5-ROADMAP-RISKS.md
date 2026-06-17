# AXIS 5: Roadmap & Risques — Priorités, Dépendances, Stratégie

## Executive Summary

**Horizon**: 3 months (weeks 1-13)  
**Goal**: Transform player from standalone app to **acquisition funnel** for import platform  
**Mode**: MVP → Production-ready → Revenue-generating  

---

## 1. Current State → Desired State

### Today (Status quo)
```
✅ Player works: Users stream, search, favorite channels
❌ No revenue connection: Ads exist but don't convert to import signups
❌ No tests: Deployment risk is high
❌ Security gaps: Premium is localStorage-hackable
❌ No metrics: Can't measure if funnel works
```

### In 3 Months (Goal)
```
✅ Player works + converts: Ads link to import landing page
✅ Revenue measured: Tracking from player click → import signup → deposit
✅ Production-ready: Tests + security fixes deployed
✅ Team structure: Clear roles, capacity for iteration
✅ North Star visible: Weekly dashboard shows conversion funnel
```

---

## 2. Priority Matrix (Importance × Urgency)

### TIER 1: BLOCKER (Do Now — Weeks 1-2)

#### 1.1 🔒 Security: Move Premium to Supabase
- **Why**: Current localStorage hack is exploitable
- **What**: Create `subscriptions` table + RLS + webhook for Flutterwave
- **Owner**: Backend/Full-stack dev (3-4 days)
- **Depends on**: Flutterwave webhook config
- **Success metric**: Premium status read-only from client, validated server-side

#### 1.2 🔗 Ecosystem: Create Import Bridge
- **Why**: Funnel incomplete (player → nowhere)
- **What**: 
  - Integrate CTAs in ads + menu ("Importer des produits")
  - Link to import platform with UTM tracking
  - Capture: which channel/region user came from
- **Owner**: Frontend dev (2-3 days)
- **Depends on**: Import platform live + Supabase UTM tracking
- **Success metric**: 10+ import signups traced back to player in week 1

#### 1.3 🧪 Testing: Create Safety Net
- **Why**: Current 2% coverage means any change breaks something unseen
- **What**: 
  - Add critical path tests (useAuth, Player, Paywall)
  - Setup CI/CD (run tests on every commit)
  - Minimum: 40% coverage
- **Owner**: QA/Test engineer (1-2 weeks)
- **Depends on**: Vitest already configured
- **Success metric**: All critical tests green, 40% line coverage

#### 1.4 📊 Analytics: Instrument Funnel
- **Why**: Can't measure if conversion working
- **What**:
  - Track: player view → ad click → import signup → payment → delivery
  - Create Supabase dashboard with KPIs
  - Weekly reporting template
- **Owner**: Analytics engineer or dev (1 week)
- **Depends on**: Supabase RPC functions + tracking pixel
- **Success metric**: Weekly report shows 5+ conversions

---

### TIER 2: HIGH VALUE (Weeks 3-5)

#### 2.1 ♿ Accessibility Audit & Fixes
- **Why**: WCAG gaps prevent some users using app
- **What**: 
  - Run Axe scan, fix failures
  - Add skip-to-content link
  - ARIA live regions for dynamic updates
  - Test with screen reader
- **Owner**: Frontend/QA (3-4 days)
- **Success metric**: 0 Axe violations (level A+AA)

#### 2.2 📱 Mobile Optimization
- **Why**: 50%+ traffic likely mobile but UX weak
- **What**:
  - Add hamburger menu (responsive drawer)
  - Test touch interactions (44px minimum)
  - Vertical video player for portrait mode
  - Performance optimization (images, lazy load)
- **Owner**: Frontend dev (1 week)
- **Success metric**: 90+ Lighthouse score on mobile, <3s FCP

#### 2.3 🧠 User Onboarding
- **Why**: First-time users don't know where to start
- **What**:
  - Welcome screen: "Search for channels, or browse by country"
  - Tooltip: Explain favorites, trial benefits
  - Progressive disclosure (hide admin until role = admin)
- **Owner**: Product + Frontend (3-4 days)
- **Success metric**: 50% of new users watch a channel within 2 min

---

### TIER 3: NICE-TO-HAVE (Weeks 6-13, if capacity)

#### 3.1 🎨 Design System Formalization
- Storybook documentation
- Token file (colors, spacing, typography)
- Component showcase

#### 3.2 🔄 Favorites Cross-Device Sync
- Migrate to Supabase profiles table
- Real-time sync across tabs

#### 3.3 📈 Admin Dashboard Drill-Down
- Geo heatmap → click to see user breakdown
- Engagement curves (DAU, WAU, MAU)

#### 3.4 🤖 Dead Channel Auto-Recovery
- Retry failed channels daily
- Notify admin of systematic failures

---

## 3. Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│                    CRITICAL PATH                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Premium → Supabase (Security fix)                       │
│     ↓                                                        │
│  2. Import Bridge (Ecosystem link)                          │
│     ├─ Depends: Import platform live                        │
│     ├─ Depends: Supabase UTM tracking                       │
│     ↓                                                        │
│  3. Analytics Dashboard (Measure conversion)                │
│     ├─ Depends: Tracking pixel working                      │
│     ├─ Depends: Supabase RPC functions                      │
│     ↓                                                        │
│  4. Tests (Prevent regressions)                             │
│     ├─ Depends: Critical paths identified                   │
│     ├─ Depends: CI/CD configured                            │
│     ↓                                                        │
│  5. Deploy (Production ready)                               │
│     ├─ Depends: All Tier 1 complete                         │
│     ├─ Depends: Tests green                                 │
│     ├─ Depends: Staging verification                        │
│     ↓                                                        │
│  6. Monitor & Iterate (Weekly reviews)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### External Dependencies

| Dependency | Owner | Status | Risk |
|-----------|-------|--------|------|
| **Import platform live** | Import team | ⚠️ TBD | HIGH |
| **Flutterwave webhook** | Payment team | ⚠️ TBD | HIGH |
| **Supabase RPC defs** | Backend | ⚠️ Partial | MED |
| **Tracking pixel** | Analytics | ⚠️ TBD | MED |
| **Staging environment** | DevOps | ⚠️ Vercel preview | LOW |

---

## 4. Risk Register

### 🚨 CRITICAL RISKS (Impact: High, Probability: Med-High)

#### R1: Funnel Never Connects
- **Description**: Import bridge built but users don't click or convert
- **Probability**: 40%
- **Impact**: Revenue target (North Star) completely missed
- **Mitigation**:
  - A/B test ad copy + placement (weeks 2-3)
  - Weekly conversion review (measure every step)
  - User interviews (why don't people convert?)
  - Fallback: Adjust pricing or offer

#### R2: Security Breach (Premium Exploit)
- **Description**: Attacker discovers localStorage hack, mass-upgrades without paying
- **Probability**: 60% (if exposed; 10% if not found during dev)
- **Impact**: Revenue loss, reputation damage, legal liability
- **Mitigation**:
  - Move to Supabase IMMEDIATELY (week 1)
  - Audit past logs for exploit evidence
  - Communicate security fix to users
  - Monitor for abuse patterns

#### R3: Import Platform Not Ready
- **Description**: Player ready but import platform delayed
- **Probability**: 30%
- **Impact**: Player live but no conversion funnel; wasted effort
- **Mitigation**:
  - Dependency tracking (import team roadmap visibility)
  - Build player to be standalone anyway (dual path)
  - Communicate delays early

#### R4: Flutterwave Integration Breaks
- **Description**: Payment provider API change, webhook not delivered, etc.
- **Probability**: 15% (external provider risk)
- **Impact**: Premium purchases fail; revenue blocked
- **Mitigation**:
  - Fallback payment method (manual transfer)
  - Monitor Flutterwave status dashboard
  - Regular integration testing (monthly)

---

### ⚠️ HIGH RISKS (Impact: High, Probability: Low-Med)

#### R5: Solo Dev Burnout
- **Description**: Thamany overwhelmed by scope + technical debt
- **Probability**: 40% (evident fatigue in code)
- **Impact**: Project stalls, tech debt explodes
- **Mitigation**:
  - Explicitly scope Tier 1 (non-negotiable)
  - Defer Tier 3 (nice-to-have) until team expands
  - Daily standup (async OK) to catch blockers early
  - Consider hiring QA + 1 backend dev by week 4

#### R6: Tests Incomplete (Tier 1 slips)
- **Description**: Testing takes longer than 2 weeks; pushed to month 2
- **Probability**: 50%
- **Impact**: Deploy risky code, catch bugs in production
- **Mitigation**:
  - Parallel track: Test-as-you-go (not end-of-sprint)
  - Focus on player + auth tests first (80/20)
  - Setup CI/CD early (week 1)

#### R7: Mobile Users Experience Crash
- **Description**: Hamburger menu doesn't render on iOS Safari
- **Probability**: 20% (common issue)
- **Impact**: iOS users frustrated, app store reviews tank
- **Mitigation**:
  - Test on real devices (iPhone, Android)
  - BrowserStack or similar
  - Regression testing for each iOS version

---

### 🟡 MEDIUM RISKS (Impact: Med, Probability: Med)

#### R8: Accessibility Audit Finds Major Issues
- **Description**: Screen reader broken, keyboard nav fails, etc.
- **Probability**: 70% (very likely given current state)
- **Impact**: Not usable for disabled users; legal risk (ADA/RGAA)
- **Mitigation**:
  - Prioritize a11y in Tier 2 (week 3)
  - Test with 2-3 assistive tech (NVDA, JAWS, VoiceOver)

#### R9: Geo-Blocking Prevents Stream Playback
- **Description**: CDN blocks RDC users; streams unplayable from player
- **Probability**: 30%
- **Impact**: App unusable in target market
- **Mitigation**:
  - Test from RDC IP (VPN)
  - Have backup CDN proxy strategy
  - Document in playback error handling

#### R10: Dead Channel Problem Grows
- **Description**: 30% of channels stop working within month; user experience degrades
- **Probability**: 60% (inherent to IPTV sourcing)
- **Impact**: User churn, quality perception drops
- **Mitigation**:
  - Automate source refresh (daily, not manual)
  - Alert admin when >20% channels dead
  - Feature: "Report dead channel" button

---

## 5. Implementation Timeline

### Week 1-2: SECURITY & ANALYTICS

```
Mon-Wed Week 1: Setup
├─ Security: Premium → Supabase (start)
├─ Analytics: Supabase RPC functions (define all)
├─ Testing: Vitest CI/CD (configure)
└─ Team: Kickoff + dependency check

Thu-Fri Week 1: Integration
├─ Import bridge: Link ad CTAs (start)
├─ Tracking: UTM param capture (implement)
└─ Daily standup: 15 min async

Mon-Tue Week 2: Complete Tier 1
├─ Security: Premium Supabase (finish + test)
├─ Import bridge: CTA fully working
├─ Tracking: End-to-end flow validated
└─ Tests: Critical path tests (20% coverage minimum)

Wed-Fri Week 2: Stabilize
├─ Deploy to staging
├─ Manual testing: Security + funnel + tests
├─ Fix critical bugs
└─ Prepare for week 3 launch
```

### Week 3-5: A11Y & MOBILE

```
Week 3: Accessibility
├─ Run Axe scan, triage failures
├─ Fix critical (WCAG A)
└─ Skip-to-content + ARIA live

Week 4: Mobile
├─ Hamburger menu (responsive drawer)
├─ Touch target audit (44px min)
├─ Vertical player (portrait mode)
└─ Performance (Lighthouse 90+)

Week 5: Testing & Polish
├─ Extend test suite (60% coverage)
├─ Integration tests (auth flow, payment)
├─ UAT (user acceptance test) with Thamany
└─ Prep for production launch
```

### Week 6-13: SCALE & MONITOR

```
Week 6-7: Production Launch
├─ Deploy all Tier 1 & 2
├─ Real-time monitoring (errors, performance)
├─ Weekly funnel review (conversion metrics)
└─ Respond to user feedback

Week 8-10: Iterate on Funnel
├─ A/B test ad copy + placement
├─ Interview users (why convert/why not?)
├─ Adjust import bridge UX based on data
├─ Measure: Week 1 → Week 4 conversion delta

Week 11-13: Optimize & Prepare Scale
├─ Prepare hiring plan (QA + backend)
├─ Document architecture (ADRs)
├─ Design system formalization (Tier 3 start)
├─ Plan month 4+ roadmap (scale phase)
└─ Weekly retrospectives + metrics
```

---

## 6. Success Metrics (OKRs)

### Objective 1: Funnel Works
- **KR1**: 50+ import signups/month traced to player (by week 4)
- **KR2**: >10% click-through rate on import CTA (by week 3)
- **KR3**: <2% bounce rate after import landing (by week 5)

### Objective 2: App Stable
- **KR1**: 0 P0 incidents (security/crash) in production (ongoing)
- **KR2**: >40% test coverage + green CI/CD (by week 2)
- **KR3**: Accessibility: WCAG AA pass (Axe 0 violations, by week 5)

### Objective 3: Team Enabled
- **KR1**: Architecture documented (ADRs, by week 6)
- **KR2**: Code review process established (by week 1)
- **KR3**: Weekly metrics dashboard live (by week 2)

### Objective 4: Product Ready
- **KR1**: Mobile UX tested on 3+ devices (by week 5)
- **KR2**: User onboarding <2min to first watch (by week 5)
- **KR3**: Premium conversion >15% (by week 8)

---

## 7. Resource Plan

### Current: 1 person (Thamany)
- **Stretch capacity**: ~60% (accounting for support, review, etc.)
- **Actual estimate**: Tier 1 (full-time 2 weeks) + Tier 2 (part-time 2 weeks)
- **Risk**: Single point of failure

### Recommended Expansion (Week 2)
1. **QA/Test Engineer** (1 FTE)
   - Tests, accessibility, mobile
   - Start: Week 2
   - Cost: ~$50k/month (contract or hire)

2. **Backend/DevOps** (1 FTE, optional)
   - Supabase, webhooks, scaling
   - Start: Week 4
   - Cost: ~$60k/month

**Total**: $110k/month → **3 months = $330k** (or $100k if contract/freelance)

### Budget Estimate (Development Only)

| Item | Cost | Notes |
|------|------|-------|
| Thamany (existing) | $0 | Already allocated |
| QA Engineer (3 mo) | $150k | Contract @ $50k/mo |
| Backend (optional) | $180k | Contract @ $60k/mo, start week 4 |
| Tools (Sentry, BrowserStack, etc.) | $5k | Monitoring + testing |
| **Total** | **$335k** | Or $155k if backend deferred |

---

## 8. Risk Contingencies

### If Import Platform Delayed
- **Plan B**: 
  1. Publish player as standalone (app store, PWA)
  2. Build generic "marketplace" link (instead of Aonoseke-specific)
  3. Pivot ads to generic affiliate links (Amazon, Flutterwave, etc.)
  4. Timeline: Week 4 decision point

### If Security Audit Finds More Flaws
- **Plan B**:
  1. Delay launch by 1 week
  2. Hire security consultant ($5-10k for audit)
  3. Fix before any revenue transaction

### If Solo Dev Cannot Ship Tier 1 on Time
- **Plan B**:
  1. Scope reduction: Defer import bridge (do plain funnel tracking first)
  2. Hire contractor immediately (week 1)
  3. Extend timeline to 4 months

### If Funnel Converts But LTV < Unit Economics
- **Plan B**:
  1. Adjust player monetization (higher ad frequency, premium tier)
  2. Pivot to advertising-only model (drop premium subscription)
  3. Build alternative B2B model (white-label for other retailers)

---

## 9. Governance & Decision-Making

### Weekly Standup (30 min)
- **When**: Every Monday 9 AM (async OK)
- **What**: Progress, blockers, metric review
- **Who**: Thamany, Product, Analytics
- **Output**: Public status update

### Bi-weekly Deep Dive (1 hour)
- **When**: Every other Wednesday 10 AM
- **What**: Risk review, roadmap adjustment
- **Who**: Extended team (dev, product, ops)
- **Output**: Risk register update

### Monthly Retrospective (1.5 hours)
- **When**: End of month
- **What**: What worked? What didn't? Team sentiment
- **Who**: Full team + stakeholders
- **Output**: Next month roadmap + team health assessment

### Decision Rights
| Decision | Owner | Timeline |
|----------|-------|----------|
| Feature scope change | Product | 24 hours |
| Dependency delay (import) | Product + Thamany | 1 week |
| Security issue (P0) | Tech lead | Immediate |
| Hiring | Exec | 1 week |
| Budget overrun | Finance | 1 week |

---

## 10. Post-Launch Plan (Month 4+)

### Scale Phase (Months 4-6)

**Goal**: 500+ import signups/month, app in app stores

**Actions**:
1. App store submission (iOS + Google Play)
2. Marketing campaign (paid ads, influencers)
3. Team scaling (3 → 5-7 people)
4. Multi-language support (English, Swahili, Pidgin)
5. B2B white-label offering

**Success metric**: $50k+/month revenue from player funnel

### Sustainment Phase (Month 6+)

**Goal**: Mature product with < maintenance

**Actions**:
1. Automate source updates
2. Admin dashboard self-service
3. User support infrastructure
4. Quarterly feature updates

---

## 11. Go/No-Go Criteria for Launch

### ✅ GO if ALL of these are true (Week 5 checkpoint):
- [ ] 0 P0 security issues (Premium Supabase validated)
- [ ] Import bridge live + 5+ test clicks traced
- [ ] ≥40% test coverage + CI/CD green
- [ ] WCAG A pass (no red flags)
- [ ] Mobile UX tested on 3+ devices
- [ ] Team ready + capacity confirmed

### ❌ NO-GO if ANY of these are true:
- [ ] Security audit finds critical flaw
- [ ] Import platform still not live (go solo instead)
- [ ] >30% of tests failing
- [ ] Mobile crashes on iOS/Android
- [ ] Thamany reports burnout / capacity exceeded

---

## Évaluation Axis 5: Roadmap & Risks

### Grille (1-5)

| Dimension | Score | Justification |
|-----------|-------|---|
| **Clarity of roadmap** | 5 | Crystal clear priorities + timeline |
| **Realism of timeline** | 2 | **AGGRESSIVE** (13 weeks for launch + scale) |
| **Risk identification** | 4 | Comprehensive risk register |
| **Contingency plans** | 3 | Defined but not detailed |
| **Resource allocation** | 2 | Under-resourced (1→3 people recommended) |
| **Dependency management** | 3 | Good tracking, but external risks high |
| **Team readiness** | 2 | Solo dev + no clear PM role |

**OVERALL**: **3/5 — Good roadmap, aggressive timeline, risky execution**

---

## Conclusion & Final Recommendation

### State
**Roadmap is clear but overly ambitious for team size. High risk of scope creep or burnout.**

### Key Insight
**The player is 85% done, but the last 15% (funnel integration + production hardening) requires team expansion. Solo dev cannot ship Tier 1 + Tier 2 in 5 weeks safely.**

### Recommendation: ADJUST TIMELINE

**Option A: Aggressive (Current Plan)**
- Timeline: 13 weeks (3 months)
- Risk: High (solo dev burnout, quality gaps)
- Cost: $335k (with team expansion)
- ROI: If funnel works, $500k+/month by month 6

**Option B: Realistic (Recommended)**
- Timeline: 20 weeks (4-5 months)
- Risk: Low (paced delivery, team scaled)
- Cost: $500k (with proper team)
- ROI: Same, but higher confidence

### FINAL ACTION: GO/NO-GO DECISION

**For Aggressive path (13 weeks)**:
- ONLY IF: (a) Hire QA engineer by week 1, (b) Thamany confirms capacity, (c) Import platform confirmed live by week 3

**For Realistic path (20 weeks)**:
- RECOMMENDED: More sustainable, better quality, lower risk

**Recommendation**: **REALISTIC PATH** — Extend to 20 weeks, hire team, ship once proven.

---

*Fin Axis 5 — End of 5-Axis Analysis*
