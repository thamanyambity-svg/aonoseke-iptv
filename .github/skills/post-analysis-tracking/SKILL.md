---
description: Track and execute 3-month action plan post-analysis with structured milestones and accountability
author: "Project Analyst Agent"
updated: "2025-01-15"
---

# Post-Analysis Tracking Skill

**Purpose**: After the 5-axis analysis and Atelier 4 synthesis, this skill provides structured templates and timelines to execute the resulting action plan over the next 3 months (13 weeks).

**Use When**: 
- You've completed all 5 axis analyses and Atelier 4 (Synthesis & Action Planning)
- You have a prioritized action list with owners and deadlines
- You need to track progress, hold weekly check-ins, and adjust based on emerging issues

**Outcomes**: 
- Clear week-by-week milestones (13 weeks)
- Mid-point review (week 6) to validate progress and re-prioritize if needed
- Final retrospective (week 12) to capture learnings and inform next cycle
- Accountability matrix showing owner, commitment, and status

---

## Phase 0: Kickoff (Week 0)

### Objective
Convert synthesis grid findings into concrete action items with owners, deadlines, and success criteria.

### Activity: Action Plan Transformation Meeting

**Duration**: 90 minutes

**Participants**: 
- Project sponsor or tech lead (facilitator)
- Core team members responsible for each axis
- Optional: external stakeholder for perspective

**Déroulé**:

1. **Synthesis Grid Review** (15 min)
   - Display global score and per-axis scores
   - Highlight 3 key signals requiring immediate action
   - Note transverse insights

2. **Opportunity/Risk Conversion** (30 min)
   - For each "Concern" or "Weak" signal: What specific action resolves this?
   - For each "Opportunity" signal: What specific action captures this?
   - Map each action to an owner and 4-week horizon (start date, due date)
   - Assign a success metric to each action

3. **Priority Triage** (20 min)
   - Rank actions by criticality and dependencies
   - Identify which must start immediately (Week 1) vs. which can wait
   - Resolve resource conflicts (same person assigned to multiple actions)

4. **Commitment Conversation** (15 min)
   - Each owner verbally commits to their action items
   - Clarify expectations, dependencies, and escalation paths
   - Schedule first check-in (day 3-5 of first week)

5. **Success Metrics Definition** (10 min)
   - For each action, ensure "How will we know this is done?" is crystal clear
   - Update action plan document

**Deliverable**: **3-Month Action Plan Document** (see template below)

---

## Phase 1: Weeks 1-4 (Month 1)

### Weekly Check-In Structure

**Duration**: 20-30 minutes

**Participants**: Core team + sponsor (async updates acceptable if sync not possible)

**Agenda**:

```
1. Wins from previous week (2 min)
2. Status of each action item (1-2 min each)
   - [ ] On track (green)
   - [ ] At risk, managing (yellow)
   - [ ] Blocked (red)
3. Blockers / escalations needing sponsor decision (5 min)
4. Upcoming week focus (3 min)
5. Any learnings / scope adjustments (2 min)
```

**Output**: 
- Brief status update (can be async Slack message)
- Update action plan document with latest % complete
- Escalations tracked for sponsor follow-up

---

## Phase 2: Mid-Point Review (Week 6)

### Objective
Validate progress on track, identify scope creep or misalignments, re-prioritize if needed.

### Activity: Mid-Cycle Review Meeting

**Duration**: 120 minutes

**Participants**: 
- Project sponsor (mandatory)
- Core team (mandatory)
- Optional: external stakeholder/advisor

**Déroulé**:

1. **Progress Snapshot** (10 min)
   - % of actions completed (target: 40-50% by week 6)
   - % of actions on track vs. at risk
   - Any actions completely blocked or cancelled?

2. **Deep Dive on At-Risk Items** (40 min)
   - For each yellow/red action: What's blocking? What's needed to unblock?
   - Is the action still valid or should it be descoped?
   - Do we need to reallocate resources?

3. **Emerging Insights** (20 min)
   - Are we learning anything new about the project?
   - Are new issues surfacing that weren't in the analysis?
   - Do priorities need shifting based on new information?

4. **Scope Adjustment** (20 min)
   - Should any remaining actions be adjusted or descoped?
   - Should any new actions be added?
   - Update success metrics if needed

5. **Second Half Commitment** (10 min)
   - Each owner re-commits to their actions for weeks 7-13
   - Escalate any resource or budget issues to sponsor NOW

**Deliverable**: **Mid-Point Review Document** (see template below)

---

## Phase 3: Weeks 7-12 (Months 2-3)

### Continued Weekly Check-Ins

Same structure as Phase 1 (weeks 1-4), with special attention to:
- Actions originally planned for months 2-3 now entering active phase
- Risk of scope creep due to discovered issues
- Resource fatigue as team sustains effort

**Escalation Rule**: Any action still blocked after 2 weekly discussions goes to sponsor immediately.

---

## Phase 4: Final Retrospective (Week 12-13)

### Objective
Capture learnings, celebrate progress, and inform the next analysis cycle.

