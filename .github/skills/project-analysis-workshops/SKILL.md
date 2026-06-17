---
name: project-analysis-workshops
description: "Use when: scheduling and facilitating the 4 mandatory collective workshops for project analysis (code discovery, vision alignment, risk mapping, synthesis & action planning). Includes agendas, materials, and facilitation guides."
---

# Project Analysis Workshops

This skill provides structured facilitation guides for the **4 mandatory collective workshops** that form the backbone of comprehensive project analysis. Each workshop has a defined objective, duration, déroulé, and deliverables.

## Overview

| Workshop | Duration | Objective | Participants |
|----------|----------|-----------|--------------|
| **Atelier 1** — Code Discovery | 2h | Shared understanding of code & architecture | Dev team + Tech Lead (animation) |
| **Atelier 2** — Vision Alignment | 2h | Construct shared project vision | Full team + Product Owner (animation) |
| **Atelier 3** — Risk Mapping | 3h | Identify & prioritize project risks | Full team |
| **Atelier 4** — Synthesis & Action | 3h | Consolidate findings & create action plan | Full team |

**Total time**: 10 hours over 2 weeks (ideally Days 9-10 of the analysis cycle)

---

## Atelier 1: Code Discovery & Architecture (2 heures)

### Objectif
Enable the entire team to develop a shared mental model of the codebase and architecture—beyond individual zones each person has explored. Combat premature specialization that reduces collective understanding.

### Participants
- Full development team (frontend, backend, fullstack)
- Tech Lead (animator)

### Matériel Nécessaire
- Projector or screen sharing
- Live access to source code
- Architecture diagram template (whiteboard or digital)
- Notepad for observations

### Déroulé (120 min total)

**Part 1: Architecture Overview (20 min)**
- Tech Lead presents high-level architecture diagram
  - What are the major components? (Frontend, Backend, Database, External Services)
  - How do they communicate?
  - Where are the major coupling points?
  - What's the deployment model?

**Part 2: Code Walkthrough (60 min)**
- Live navigation through codebase following a **critical user journey** from end-to-end
  - Pick one core flow (e.g., "User logs in and plays a channel")
  - Start at the UI entry point → API layer → business logic → database
  - Narrate what's happening at each layer
  - Point out code patterns, dependencies, quality observations
  - Pause for questions at each major component

**Part 3: Open Questions & Observations (30 min)**
- Team members ask questions and flag observations
  - "Why was this decision made?"
  - "What happens if this service fails?"
  - "I see duplicate logic in modules X and Y—is that intentional?"
  - "This section is unclear to me"
