# Axis 5 — Roadmap, Priorities & Risk Analysis Report

**Project**: [PROJECT_NAME]
**Analyzed by**: [STRATEGIC_ANALYST]
**Date**: [DATE]
**Scope**: Progress state, priorities by horizon, critical dependencies, risk mapping, mitigation plans

---

## Executive Summary

*2-3 sentences capturing current state, top 3 priorities, and critical risks to address.*

---

## 1. Current Progress State

### What's Live in Production

- [FEATURE]: Deployed [DATE], [DESCRIPTION]
- [FEATURE]: Deployed [DATE], [DESCRIPTION]

**Production Health**: [ ] Stable [ ] Issues [ ] Critical

### What's in Development (In-Progress)

- [INITIATIVE]: [% COMPLETE], ETA [DATE]
- [INITIATIVE]: [% COMPLETE], ETA [DATE]

**Status**: [ ] On track [ ] At risk [ ] Blocked

### What's Planned (Not Started)

- [INITIATIVE]: Scoped, planned for [TIMELINE]
- [INITIATIVE]: Scoped, planned for [TIMELINE]

**Confidence**: [ ] High [ ] Medium [ ] Low

### What's Discussed (No Commitment)

- [IDEA]: Under consideration, unclear timeline
- [IDEA]: Under consideration, unclear timeline

---

## 2. Priorities by Time Horizon

### Short Term (0-3 Months)

**Top 3 Initiatives**:

| Initiative | Objective | Owner | Start | End | Success Metric |
|-----------|-----------|-------|-------|-----|----------------|
| **[INITIATIVE_1]** | [OBJECTIVE] | [OWNER] | [DATE] | [DATE] | [METRIC] |
| **[INITIATIVE_2]** | [OBJECTIVE] | [OWNER] | [DATE] | [DATE] | [METRIC] |
| **[INITIATIVE_3]** | [OBJECTIVE] | [OWNER] | [DATE] | [DATE] | [METRIC] |

**Rationale for these 3**:
- [INITIATIVE_1]: Driven by [REASON_1] (Vision | Risk | User Need | Debt)
- [INITIATIVE_2]: Driven by [REASON_2]
- [INITIATIVE_3]: Driven by [REASON_3]

**Effort Estimate**: [TOTAL_DAYS] days ([TEAM_SIZE] people × [SPRINTS] sprints)

**Confidence Level**: [ ] High (85%+) [ ] Medium (50-85%) [ ] Low (<50%)

---

### Medium Term (6-12 Months)

**Strategic Priorities**:
1. [PRIORITY]: [DESCRIPTION] — Aligns with vision: [ ] Yes [ ] Partial [ ] No
2. [PRIORITY]: [DESCRIPTION] — Aligns with vision: [ ] Yes [ ] Partial [ ] No
3. [PRIORITY]: [DESCRIPTION] — Aligns with vision: [ ] Yes [ ] Partial [ ] No

**Coherence with Vision**:
- [ ] Strongly aligned: These priorities advance the project mission
- [ ] Partially aligned: Some priorities diverge from stated vision
- [ ] Misaligned: Roadmap contradicts vision (escalate)

---

### Long Term (1-2 Years)

**Strategic Direction**:

*If we execute on short & medium-term priorities, where will the project be in 1-2 years?*

[VISION_STATEMENT]

**Open Questions**:
- [STRATEGIC_QUESTION]: Needs sponsor decision
- [STRATEGIC_QUESTION]: Needs sponsor decision

---

## 3. Critical Dependencies

### Internal Dependencies

| Dependency | Status | Risk | Mitigation |
|------------|--------|------|-----------|
| [TEAM/RESOURCE] | [ ] Available [ ] Shared [ ] Bottleneck | [RISK] | [MITIGATION] |
| [DECISION] | [ ] Made [ ] Pending [ ] Unknown | [RISK] | [MITIGATION] |

### External Dependencies

| Dependency | Provider | SLA | Status | Plan B |
|-----------|----------|-----|--------|--------|
| [EXTERNAL_API] | [PROVIDER] | [SLA] | [ ] Healthy [ ] Issues [ ] Unknown | [ ] Documented [ ] None |
| [EXTERNAL_SERVICE] | [PROVIDER] | [SLA] | [ ] Healthy [ ] Issues [ ] Unknown | [ ] Documented [ ] None |

### Non-Mastered Dependencies (HIGH RISK)

*For each critical dependency you don't control, what's the continuity plan?*

| Dependency | Risk If Unavailable | Continuity Plan | Owner | Deadline |
|-----------|-------------------|-----------------|-------|----------|
| [DEP_1] | [BUSINESS_IMPACT] | [ ] Documented [ ] Partial [ ] None | [OWNER] | [DATE] |
| [DEP_2] | [BUSINESS_IMPACT] | [ ] Documented [ ] Partial [ ] None | [OWNER] | [DATE] |

---

## 4. Risk Mapping

### Risk Inventory

*Probability × Impact evaluation for top 5-8 risks.*

```
       HIGH IMPACT
              |
              | CRITICAL   | CRITICAL
              |           |
       MEDIUM | MEDIUM    | CRITICAL
              |           |
        LOW   | LOW       | MEDIUM
              |___________|____________ HIGH
              LOW      MEDIUM    PROBABILITY
```

### Risk Matrix (Detailed)

