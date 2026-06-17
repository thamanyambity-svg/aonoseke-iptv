# Axis 2 — Technical Analysis Report

**Project**: [PROJECT_NAME]
**Analyzed by**: [TECHNICAL_ANALYST]
**Date**: [DATE]
**Scope**: Architecture, code quality, technical debt, security, performance, observability

---

## Executive Summary

*2-3 sentences capturing the overall technical health and critical gaps.*

---

## 1. Architecture & Technology Stack

### Architecture Overview

**Type**: [ ] Monolith [ ] Microservices [ ] Serverless [ ] Hybrid

**Major Components**:

```
[DRAW OR DESCRIBE THE ARCHITECTURE]
- Frontend: [DESCRIPTION]
- Backend: [DESCRIPTION]
- Database: [DESCRIPTION]
- External Services: [DESCRIPTION]
```

**Coupling Analysis**:
- Strong coupling points: [COMPONENTS + RISK]
- Loose coupling successes: [COMPONENTS + BENEFIT]

### Technology Stack Inventory

| Component | Technology | Version | Release Date | Maintenance Status | Risk Level |
|-----------|------------|---------|--------------|-------------------|------------|
| **Runtime** | [TECH] | [VER] | [DATE] | [ ] Active [ ] EOL [ ] Abandoned | [RISK] |
| **Framework** | [TECH] | [VER] | [DATE] | [ ] Active [ ] EOL [ ] Abandoned | [RISK] |
| **DB** | [TECH] | [VER] | [DATE] | [ ] Active [ ] EOL [ ] Abandoned | [RISK] |
| **Build Tool** | [TECH] | [VER] | [DATE] | [ ] Active [ ] EOL [ ] Abandoned | [RISK] |
| **CI/CD** | [TECH] | [VER] | [DATE] | [ ] Active [ ] EOL [ ] Abandoned | [RISK] |

**Stack Coherence Issues**:
- Redundancies (same purpose, multiple tools): [EXAMPLES]
- Contradictions (conflicting paradigms): [EXAMPLES]
- Underutilized components: [EXAMPLES]

---

## 2. Code Quality & Technical Debt

### Code Quality Assessment

**Lisibilité** (Readability)
- [ ] High: Code is self-documenting, naming is clear
- [ ] Medium: Generally readable but some unclear sections
- [ ] Low: Difficult to follow, poor naming

**Examples**:
- Exemplary file: [FILE_PATH] — [WHY]
- Problematic file: [FILE_PATH] — [WHY]

**Modularité** (Modularity)
- [ ] High: Clear separation of concerns, easy to change
- [ ] Medium: Mostly modular with some coupling
- [ ] Low: Highly coupled, difficult to isolate changes

**Examples**:
- Well-modular: [COMPONENT] — [WHY]
- Poorly-modular: [COMPONENT] — [WHY]

**Testabilité** (Testability)
- [ ] High: Code designed for testing
- [ ] Medium: Can test but not ideal
- [ ] Low: Very difficult to test

**Examples**:
- Easy to test: [COMPONENT] — [WHY]
- Hard to test: [COMPONENT] — [WHY]

**Maintenabilité** (Maintainability)
- [ ] High: Easy to modify and extend
- [ ] Medium: Moderate complexity
- [ ] Low: Difficult to modify safely

**Examples**:
- Maintainable: [PATTERN] — [WHY]
- Unmaintainable: [PATTERN] — [WHY]

### Technical Debt Inventory

| Debt Item | Type | Description | Impact | Effort to Resolve (days) | Priority |
|-----------|------|-------------|--------|-------------------------|----------|
| [DEBT_1] | Deliberate | [REASON_TAKEN] | [ ] Low [ ] Medium [ ] High | [DAYS] | [PRIORITY] |
| [DEBT_2] | Accidental | [ROOT_CAUSE] | [ ] Low [ ] Medium [ ] High | [DAYS] | [PRIORITY] |

**Deliberate Debt** (assumed, documented):
- [DEBT]: [REASON] — Acceptable? [ ] Yes [ ] No

**Accidental Debt** (unplanned, progressive):
- [DEBT]: [ROOT_CAUSE] — Resolvable? [ ] Yes [ ] No

---

## 3. Test Coverage & Quality

### Automated Test Metrics

| Test Type | Coverage % | Files | Quality Assessment |
|-----------|----------|-------|-------------------|
| **Unit Tests** | [%] | [N] | [ ] Strong [ ] Adequate [ ] Weak |
| **Integration Tests** | [%] | [N] | [ ] Strong [ ] Adequate [ ] Weak |
| **E2E Tests** | [%] | [N] | [ ] Strong [ ] Adequate [ ] Weak |
| **Performance Tests** | [%] | [N] | [ ] Strong [ ] Adequate [ ] Weak |

### Test Quality Assessment

*80% coverage with poor test relevance is less useful than 40% targeting critical paths.*

- Are tests testing the right behaviors? [ ] Yes [ ] Partially [ ] No
- Are tests stable (non-flaky)? [ ] Yes [ ] Partially [ ] No
- Do tests execute quickly? [ ] Yes (< 5 min) [ ] Moderate (5-15 min) [ ] Slow (> 15 min)

