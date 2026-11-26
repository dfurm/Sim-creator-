# Development log: working copy for 0.2.0-proto

> Copy maintained in `app/docs/`. The controlled original is `spec/DEVELOPMENT_LOG.md` (0.1.0), which is unchanged. Stages 1–8 below are quoted from it; Phase 2 entries are appended.

| Stage | Result at 0.1.0 |
|---|---|
| 1 Research | Reviewed four Furmtech curriculum notes, four practical drafts, public course and platform evidence, primary software terms, scientific and educational sources. |
| 2 Definition | Established six categories, 84 persistent block IDs, prerequisite graph, practical links and subject crosswalk. |
| 3 Standards | Defined scientific model fidelity, independent maturity, validity/unknown states and controlled A–P template. |
| 4 Architecture | Defined pure models, versioned block lifecycle and events, offline static hosting, semantic anchors and a separate lesson contract. |
| 5 Prioritisation | Applied 12 weighted criteria, recorded all scores, separated implementation prerequisites from business/education rank. |
| 6 Detailed scopes | Wrote starter briefs for the 28 specified topics, with SI controls, scene/graph, reference result and design prompts. |
| 7 Review | Independently recalculated prototype examples, checked metadata and schema examples and recorded limitations in verification/REVIEW_RECORD.md. External review remains open. |
| 8 Implementation planning | Assigned release tracks, initial gates, relative effort, unresolved owners and evidence needed before public release. |

## Phase 2

| Run | Date | Result |
|---|---|---|
| 2.0 Environment | 26 Nov 2026 | Repo, toolchain (TS strict, Vite, Vitest, Playwright with fallback to the pre-installed Chromium 158), Python venv. Reference checks 30/30. |
| 2A Runtime + S02 | 26 Nov 2026 | Kernel implementing `contracts/block.ts`: units/dimensions, lifecycle and events, applicability statuses, snapshot/scenario/envelope schema validation, semantic anchors, in-process host. S02 model 0.2.0 with bore design. Standalone page (React shell, framework-free SVG scene and plots, local KaTeX). Single-file offline build. Independent mpmath fixtures. Tests: 170 unit (49 fixture), 14 Playwright incl. axe scan, all passing. 15 spec issues logged in `app/SPEC_ISSUES.md`. Drive upload limit measured (about 3 MB per call). |
