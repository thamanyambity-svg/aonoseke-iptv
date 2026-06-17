# Project Analysis Instructions

Use when: conducting a structured 5-axis project evaluation for vision clarity, technical health assessment, UX/product fit, team sentiment, and strategic planning.

## applyTo Pattern

This instruction applies to all analysis work across the project. Use this when:
- Starting a new project analysis
- Evaluating code health or architecture
- Planning roadmaps or risk mitigation
- Gathering team feedback

## Core Methodology

All project analysis must follow the **5-Axis Framework**:

### Axis 1: Vision & Mission (20% weight)
- **Finalité profonde**: Why was this project created? What problem does it solve?
- **Mission opérationnelle**: What must it accomplish daily?
- **Publics cibles**: Who are primary and secondary users?
- **Proposition de valeur**: Why choose this over alternatives?
- **Valeurs & principes directeurs**: What invariants guide decisions?
- **Vision 3-5 ans**: Where should the project be heading?

**Deliverable**: Clear 1-sentence mission, documented personas, and shared vision statement.

### Axis 2: Technical Analysis (25% weight)
- **Architecture**: Monolith, microservices, serverless, or hybrid? Document component responsibilities and coupling.
- **Stack technologique**: Languages, frameworks, databases, build tools. Verify versions, maintenance status, and documentation availability.
- **Qualité du code**: Evaluate lisibilité, modularité, testabilité, maintenabilité. Cite specific files as examples.
- **Dette technique**: Distinguish deliberate vs. accidental debt. Estimate effort to resolve each item (jours-homme).
- **Couverture de tests**: Report coverage %, but also quality of test relevance and stability.
- **Sécurité**: Audit authentication, authorization, secrets management, known vulnerabilities, regulatory compliance.
- **Performance**: Measure response times on critical paths, scalability, APM observability.

**Deliverable**: Architecture diagram, debt inventory with mitigation costs, test coverage report, security audit findings.

### Axis 3: UX & Product (20% weight)
- **Parcours utilisateurs**: Map 3 main user journeys. Identify friction points at each step.
- **Personas**: Document primary and secondary user archetypes with context of use.
- **Ergonomie & intuitivité**: Can a novice use the product without assistance?
- **Design system**: Is there a formalized system? Is it respected across the product?
- **Accessibilité**: Evaluate WCAG 2.1 / RGAA compliance. Identify barriers.
- **Feedback utilisateur**: Leverage analytics, support tickets, NPS. What do users report?
- **Mobile & responsive**: Evaluate experience on multiple devices.

**Deliverable**: User journey maps, accessibility audit, friction heat map, design system compliance report.

### Axis 4: Subjective & Team Sentiment (15% weight)
- **Première impression**: What's the gut feeling on discovering the project?
- **Enthousiasme**: What excites the team? What are they proud of?
- **Inquiétudes & frustrations**: What worries or frustrates team members?
- **Zones d'ombre**: Which parts remain opaque or unexplained?
- **Alignement personnel**: Do team members agree with the project's direction (1-10)?
- **Sentiment d'ownership**: Can team members contribute meaningfully and see impact?

**Method**: Each team member completes individual assessment anonymously. Tech lead consolidates findings without attribution.

**Deliverable**: Anonymous consolidated sentiment summary, alignment scores, ownership barriers.

### Axis 5: Roadmap & Risks (20% weight)
- **État d'avancement**: What's in production, in-progress, planned, or discussed?
- **Priorités par horizon**: Define top 3 initiatives for 0-3 months, 6-12 months, and 1-2 years.
- **Dépendances critiques**: Internal (other teams, shared resources) and external (APIs, services, regulations).
- **Plans de continuité**: For each critical non-mastered dependency, what's the contingency?
- **Cartographie des risques**: Probability × Impact for 5+ risks. Assign mitigation owners.

**Deliverable**: Risk matrix, 3-month action plan with owners and success metrics, dependency map.

---

## Investigation Process

1. **Days 1-3**: Individual discovery of code, documentation, and project context
2. **Days 4-8**: Deep analysis per axis; complete evaluation grids
3. **Day 9**: Workshop 1 (Code Discovery) & Workshop 2 (Vision Alignment)
4. **Day 10**: Workshop 3 (Risk Mapping) & Workshop 4 (Synthesis & Action Planning)
5. **Days 11-12**: Finalize report and presentation
6. **Days 13-14**: Oral restitution with stakeholders

---

## Evaluation Grids

All findings must be scored on a **1-5 scale** with documented justification:

| Score | Meaning |
|-------|---------|
| 5 | Excellent, exemplary, no action needed |
| 4 | Good, solid, minor improvements possible |
| 3 | Adequate, functional, some concerns |
| 2 | Weak, significant gaps, needs attention |
| 1 | Critical, broken, urgent action required |

Each score must include:
- **Observation**: What was observed?
- **Evidence**: Which files, metrics, or data?
- **Impact**: Why does this matter?

---

## Deliverables Checklist

- [ ] Axis 1 report (2-3 pages, vision & mission clarity)
- [ ] Axis 2 report (technical audit with concrete examples)
- [ ] Axis 3 report (UX audit with journey maps & friction analysis)
- [ ] Axis 4 summary (anonymous team sentiment + alignment scores)
- [ ] Axis 5 report (roadmap, risks, 3-month action plan)
- [ ] Architecture diagram (visual cartography)
- [ ] Risk matrix (probability × impact)
- [ ] Synthesis grid (5 axes consolidated scores & key findings)
- [ ] 45-min presentation outline
- [ ] 3-month prioritized action plan (with owners, dates, metrics)

---

## Communication Standards

- **Factual & bienveillant**: Critique the project, not the people who built it.
- **Concrete evidence**: Never generalize. Cite specific files, metrics, or user feedback.
- **Constructive**: Pair every negative finding with a proposal or open question.
- **Distinction**: Separate objective facts (documenté, vérifiable) from opinions (subjective, débattable).
- **Anonymity**: Consolidate team sentiment without attribution.

---

## Constraints

- DO NOT skip Axis 4 (sentiment). Early warning signals often predict downstream problems.
- DO NOT confuse code smell with architectural risk.
- DO NOT present findings without an associated action plan.
- DO NOT assume constraints without asking stakeholders first.
- DO preserve confidentiality on sensitive findings (security vulns, critical risks).
