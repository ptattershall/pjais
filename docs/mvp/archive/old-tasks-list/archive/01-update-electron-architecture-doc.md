# Task: Update Electron Architecture Documentation

This document outlines the tasks required to bring the `01-electron-architecture.md` file and other related documentation up-to-date with the current state of the `pjais` codebase.

## Phase 1: Update `01-electron-architecture.md`

- [x] **1.1 Project Structure:**
  - [x] Update the root directory from `/pajamasweb-ai-hub` to `pjais`.
  - [x] Change main process path from `/app` to `src/main`.
  - [x] Change renderer process path from `/src` to `src/renderer`.
  - [x] Change preload script path to `src/preload`.
  - [x] Update all file extensions from `.js` to `.ts`.
  - [x] Correct the list of IPC handlers to match `pjais/src/main/ipc`.
  - [x] Correct the list of services to match `pjais/src/main/services`.
  - [x] Add `src/shared` directory for shared types and utilities.

- [x] **1.2 Main Process Architecture:**
  - [x] Replace the `PajamasWebHub` class example with the current `App` class from `pjais/src/main.ts`.
  - [x] Reflect the correct initialization of services and window creation.

- [x] **1.3 Preload Script Security:**
  - [x] Update the `exposedAPI` to match the `pajamas` object exposed in `pjais/src/preload.ts`.
  - [x] Ensure all exposed channels and functions are accurate.

- [x] **2.1 IPC Handler Structure:**
  - [x] Update the `setupIPCHandlers` function and individual handler examples to reflect the current implementation in `pjais/src/main/ipc/`.
  - [x] Remove the non-existent `marketplace` handler.
  - [x] Add the `system` handler.

- [x] **2.2 Error Handling & Validation:**
  - [x] Remove the `IPCValidator` section as it does not exist. Note that validation should be added in the future.

- [x] **3. Cross-Platform Considerations:**
  - [x] Remove `PlatformUtils` as it is not implemented.
  - [x] Update the application menu code to match `pjais/src/main/menu.ts`.

- [x] **4. Security Implementation:**
  - [x] Verify and update the Content Security Policy (CSP) to match what's in the code, or add it if it's missing.
  - [x] Remove the `SecureFileHandler` section as it is not implemented.

- [x] **5. Development & Debugging:**
  - [x] Update any development configurations to match the current Vite and Electron Forge setup.
  - [x] Remove `PerformanceMonitor` as it is not implemented.

## Phase 2: Audit Other Documentation

- [x] Review all files in `docs/mvp/plans/` for mentions of the old file structure (`/app`, `.js` files) and update them to reflect the `pjais` structure.
- [x] Ignore files in any `archive` folders.