- Capture all observations on a shared list (don't solve now—just list)

**Part 4: Synthesis & Points of Attention (10 min)**
- Tech Lead summarizes:
  - Areas of strong clarity
  - Areas of confusion or concern
  - Patterns to replicate elsewhere
  - Technical debt spotted
- Create final list of "points d'attention à approfondir"

### Livrable
- Annotated architecture diagram (shared model)
- List of attention points feeding into Axis 2 (Technical Analysis)
- Agreed glossary of architectural terms/patterns

### Facilitation Tips
- **Do**: Ask "dumb" questions to uncover hidden complexity
- **Do**: Encourage debate on observed patterns
- **Do**: Record all "I don't understand this" moments—they signal clarity gaps
- **Don't**: Solve architectural problems in real time—capture for later
- **Don't**: Let experts dominate; pull in quieter team members

---

## Atelier 2: Vision Alignment (2 heures)

### Objectif
Surface and reconcile individual understandings of the project's purpose, users, and direction. Disagreements that emerge are as valuable as convergences—they signal areas needing clarification with the project sponsor.

### Participants
- Full team (developers, designer, QA, product owner)
- Product Owner (animator)

### Matériel Nécessaire
- Post-its or digital whiteboard (Miro, Figma, etc.)
- Markers/stylus
- Wall space or large screen
- Timer

### Déroulé (120 min total)

**Part 1: Individual Formulation (15 min)**
- Each person writes on a post-it **in silence**:
  - "The **purpose** of this project is…" (1-2 sentences)
  - "The **mission** of this project is…" (1 sentence, must allow yes/no decisions)
- Set a timer. No collaboration. No discussion.

**Part 2: Clustering & Discussion (45 min)**
- Post all formulations visibly (anonymously if digital)
- Group similar formulations into clusters
- For each cluster, ask: "What does this interpretation capture that others miss?"
- Discuss contradictions: "Why did some people interpret it differently?"
- Capture nuances and tensions (don't force consensus yet)

**Part 3: Construct Shared Formulation (30 min)**
- As a group, craft **one collective version** of:
  - Project purpose (why it exists)
  - Project mission (what it must do)
- Vote on or co-write a final phrasing
- Test it: "Can someone say yes or no to whether feature X serves this mission?"

**Part 4: Identify Residual Divergence (30 min)**
- Note any lingering disagreements or questions
- Create a list of clarifications to take back to the project sponsor
- Example: "We're unsure whether mobile is core to the mission or secondary"

### Livrable
- **Shared vision formulation** (1-2 sentences each: purpose + mission)
- **List of open questions** to escalate to sponsor
- **Team alignment score** (rough consensus vs. strong disagreement)

### Facilitation Tips
- **Do**: Welcome disagreement—it means the vision wasn't clear
- **Do**: Press on contradictions: "Why do you think that?"
- **Do**: Capture every interpretation, no matter how minor it seems
- **Do**: Test final formulation: "Can you use this to make a product decision?"
- **Don't**: Suppress doubt or force false consensus
- **Don't**: Let the loudest person dominate

---

## Atelier 3: Risk Mapping (3 heures)

### Objectif
Collectively identify all significant risks (technical, product, organizational, market), prioritize them by probability × impact, and assign mitigation owners. Diversity of perspectives (dev, designer, QA, product owner) surfaces risks no single profile would identify.

### Participants
- Full team

### Matériel Nécessaire
- Large whiteboard or wall of post-its
- Probability × Impact matrix template (2×2 or 3×3 grid)
- Markers/post-its
- Timer
- Spreadsheet for final risk register

### Déroulé (180 min total)

**Part 1: Silent Brainstorm on Risks (30 min)**
- Each person writes risks on post-its **in silence**:
  - Technical risks: "This module won't scale", "We have no monitoring"
  - Product risks: "Users won't find this feature", "We don't know what success looks like"
  - Organizational risks: "This knowledge is siloed with one person", "Decision process is unclear"
  - Market risks: "A competitor could block our market", "Regulatory change could affect us"
- No editing. No filtering. Encourage quantity.

**Part 2: Share & Group Risks (60 min)**
- Display all post-its
- Group related risks into categories
- For each group, discuss:
  - "What does this risk actually threaten?"
  - "Is this a real risk or a known tradeoff?"
  - "Could this happen in the next 3 months?"
  - "If this happened, what would be the damage?"
- De-duplicate similar risks

**Part 3: Probability × Impact Evaluation (60 min)**
- For each **significant risk** (keep ~5-10 top risks), evaluate:
  - **Probability**: Faible (< 20%), Moyenne (20-60%), Forte (> 60%)
  - **Impact**: Faible (minor inconvenience), Moyen (slows progress), Critique (project at risk)
  - **Criticité**: Probability × Impact (plot on 2×2 or 3×3 matrix)
- Focus on **High-Probability × High-Impact** risks first

**Part 4: Mitigation Assignment (30 min)**
- For each risk with Criticité = Moyen or Forte:
  - Assign an **owner** (must be present in the room)
  - Define a **mitigation strategy**: Reduce probability? Reduce impact? Transfer risk?
  - Identify a **concrete action** (not "we'll think about it")
  - Set a **target date** (when must this be addressed?)
- Example: "Risk: Single point of failure on Auth service. Owner: Jane. Action: Set up failover for Supabase Auth by end of July. Mitigation: Transfer risk to managed service provider."

### Livrable
- **Risk matrix** (visual: probability × impact)
- **Risk register** (spreadsheet with owner, mitigation, deadline)
- **Top 3 risks** summary for stakeholder escalation

### Facilitation Tips
- **Do**: Encourage paranoia—"What keeps you up at night?"
- **Do**: Distinguish between real risks and known constraints
- **Do**: Ensure ownership is clear and accepted (don't assign without the person's agreement)
- **Do**: Make mitigation concrete and time-bounded
- **Don't**: Dismiss risks because "we've always done it this way"
- **Don't**: Create busywork—focus on real threats to project success

---

## Atelier 4: Synthesis & Action Planning (3 heures)

### Objectif
Consolidate all 5-axis analyses into a coherent synthesis, highlight key signals for stakeholders, and produce a prioritized 3-month action plan that's immediately actionable.

### Participants
- Full team

### Matériel Nécessaire
- Outputs from all previous ateliers (code discovery, vision, risk mapping)
- Draft reports from each axis
- Synthesis grid template
- Action planning template (RACI, priorities, dates)
- Presentation outline template

### Déroulé (180 min total)

**Part 1: Rapid Review of 5 Axes (30 min)**
- Tech Lead or facilitator summarizes findings from each axis:
  - Axis 1: Vision & mission clarity (how well understood?)
  - Axis 2: Technical health (what's strong? What's weak?)
  - Axis 3: UX & product fit (are users served well?)
  - Axis 4: Team sentiment (aligned? Concerned? Motivated?)
  - Axis 5: Roadmap & risks (what's the plan?)
- As each axis is presented, team adds live observations or corrections

**Part 2: Complete Synthesis Grid (45 min)**
- Fill in the consolidated evaluation grid:
  - Score each axis 1-5 with brief justification
  - Identify 1-2 key findings per axis
  - Note cross-axis patterns:
    - "Does technical debt block the product vision?"
    - "Is team sentiment aligned with realistic roadmap?"
    - "Are we solving the right problem for the right users?"
- Consensus or note disagreements

**Part 3: Define 3-Month Action Plan (60 min)**
- Identify **3-5 concrete initiatives** to drive in next 3 months:
  - Must align with Axis 1 (vision)
  - Must address top risks from Axis 5
  - Must be achievable with available resources
  - Should improve at least one weak axis
- For each initiative:
  - **Owner**: Who's accountable?
  - **Objective**: What's the success criterion?
  - **Effort**: How many days of work?
  - **Dependencies**: What must happen first?
  - **Deadline**: Target completion date
- Create a simple roadmap (Gantt or phased timeline)

**Part 4: Identify Key Signals for Stakeholders (30 min)**
- Distill 3-5 **signals** to present to project sponsor:
  - **Positive signals**: Strengths to preserve (e.g., "Strong team engagement on Axis 4")
  - **Concern signals**: Risks requiring decision (e.g., "Critical security gaps in Axis 2")
  - **Opportunity signals**: Quick wins (e.g., "Low-hanging fruit in UX friction")
- Draft the 45-min presentation outline:
  - 5 min: Context & methodology
  - 10 min: Axis 1 findings (vision clarity)
  - 10 min: Axis 2 findings (technical health)
  - 5 min: Axis 3 findings (UX fit)
  - 5 min: Axis 4 findings (team sentiment)
  - 5 min: Axis 5 findings (roadmap & risks)
  - 5 min: Key signals & 3-month action plan
  - 5 min: Questions & discussion

### Livrable
- **Completed synthesis grid** (5 axes scored, key findings noted)
- **3-month action plan** (initiatives, owners, dates, success metrics)
- **Presentation outline** (45 min + discussion)
- **Stakeholder summary** (1-page key signals)

### Facilitation Tips
- **Do**: Resist perfection—"Good enough to present" is the bar
- **Do**: Make action ownership explicit; don't leave it vague
- **Do**: Time-box each section ruthlessly
- **Do**: Ensure the presentation is actionable, not just informative
- **Don't**: Revisit earlier decisions—synthesis builds on them
- **Don't**: Create an action plan no one believes in

---

## Post-Workshop: Oral Restitution (1-2 heures)

After finalizing the report, present findings to project sponsor and stakeholders:

- **Duration**: 45 min presentation + 60 min Q&A
- **Audience**: Project sponsor, key stakeholders, team leads
- **Format**: Presentation covers the 3-month action plan and key signals
- **Follow-up**: Sponsor has 15 days to provide feedback; final report is then locked

---

## Quick Checklist for Facilitators

- [ ] Book rooms and times 2 weeks in advance
- [ ] Send agenda and prep materials 48h before each workshop
- [ ] Start and end on time
- [ ] Capture observations in real time (designate a scribe if you're facilitating)
- [ ] Don't solve problems—just name them
- [ ] Ensure quieter voices are heard
- [ ] Confirm action ownership explicitly (get verbal commitment, not nodding)
- [ ] Within 48h, distribute summary notes to team
- [ ] Archive all materials (post-its, diagrams, notes) for future reference

---

## Resource Links

- **Framework source**: See the PDF "DOCUMENT DE CADRAGE — Analyse Complète de Projet"
- **Axis evaluation grids**: See project-analysis.instructions.md
- **Project Analyst agent**: For guidance during each workshop
