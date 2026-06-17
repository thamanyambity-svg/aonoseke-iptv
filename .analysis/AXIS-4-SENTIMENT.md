# AXIS 4: Sentiment d'Équipe — Team Alignment & Engagement

## Executive Summary

**État**: **Unknown (1 person observed in codebase)**  
**Approche**: Analyse par proxy (commits, code patterns, documentation tone)  
**Action**: **Requires team interviews** for accurate assessment

---

## 1. Team Composition (Inferred)

### Observed Contributors
- **Primary dev**: "Thamany" (author in package.json)
  - React/TypeScript lead
  - Script optimization (M3U parsing, source verification)
  - Infrastructure (Vercel setup, cron jobs)

- **Secondary roles** (implied but not visible):
  - ❓ Product manager (vision docs exist)
  - ❓ Design (dark mode, glassmorphism implemented)
  - ❓ DevOps (Supabase RLS, Vercel config)
  - ❓ QA (none visible in codebase)

### Observations
- ✅ **Solo developer is productive**: Solid architecture despite single person
- ⚠️ **Concentration risk**: All critical paths know only one person
- ❌ **Zero code review**: No pull requests, no merge conflict resolution visible

---

## 2. Project Understanding (Evidence from Codebase)

### Vision Clarity
- ✅ **Clear on technical mission**: "Build IPTV player with HLS + PWA"
- ✅ **Clear on ecosystem role**: PLAN-ECOSYSTEME doc shows funnel understanding
- ⚠️ **Gap between vision & implementation**: Funnel not connected (see Axis 1)

### Pain Points (Inferred from comments)

#### From vite.config.ts (Service Worker issue)
```typescript
// KILL-SWITCH : service worker auto-destructeur. L'ancien SW « collant »
// (qui servait un vieux bundle SANS le heartbeat, et que mon précédent
// correctif NetworkFirst avait empêché de se faire remplacer) se désinscrit
// de lui-même + vide tous les caches...
```
- 🚨 **PWA caching nightmare resolved but painful history**
- Shows iterative debugging, suggests deployment issues

#### From supabase/schema.sql (RLS anxiety)
```sql
-- view_events : tout le monde (clé anon) peut INSÉRER un événement,
-- mais personne ne peut lire/modifier via l'API publique.
```
- ✅ Thinking through security carefully
- ⚠️ RLS unrate-limited (possible reflection of "move fast" pressure)

#### From build scripts (Source reliability obsession)
```javascript
// Fusionne plusieurs repos FR (schumijo, iptv-org, Free-TV)
// Vérifie chaque flux (HTTP 200 + manifest HLS) en concurrence
// Écrit /tmp/fr_verified.json (chaînes qui jouent uniquement)
```
- ✅ **Quality obsessed**: Wants only working channels, not broken links
- ⚠️ **Over-engineering possible**: 40 concurrent checks per source build

### Finding
**Developer understands the problem deeply but may be experiencing "lone builder syndrome".**

---

## 3. Enthusiasm & Ownership Signals (Code Quality as proxy)

### ✅ High Engagement Indicators
1. **Defensive programming**: Error boundaries, fallbacks, try-catch everywhere
2. **Performance focus**: Virtual scroll, debouncing, code-splitting configured
3. **Security thinking**: URL validation, RLS policies, CSP headers considered
4. **French localization**: Effort to support user audience (not generic English app)
5. **Documentation in comments**: Rationale explained (WHY, not just WHAT)

### ⚠️ Fatigue/Burnout Indicators
1. **Zero tests**: Would be first thing automated if fresh energy
2. **Incomplete integration**: Funnel not connected despite blueprint existing
3. **Technical debt accumulating**: Duplication in scripts (pool, norm functions)
4. **Responsive to bugs but not proactive**: PWA fix was reactive (KILL-SWITCH comment)
5. **Feature incompleteness**: Premium logic rudimentary (localStorage hack)

### Implication
**Builder is passionate but stretched. Needs: (a) test automation support, (b) feature completion clarity, (c) integration help.**

---

## 4. Communication & Transparency

### Documentation Quality
- ✅ **Technical docs**: Good inline comments, schema documented
- ✅ **Vision documents**: PLAN-ECOSYSTEME is clear and detailed
- ✅ **README**: Comprehensive (though not mentioning ecosystem role)
- ⚠️ **No ADRs** (Architectural Decision Records): Why React? Why Supabase? Why Vercel?
- ❌ **No incident logs**: PWA disaster (KILL-SWITCH) not documented as lessons learned

### Transparency in Code
- ✅ **Error messages to users**: Clear and actionable
- ✅ **Error logging**: Logger.ts configured
- ⚠️ **No metrics dashboard**: Can't see real-time app health

### Finding
**Good intent on transparency, but fragmented across docs. Needs single source of truth (wiki/architecture guide).**

---

## 5. Alignment: Individual vs. Project Mission

### Project Mission (from PLAN)
1. ✅ **Player works**: Channels stream, search works, favorites saved
2. ✅ **Audience acquisition**: Analytics event tracking in place
3. ❌ **Conversion to import**: Bridge not built
4. ❌ **Revenue metrics**: Can't measure if player → import → deposits actually working

### Developer's Apparent Priority
1. ✅ **Technical quality** (strict TS, error handling, perf)
2. ✅ **User polish** (glassmorphism, dark mode, PWA)
3. ⚠️ **Ecosystem integration** (started but not completed)
4. ❌ **Revenue metrics** (absent)

### Alignment Assessment
- **GOOD on**: Technical execution, user experience
- **WEAK on**: Business metrics, conversion funnel
- **ROOT CAUSE**: Solo dev optimized for shipping, not for revenue measurement