### Activity: 3-Month Retrospective Meeting

**Duration**: 150 minutes

**Participants**: 
- Project sponsor (mandatory)
- Core team (mandatory)
- Optional: external advisor, new stakeholder perspective

**Déroulé**:

1. **Final Status** (10 min)
   - Overall % of action plan completed
   - For incomplete items: Why? Intentional defer or failure?
   - Overall project health today vs. 3 months ago

2. **Per-Axis Retrospective** (60 min — 12 min each axis)
   
   **For each axis:**
   - Which actions moved the needle most?
   - Which actions had little impact (why)?
   - Did the problem statement (from analysis) prove accurate?
   - What metric improved most? (Use axis evaluation grids to re-score if possible)
   
3. **Transverse Learnings** (30 min)
   - Did the 5-axis framework reveal anything surprising?
   - Were there unexpected dependencies between axes?
   - Did team sentiment shift? (Would re-run Axis 4 survey here)
   - Is the technical direction now clearer (Axis 2)?
   - Has vision alignment improved (Axis 1)?

4. **What We'd Do Differently** (20 min)
   - If we ran this analysis again, what would we ask?
   - What questions were most valuable vs. less useful?
   - How can we improve the next 5-axis analysis?

5. **Next Cycle Decision** (15 min)
   - Does the project need another full 5-axis analysis in 6-12 months?
   - Should we focus on spot-checking specific axes?
   - What's the sponsor's go/no-go for continuation?

6. **Celebration & Close** (15 min)
   - Acknowledge wins and effort invested
   - Share context on strategic implications of the work
   - Thank team for rigorous analysis

**Deliverable**: 
- **3-Month Retrospective Report** (see template below)
- **Lessons Learned Document** (inform next analysis cycle)
- **Recommendation for Next Cycle** (if applicable)

---

## Templates

### 1. 3-Month Action Plan Document

**Location**: `.github/tracking/action-plan-[PROJECT]-[START_DATE].md`

```markdown
# 3-Month Action Plan

**Project**: [PROJECT_NAME]
**Period**: [START_DATE] to [END_DATE]
**Created by**: Atelier 4 synthesis
**Last Updated**: [TODAY]

## Action Items

### Priority 1 (Weeks 1-4)

| ID | Action | Objective | Owner | Start | Due | Success Metric | Status % | Notes |
|----|--------|-----------|-------|-------|-----|----------------|----------|-------|
| A1 | [ACTION] | [OBJECTIVE] | [OWNER] | W1 | W4 | [METRIC] | [ ]% | |
| A2 | [ACTION] | [OBJECTIVE] | [OWNER] | W1 | W3 | [METRIC] | [ ]% | |

### Priority 2 (Weeks 3-8)

| ID | Action | Objective | Owner | Start | Due | Success Metric | Status % | Notes |
|----|--------|-----------|-------|-------|-----|----------------|----------|-------|
| B1 | [ACTION] | [OBJECTIVE] | [OWNER] | W3 | W8 | [METRIC] | [ ]% | |

### Priority 3 (Weeks 6-13)

| ID | Action | Objective | Owner | Start | Due | Success Metric | Status % | Notes |
|----|--------|-----------|-------|-------|-----|----------------|----------|-------|
| C1 | [ACTION] | [OBJECTIVE] | [OWNER] | W6 | W13 | [METRIC] | [ ]% | |

## Resource Allocation

| Owner | Total Commitment | Weeks 1-4 | Weeks 5-8 | Weeks 9-13 | Conflicts |
|-------|-----------------|----------|----------|-----------|-----------|
| [NAME] | [%] | [ITEMS] | [ITEMS] | [ITEMS] | [ ] Yes [ ] No |

## Risk Mitigation

| Risk | Action | Owner | Deadline |
|------|--------|-------|----------|
| [RISK] | [MITIGATION] | [OWNER] | [DATE] |

## Weekly Status (Updated Each Monday)

### Week 1
- Green: [ITEMS ON TRACK]
- Yellow: [ITEMS AT RISK]
- Red: [BLOCKED ITEMS]
- Next week focus: [PRIORITIES]

[Continue for all 13 weeks]

```

### 2. Weekly Status Update Template

**Location**: `.github/tracking/weekly-status-[PROJECT]-W[N].md`

```markdown
# Weekly Status — Week [N] of 13

**Project**: [PROJECT_NAME]
**Period**: [MON_DATE] to [FRI_DATE]
**Updated**: [TODAY]

## Summary
- Actions on track: [ ] / [ ]
- Actions at risk: [ ] / [ ]
- Actions blocked: [ ] / [ ]

## Per-Action Status

| ID | Action | Status | % Complete | Next Step | Owner |
|----|--------|--------|-----------|-----------|-------|
| A1 | [ACTION] | [ ] Green [ ] Yellow [ ] Red | [ ]% | [NEXT] | [OWNER] |

## Blockers Needing Sponsor Decision

1. [BLOCKER]: [CONTEXT]. Decision needed by [DATE].

## This Week's Wins

- [WIN]
- [WIN]

## Next Week Focus

- [PRIORITY]
- [PRIORITY]
```

