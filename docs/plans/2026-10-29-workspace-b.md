# Workspace B Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Apply the user's selected B prototype to the existing application, as requested by “làm luôn”.

**Architecture:** Reuse existing React state and commands. Change visual tokens and shell navigation; arrange workflow controls to the right of saved content on desktop, with a single column on mobile. Preserve the shared brief editor, safety conditions, diagnostics, backups and legacy simulation.

**Tech Stack:** Existing Next.js, React, TypeScript, Tailwind and Lucide. No new dependencies.

## Task 1: Light visual system
- Modify `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`.
- Match B's grey canvas, white surfaces, navy text, blue actions and red 10X brand. Use accessible green/amber text. Fix primary button hover for a light surface.
- Verify `npm.cmd run typecheck` after implementation.

## Task 2: Responsive shell
- Modify `src/components/nav.tsx`, `src/components/mission-control.tsx`.
- Desktop left navigation, mobile horizontally scrollable navigation; preserve exact accessible system names and existing hash destinations. Add a skip link and workspace heading. Keep overview/simulation accessible.
- Verify navigation and dirty draft preservation with existing milestone-a E2E.

## Task 3: Content and next action
- Modify `src/components/project-progress.tsx` and presentation labels in `src/components/project-workspace.tsx`.
- Group existing controls in a right column, content in the main column. Keep all command handlers, permissions and worker calls unchanged. Show saved artifacts as readable documents. On mobile, controls precede content.
- Verify full E2E, including both approval gates, editing, scoped runs and backup recovery.

## Task 4: Verification and handoff
- Run typecheck, workflow tests, production build then Chrome E2E using isolated test data.
- Inspect desktop and 390px screenshots. Review diff and document actual results in `docs/HANDOFF.md`.
- No remote push or paid provider calls. Check listeners before building; do not overwrite an active production build. Start local services only after checks if needed.

## Execution ledger
- Baseline: `f9fa76f`; existing README/HANDOFF changes record the user's B selection and are preserved.
- Ruling: work in the current feature branch because the launcher is tied to this path; do not create a second app checkout.
- Ruling: visual changes use existing regression tests and browser inspection rather than implementation-mirroring tests. Missing superpowers helper scripts/skills are replaced with this ledger and direct verification.
- User's “làm luôn” approves implementing the selected B direction and skips further design questions. No additional product functionality is included.
- Task 1: complete — light semantic colors, blue primary actions, light native controls; typecheck and build passed.
- Task 2: complete — left navigation on desktop, scrollable mobile navigation, skip link, overview cards; the universe simulation remains available on demand.
- Task 3: complete — saved documents open by default, workflow controls in the right column, approval above configuration, stage strip above both columns. Workflow moved ahead of diagnostics/backups. Project section navigation scrolls without changing workflow state.
- Ruling: keep the existing brief editor mounted and visible — preserves drafts and familiar access; the section navigation provides a direct route to results instead of adding hidden tabs.
- Initial E2E: 13/18; corrected Unicode labels damaged by a PowerShell pipeline, and changed disclosure tests to open documents only when closed. Subsequent run: 19/19.
- Fresh independent review: two Important findings, budget grid too narrow and legacy simulation contrast. Budget reproduction failed at 40px cell width (required >180px); contrast reproduction failed at 3.30:1 and 1.21:1 (required >=4.5:1). Fixed single-column nested budget/settings grids, semantic output surface, white recommendation text, scoped universe colors. Both regression checks GREEN in final 20/20 Chrome suite.
- Final: minor (deferred): project section buttons scroll to headings while keyboard focus remains on the button; the skip link does move focus to main content.
- Environment: the initial workflow test run hit Windows script policy in launcher tests. Using RemoteSigned only in the child process environment resolved it; no persistent policy change. Workflow suite: 85/85.
- Environment: after all Chrome test results were recorded, Windows left the E2E web/worker running during teardown. Verified root, isolated e2e-data directory and PIDs via health, then stopped only those test processes so Playwright could finish. No real services were stopped.
- Task 4: complete — final typecheck, production build and Chrome 20/20 (1.3m) passed; workflow 85/85. Viewed desktop/mobile and budget screenshots. Project state hashes unchanged after startup; project remains paused and no paid command was sent.
- Runtime: web3220 PID7720 and worker3230 PID2644 report the correct root/dataDir, workflow-health online. Launcher started the web; its CIM-based verification did not return promptly in this environment. Started the existing worker entry point directly with the same root/dataDir/port after checking the real project was paused. No launcher source change; main app opened in Chrome.
- Changes remain uncommitted for user review; no push/merge. Screenshots and logs are under ignored `.local/`, not in Git.