---

## 6. Team Sentiment Questionnaire (Template for Interview)

To be administered to team members (Thamany + extended team):

### Section A: Project Understanding
1. **In your words, what is the main problem this project solves?**
   - Expected: "Acquisition channel for import platform"
   - Actual: TBD

2. **How do you know if the project is successful?**
   - Expected: "Number of import signups from player"
   - Actual: TBD

3. **What would success look like in 3 months?**
   - Expected: "100+ import signups/month from player"
   - Actual: TBD

### Section B: Ownership & Enthusiasm (1-10 scale)
1. **How aligned are you with the project vision?** ___/10
   - Why that score?

2. **How much ownership do you feel over the codebase?** ___/10
   - What would increase it?

3. **How confident are you in shipping this to production?** ___/10
   - What's the biggest blocker?

### Section C: Friction Points
1. **What's the biggest pain point in daily development?**
   - Options: Unclear requirements, tooling, testing, deployment, team communication

2. **What's preventing you from shipping faster?**
   - Options: Scope creep, technical debt, unclear priorities, lacking resources

3. **What would make you 10x happier working on this?**
   - Free response

### Section D: Team Dynamics
1. **Who do you rely on most for technical decisions?**
   - For product decisions?

2. **How clear are the priorities for the next sprint?**

3. **Do you feel heard when you raise concerns?**

---

## 7. Risk Signals (Team Perspective)

### 🚨 High Risk
1. **Solo dev dependency**: Only Thamany knows full architecture
   - Mitigation: Pair programming sessions, architecture docs
   
2. **Incomplete integration**: Funnel blueprint exists but not implemented
   - Signals: Unclear product ownership, competing priorities
   - Mitigation: Assign explicit owner for "import bridge" feature

3. **No code review process**: Single person, no QA feedback loop
   - Signals: Possible quality regression, test gaps
   - Mitigation: Enforce PR review even for solo dev (external reviewer)

### ⚠️ Medium Risk
1. **Fatigue/burnout**: Technical debt, incomplete features suggest capacity limits
   - Mitigation: Explicit load management, sprint retros

2. **Misalignment on metrics**: Developer optimizing for code quality, business for revenue
   - Mitigation: Weekly metrics review + revenue funnel dashboard

### ✅ Green Flags
1. **Quality obsession**: Code is defensive, not sloppy
2. **User-centric**: Dark mode, PWA, localization show care
3. **Documentation**: Vision clear, technical comments good

---

## Preliminary Sentiment Score (Based on Code Analysis)

| Indicator | Signal | Score |
|-----------|--------|-------|
| **Engagement level** | High code quality, but burnout signs | 3/5 |
| **Vision clarity** | Blueprint exists, implementation incomplete | 3/5 |
| **Team alignment** | Inferred from code, needs verification | 2/5 |
| **Technical autonomy** | Solo dev, concentrated risk | 2/5 |
| **Process maturity** | No tests, no reviews, but organized docs | 2/5 |

**Estimated team morale**: **2.5/5 — Passionate but potentially stretched**

---

## Recommendations Axis 4

### Immediate (Week 1)
1. 🎤 **Conduct 1:1 interviews** with Thamany + any extended team
   - Use template above
   - Anonymous consolidation if multiple people
   - 30 min each

2. 📊 **Create shared OKRs dashboard**
   - Revenue North Star visible
   - Weekly review cadence
   - Effort: 2-3 hours

### Short Term (Month 1)
1. 👥 **Establish code review practice**
   - Even solo dev benefits from external review
   - External reviewer (product + tech lead)
   - Effort: Process definition only, 2 hours

2. 🛣️ **Clarify roadmap ownership**
   - Who owns import bridge feature?
   - Who owns analytics/metrics?
   - Who owns admin dashboard?
   - Effort: 1 planning session

3. 📚 **Document architecture decisions**
   - ADR format (why React, why Supabase, why Vercel)
   - Effort: 1-2 days

### Medium Term (Months 2-3)
1. 💪 **Consider team expansion**
   - QA role (testing, user research)
   - DevOps (Supabase migrations, monitoring)
   - Effort: Hiring + onboarding (2-4 weeks)

2. 🔄 **Establish sprint retros**
   - Weekly: What blocked? What surprised?
   - Monthly: Are we on track for North Star?
   - Effort: 1 hour/week

3. 📊 **Setup team sentiment surveys**
   - Monthly pulse: morale, blockers, needs
   - Confidential feedback loop
   - Effort: 5 min survey, 30 min analysis

---

## Conclusion Axis 4

**État**: **2.5/5 — Engaged builder, but solo + stretched**

**Enjeu principal**: 
- ✅ Developer passionate about quality & user experience
- ⚠️ Possibly burned out (technical debt, incomplete features)
- ⚠️ Concentration risk (only person who knows full stack)
- ⚠️ Misalignment possible (code quality ≠ revenue metrics)
- ❌ **NO TEAM STRUCTURE**: Solo dev, no product manager role visible

**Action clé**: 
1. **Interview Thamany immediately** to assess actual morale vs. inferred
2. **Define ownership roles** (who drives product? who measures revenue?)
3. **Consider small team expansion** (QA + 1 backend engineer for scaling)

---

## CRITICAL NEXT STEP

**This axis is based on code analysis only. Requires human conversation to validate.**

**Recommended action**: Schedule 45-min call with Thamany to:
- Confirm project health
- Understand capacity
- Identify blockers
- Clarify roadmap ownership
- Discuss team expansion appetite

---

*Fin Axis 4 — Ready for Axis 5: Roadmap & Risques*