### 3. Mid-Point Review Document

**Location**: `.github/tracking/midpoint-review-[PROJECT]-W6.md`

```markdown
# Mid-Point Review — Week 6 of 13

**Project**: [PROJECT_NAME]
**Date**: [TODAY]
**Participants**: [NAMES]

## Progress Summary

**Actions Completed**: [ ] / [ ] ([ ]%)
**Actions On Track**: [ ] / [ ]
**Actions At Risk**: [ ] / [ ]
**Actions Blocked**: [ ] / [ ]

## Critical Issues

| Issue | Impact | Resolution | Owner | Deadline |
|-------|--------|-----------|-------|----------|
| [ISSUE] | [IMPACT] | [RESOLUTION] | [OWNER] | [DATE] |

## Scope Adjustments

- [ ] Action [ID] descoped: [REASON]
- [ ] Action [NEW_ID] added: [REASON]
- [ ] Action [ID] timeline extended: [REASON]

## Resource Reallocation

[DESCRIBE ANY CHANGES TO OWNERSHIP OR TEAM COMMITMENT]

## Confidence Level for Weeks 7-13

- [ ] High: Current trajectory will deliver planned actions
- [ ] Medium: Doable with some adjustments
- [ ] Low: Significant changes needed

## Actions for Sponsor

1. [DECISION]: [CONTEXT]
2. [RESOURCE]: [REQUEST]
```

### 4. 3-Month Retrospective Report

**Location**: `.github/tracking/retrospective-[PROJECT]-[END_DATE].md`

```markdown
# 3-Month Retrospective

**Project**: [PROJECT_NAME]
**Period**: [START_DATE] to [END_DATE]
**Date**: [TODAY]

## Executive Summary

Overall project health improved from [ ]/5 to [ ]/5.

Key achievements:
1. [ACHIEVEMENT]
2. [ACHIEVEMENT]
3. [ACHIEVEMENT]

## Per-Axis Progress

### Axis 1: Vision & Mission
- Before: [ ]/5
- After: [ ]/5
- Actions that moved needle: [ACTIONS]
- Still open: [GAPS]

### Axis 2: Technical
- Before: [ ]/5
- After: [ ]/5
- Key improvement: [IMPROVEMENT]
- Remaining debt: [DEBT]

### Axis 3: UX & Product
- Before: [ ]/5
- After: [ ]/5
- User feedback: [FEEDBACK]
- Next priorities: [PRIORITIES]

### Axis 4: Team Sentiment
- Before: [ ]/5
- After: [ ]/5
- Morale shift: [OBSERVATION]
- Ownership feeling: [OBSERVATION]

### Axis 5: Roadmap & Risk
- Before: [ ]/5
- After: [ ]/5
- Risks mitigated: [RISKS]
- New risks discovered: [RISKS]

## Overall Health Score

| Metric | Start | End | Change |
|--------|-------|-----|--------|
| Global Score | [ ]/5 | [ ]/5 | +[ ]/5 |
| Team Confidence | [ ]% | [ ]% | +[ ]% |
| Risk Level | [ ] High / Med / Low | [ ] High / Med / Low | ↓ |

## Lessons Learned

1. **What Worked Well**:
   - [INSIGHT]
   - [INSIGHT]

2. **What Didn't Work**:
   - [INSIGHT]
   - [INSIGHT]

3. **Surprising Discoveries**:
   - [INSIGHT]
   - [INSIGHT]

## Recommendation for Next Cycle

- [ ] Full 5-axis analysis in [MONTHS]
- [ ] Spot-check specific axes in [MONTHS]
- [ ] No analysis needed; focus on execution
- [ ] Change analysis methodology / framework

**Rationale**: [EXPLANATION]

## Next Steps

1. [ACTION]: By [OWNER], [DATE]
2. [ACTION]: By [OWNER], [DATE]
```

---

## Accountability Checklist

Before Week 1 action items kick off:

- [ ] Sponsor has signed off on action plan priorities
- [ ] Each action has a clear owner (not "TBD")
- [ ] Each action has start & due dates (not vague "Q2")
- [ ] Each action has a success metric (not "get better")
- [ ] Resource conflicts have been resolved or escalated
- [ ] All owners have committed in the kickoff meeting
- [ ] First weekly check-in is scheduled
- [ ] Mid-point review is on the calendar (Week 6)
- [ ] Final retrospective is on the calendar (Week 12)

---

## Tool Integration

**VS Code Integration**:
- Use the **Project Analyst Agent** to track completion rate across weeks
- Create a GitHub Project board with action items mapped to issues
- Set automated reminders for check-in meetings

**Optional Automation**:
- Script to extract action items from synthesis grid → GitHub issues
- Weekly reminder to update status
- Escalation alert if action blocked > 2 weeks

---

**Questions?** Reference the `.github/instructions/project-analysis.instructions.md` for detailed methodology.