**Critical test gaps**:
- [CRITICAL_PATH]: No coverage — [RISK]
- [CRITICAL_PATH]: No coverage — [RISK]

---

## 4. Security Audit

### Authentication & Authorization

- Auth mechanism: [MECHANISM]
- [ ] Properly implemented
- [ ] Known vulnerabilities: [LIST]
- [ ] Missing best practices: [LIST]

### Secrets & Credentials Management

- How are secrets stored? [METHOD]
- [ ] Secure (encrypted, rotated, no hardcoding)
- [ ] Risky: [RISKS]

### Known Vulnerabilities

| Vulnerability | Severity | Status | Deadline |
|---------------|----------|--------|----------|
| [CVE_1] | [ ] Critical [ ] High [ ] Medium [ ] Low | [ ] Patched [ ] Unpatched [ ] Mitigated | [DATE] |
| [CVE_2] | | | |

### Regulatory Compliance

- Applicable standards: [STANDARDS]
- [ ] Compliant [ ] Partially compliant [ ] Non-compliant

**Gaps**:
- [COMPLIANCE_GAP]: [RISK + EFFORT_TO_FIX]

---

## 5. Performance & Scalability

### Critical Path Performance

| Endpoint / Operation | Response Time | Target | Status |
|---------------------|----------------|--------|--------|
| [CRITICAL_PATH_1] | [ACTUAL_MS] | [TARGET_MS] | [ ] Green [ ] Yellow [ ] Red |
| [CRITICAL_PATH_2] | | | |

### Scalability Assessment

- Horizontal scaling: [ ] Ready [ ] Partial [ ] Not ready
- Vertical scaling: [ ] Ready [ ] Partial [ ] Not ready
- Bottlenecks: [IDENTIFIED_BOTTLENECKS]

### APM / Monitoring Data

- [ ] APM tools in place: [TOOLS]
- [ ] Metrics tracked: [METRICS]
- [ ] Performance issues identified: [ISSUES]

---

## 6. Observability (Logs, Metrics, Alerting)

### Logging

- Log aggregation: [ ] Yes [ ] No
- Structured logs: [ ] Yes [ ] Partial [ ] No
- Coverage: [CRITICAL_GAPS]

### Metrics

- Business metrics tracked: [LIST]
- Technical metrics tracked: [LIST]
- Gaps: [GAPS]

### Alerting

- Alert rules defined: [N]
- Alert coverage: [ ] Comprehensive [ ] Partial [ ] Minimal
- Known blind spots: [BLIND_SPOTS]

---

## 7. CI/CD & Deployment

### Deployment Process

- [ ] Fully automated
- [ ] Semi-automated: [MANUAL_STEPS]
- [ ] Manual

**Traceability**: [ ] Yes [ ] Partial [ ] No
**Reversibility**: [ ] Yes [ ] Partial [ ] No

### Database Migrations

- Process: [PROCESS]
- Risks: [RISKS]
- Rollback capability: [ ] Yes [ ] No

---

## 8. Critical External Dependencies

| Dependency | Type | Criticality | SLA | Plan B |
|------------|------|------------|-----|--------|
| [DEP_1] | [ ] API [ ] Service [ ] Library | [ ] Critical [ ] High [ ] Medium | [SLA] | [ ] Documented [ ] None |
| [DEP_2] | | | | |

---

## Evaluation Grid — Axis 2

| Criterion | Score (1-5) | Weight | Justification |
|-----------|-------------|--------|----------------|
| **Architecture Clarity** | [SCORE] | 12% | [OBSERVATION] |
| **Stack Modernité & Maintenance** | [SCORE] | 10% | [OBSERVATION] |
| **Code Lisibilité & Modularité** | [SCORE] | 12% | [OBSERVATION] |
| **Test Coverage & Quality** | [SCORE] | 12% | [OBSERVATION] |
| **Technical Debt Level** | [SCORE] | 12% | [OBSERVATION] |
| **Security** | [SCORE] | 14% | [OBSERVATION] |
| **Performance & Scalability** | [SCORE] | 10% | [OBSERVATION] |
| **Observabilité** | [SCORE] | 10% | [OBSERVATION] |
| **CI/CD Maturity** | [SCORE] | 8% | [OBSERVATION] |
| **AXIS 2 GLOBAL SCORE** | **[AVERAGE]** | **100%** | **[SUMMARY]** |

*Note: For technical debt, 5 = minimal debt, 1 = massive unmanaged debt*

---

## Key Recommendations

1. **If security score < 3**: Immediate security audit + compliance plan
2. **If observability score < 3**: Implement APM and structured logging (quick win)
3. **If debt score < 3**: Allocate 20-30% of next sprint to debt reduction
4. **If architecture score < 3**: Schedule architecture workshop with tech lead

---

## Transverse Insights

- **Technical debt impact on roadmap feasibility** (Axis 5): [INSIGHT]
- **Code quality enabling UX/product velocity** (Axis 3): [INSIGHT]
- **Team sentiment about code maintainability** (Axis 4): [INSIGHT]