| Risk | Category | Probability | Impact | Criticality | Mitigation Strategy | Owner | Deadline |
|------|----------|-------------|--------|-------------|-------------------|-------|----------|
| **[RISK_1]** | [ ] Tech [ ] Product [ ] Org [ ] Market | [ ] Low [ ] Med [ ] High | [ ] Low [ ] Med [ ] High | [ ] High [ ] Med [ ] Low | [STRATEGY] | [OWNER] | [DATE] |
| **[RISK_2]** | | | | | | | |

### Critical Risks (Criticality = High)

**Risk 1: [RISK_NAME]**
- **Description**: [WHAT_COULD_GO_WRONG]
- **Probability**: [%] because [REASON]
- **Impact**: [WHAT_WOULD_HAPPEN]
- **Mitigation Type**: 
  - [ ] Prevention (reduce probability)
  - [ ] Damage Control (reduce impact)
  - [ ] Transfer (delegate to third party)
- **Specific Actions**:
  1. [ACTION]: By [OWNER], [DATE]
  2. [ACTION]: By [OWNER], [DATE]
- **Success Indicator**: [HOW_WE'LL_KNOW_IT_WORKED]

**Risk 2: [RISK_NAME]**
[SIMILAR STRUCTURE]

---

## 5. Key Milestones (Next 6 Months)

| Milestone | Date | Objective | Success Criteria | Owner |
|-----------|------|-----------|------------------|-------|
| **[MILESTONE_1]** | [DATE] | [OBJECTIVE] | [CRITERIA] | [OWNER] |
| **[MILESTONE_2]** | [DATE] | [OBJECTIVE] | [CRITERIA] | [OWNER] |
| **[MILESTONE_3]** | [DATE] | [OBJECTIVE] | [CRITERIA] | [OWNER] |

---

## 6. Resource Availability

### Human Resources

| Role | Needed | Available | Gap | Impact |
|------|--------|-----------|-----|--------|
| **Senior Backend** | [N] | [N] | [GAP] | [ ] Critical [ ] High [ ] Medium |
| **Frontend** | [N] | [N] | [GAP] | [ ] Critical [ ] High [ ] Medium |
| **DevOps** | [N] | [N] | [GAP] | [ ] Critical [ ] High [ ] Medium |

**Mitigation for gaps**:
- [GAP]: Mitigate by [ACTION] — [OWNER] — [DATE]

### Budget & Infrastructure

- Budget allocated: [AMOUNT]
- Budget needed: [AMOUNT]
- Gap: [GAP] — [ ] Concern [ ] OK

---

## 7. Roadmap Viability Assessment

### Can We Hold the Roadmap?

**Confidence Level**: 
- [ ] High (85%+): Realistic given resources and constraints
- [ ] Medium (50-85%): Doable but risky
- [ ] Low (<50%): Overly optimistic, needs re-scoping

**What's Most at Risk**:
- [INITIATIVE]: At risk because [REASON] — Mitigation: [ACTION]
- [INITIATIVE]: At risk because [REASON] — Mitigation: [ACTION]

### If Roadmap Must Be Cut by 30%

**What Gets Kept**:
1. [PRIORITY]: Why — [REASON]
2. [PRIORITY]: Why — [REASON]
3. [PRIORITY]: Why — [REASON]

**What Gets Dropped**:
- [INITIATIVE]: Can defer to [TIMELINE]
- [INITIATIVE]: Can defer to [TIMELINE]

---

## 8. Warning Signs to Monitor

### Key Alerts

*If we see these signals, the roadmap is at risk:*

| Alert | Trigger | Frequency Check | Owner |
|-------|---------|-----------------|-------|
| **[ALERT_1]** | [CONDITION] | Weekly | [OWNER] |
| **[ALERT_2]** | [CONDITION] | Weekly | [OWNER] |
| **[ALERT_3]** | [CONDITION] | Bi-weekly | [OWNER] |

---

## Evaluation Grid — Axis 5

| Criterion | Score (1-5) | Weight | Justification |
|-----------|-------------|--------|----------------|
| **Progress State Clarity** | [SCORE] | 12% | [OBSERVATION] |
| **Short-Term Priorities Coherence** | [SCORE] | 15% | [OBSERVATION] |
| **Medium/Long-Term Vision Alignment** | [SCORE] | 15% | [OBSERVATION] |
| **Critical Dependencies ID** | [SCORE] | 12% | [OBSERVATION] |
| **Continuity Plans for Dependencies** | [SCORE] | 10% | [OBSERVATION] |
| **Risk Mapping Exhaustiveness** | [SCORE] | 12% | [OBSERVATION] |
| **Mitigation Quality & Ownership** | [SCORE] | 12% | [OBSERVATION] |
| **Resource Availability for Roadmap** | [SCORE] | 12% | [OBSERVATION] |
| **AXIS 5 GLOBAL SCORE** | **[AVERAGE]** | **100%** | **[SUMMARY]** |

---

## Key Recommendations

1. **If score < 3 on dependencies**: Map all critical dependencies and create continuity plans (30-day deadline)
2. **If score < 3 on risk mapping**: Run Atelier 3 (Risk Mapping workshop) immediately
3. **If resource gap exists**: Escalate to sponsor for hiring/reallocation decision
4. **If roadmap confidence < 50%**: Re-scope for next quarter (don't commit to unrealistic targets)

---

## Transverse Insights

- **Roadmap feasibility vs. technical debt** (Axis 2): [INSIGHT]
- **Roadmap alignment with team sentiment** (Axis 4): [INSIGHT]
- **Roadmap support for vision achievement** (Axis 1): [INSIGHT]
