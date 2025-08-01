# Task: Full Documentation Audit & Update

This document outlines the tasks required to bring all documentation in line with the current `pjais` codebase and standards.

## Phase 1: Audit and Update Core Documentation

- [x] **1.1 Tech Stack:** (`docs/ai_hub_tech_stack.md`)
  - [x] Update "Example Project Layout" to reflect the `pjais` structure (`src/main`, `src/renderer`, etc.).
  - [x] Correct the main process path from `/app` to `src/main`.
  - [x] Correct the renderer process path from `/src` to `src/renderer`.
  - [x] Ensure the dev scripts example is consistent with the current setup.
  - [x] Review the tech stack list (UI, State, DB) to ensure it aligns with current project standards (e.g., TailwindCSS, Shadcn UI over MUI).

- [x] **1.2 Electron Implementation Tasks:** (`docs/mvp/plans/tasks/core/electron-implementation-tasks.md`)
  - [x] In "Task 1.1", update the configured project folder structure from `('/app', '/src', ...)` to the new `pjais` structure.
  - [x] Review all file paths mentioned (e.g., `app/main.ts`) and update them to their correct locations (`src/main/main.ts`).
  - [x] Ensure all service file paths are correct.

## Phase 2: Audit Feature and Plan Documentation

- [x] Search for and update any instances of the old project structure (`pajamasweb-ai-hub`, `/app`, `/src` for renderer) in all `.md` files under `docs/`.
- [x] Ignore files within any `archive` directory.
- [x] Pay special attention to code blocks and diagrams that might depict the old structure.
- [x] Review `feature_map.md` and `feature_version_table.md` for consistency.

## Phase 3: Final Review

- [x] Perform a final sweep of all documentation to ensure consistency.
- [x] Verify that all references to file paths, technologies, and architectural concepts are up-to-date.
