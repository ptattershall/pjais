# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PJAIS** is a privacy-first AI Hub desktop application built with Electron, React, TypeScript, and the Effect ecosystem. It features local data persistence, AI persona management, memory systems, and plugin architecture.

## Development Commands

### Core Commands
```bash
# Start development environment
pnpm start

# Build for production
pnpm run package

# Run all tests
pnpm test

# Run unit tests with watch mode
pnpm run test:main:watch

# Run unit tests with UI
pnpm run test:main:ui

# Run E2E tests
pnpm run test:e2e

# Lint code
pnpm run lint

# Package for distribution
pnpm run make
```

### Test Commands
- `pnpm run test:main` - Run Vitest unit tests
- `pnpm run test:main:watch` - Run Vitest in watch mode for development
- `pnpm run test:main:ui` - Run Vitest with UI dashboard
- `pnpm run test:e2e` - Run Playwright E2E tests
- Tests are configured with Vitest for unit tests and Playwright for E2E
- Test files: `src/main/**/*.test.ts` for unit tests, `e2e/**/*.spec.ts` for E2E tests

## Architecture Overview

### Process Architecture
This is an Electron application with three main processes:
- **Main Process** (`src/main/`) - Node.js backend, database, services
- **Renderer Process** (`src/renderer/`) - React frontend 
- **Preload Process** (`src/preload/`) - Secure IPC bridge

### Key Architectural Components

#### Database Layer (Effect SQL + SQLite)
- **Location**: `src/main/database/`
- **Pattern**: Repository pattern with Effect SQL integration
- **Files**:
  - `schema.sql` - Complete SQLite schema with auto-timestamps, foreign keys, soft deletes
  - `database-service.ts` - Core Effect SQL service layer
  - `persona-repository.ts` - Persona CRUD operations
  - `memory-repository.ts` - Memory CRUD operations with tiered storage
  - `effect-database-manager.ts` - Main database manager with auto-migration

#### Service Layer
- **Location**: `src/main/services/`
- **Pattern**: Effect-based dependency injection
- **Key Services**:
  - `memory-manager.ts` - AI memory with tier system
  - `persona-manager.ts` - Persona lifecycle management
  - `plugin-manager.ts` - Plugin sandbox and lifecycle
  - `security-manager.ts` - Security scanning and validation
  - `encryption-service.ts` - Data encryption/decryption

#### IPC Communication
- **Location**: `src/main/ipc/`
- **Pattern**: Type-safe IPC with validation
- **Files**: Each feature has its own IPC handler file
- **Preload**: `src/preload/index.ts` exposes secure APIs via contextBridge

### Frontend Architecture

#### Component Structure
- **Layout**: `src/renderer/components/layout/` - AppShell wrapper
- **Feature Modules**:
  - `memory/` - Memory explorer, search, analytics
  - `personas/` - Persona management and editing
  - `dashboard/` - Overview and system health
  - `admin/` - System administration panels

#### State Management
- **Context**: React Context for theme and global state
- **Pattern**: Component-level state with hooks
- **Data Flow**: IPC calls → Main process → Database → Response

### Technology Stack

#### Core Technologies
- **Electron**: Cross-platform desktop app framework
- **React**: UI framework with hooks and functional components
- **TypeScript**: Strict type checking enabled
- **Effect**: Functional programming library for services and database
- **Material-UI**: Component library for consistent UI
- **Vite**: Build tool for fast development

#### Database
- **SQLite**: Embedded database via Effect SQL
- **Effect SQL**: Type-safe SQL operations
- **Schema**: Auto-migrating SQL schema with triggers
- **Location**: Platform-specific app data directory

#### Testing
- **Vitest**: Unit testing framework
- **Playwright**: E2E testing framework
- **Coverage**: UI coverage reporting available

## Development Patterns

### Effect Integration
- Services use Effect generators for composable operations
- Database operations wrapped in Effect for error handling
- Runtime context provides dependency injection
- Always use Effect.gen for complex operations
- Use `Effect.runPromise` or `Effect.runSync` to run Effect programs
- Error handling follows Effect patterns (Either, Option, etc.)

### TypeScript Path Mapping
```typescript
// Available path aliases:
"@shared/*": ["src/shared/*"]
"@main/*": ["src/main/*"] 
"@renderer/*": ["src/renderer/*"]
"@preload/*": ["src/preload/*"]
```

### Security Practices
- Context isolation enabled in renderer
- No Node.js integration in renderer
- All IPC calls validated and sanitized
- Plugin sandbox system for untrusted code
- CSP headers and security policies enforced

### Database Operations
- All database operations use Effect SQL patterns
- Repositories provide type-safe CRUD operations
- Automatic schema initialization on startup
- Soft deletes for memory entities
- JSON fields for complex nested data

## Key Files and Locations

### Configuration Files
- `forge.config.ts` - Electron Forge configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration with strict mode
- `vite.*.config.ts` - Vite build configurations for each process

### Database Files
- `src/main/database/schema.sql` - Complete SQLite schema
- Database file location: `{userData}/pjais.db`

### Entry Points
- `src/main/index.ts` - Main process entry
- `src/renderer/main.tsx` - Renderer process entry
- `src/preload/index.ts` - Preload script

## Documentation References

### Project Documentation
- `PROJECT_STATUS_AND_ROADMAP.md` - Current status and milestones
- `EFFECT_SQL_IMPLEMENTATION_SUMMARY.md` - Database architecture details
- `README.md` - Setup and development instructions

### Component Documentation
- `src/renderer/components/memory/README.md` - Memory system components
- `src/renderer/components/personas/README.md` - Persona management components

## Current Status

**The application is fully functional with persistent SQLite database**. The Effect SQL migration has been completed and all core systems are operational. Data persists across app restarts and the database schema is production-ready.

## Common Issues

### ONNX Runtime Errors
- Non-critical errors related to `@xenova/transformers` 
- AI features may be affected but core app functions normally
- Can be safely ignored during development

### Database Location
- Production database: `{userData}/pjais.db` (platform-specific app data directory)
- Database is automatically created on first run
- Schema auto-migrates with application updates

### Memory System Specifics
- Three-tier memory system: `active` (frequent access), `archived` (older memories), `cold` (rarely accessed)
- Memory entities support soft deletes with `deleted_at` timestamp
- Embeddings stored as JSON arrays for vector similarity search
- Memory optimization runs automatically based on access patterns

### Platform Differences
- Use `PlatformUtils` for platform-specific code
- Window management differs between macOS and Windows/Linux
- File paths and app data locations are platform-specific

### Build and Packaging
- Uses Electron Forge for building and packaging
- Vite for fast development with HMR
- Separate build configurations for main/preload/renderer processes
- Code signing configuration available but commented out in `forge.config.ts`

## Recent Cleanup History

**Project cleanup completed in 5 phases (2025-07-16):**
- **Phase 1**: Safe cleanup (temporary files, examples)
- **Phase 2**: Code consolidation (removed duplicate main entry points, standardized components)
- **Phase 3**: Dependency optimization (removed 7 unused packages, improved build performance)
- **Phase 4**: Code quality (replaced mock database with real Effect SQL services, improved logging)
- **Phase 5**: Documentation review (removed outdated wireframes, consolidated documentation)

**Key improvements:**
- Database layer now uses real Effect SQL services instead of mocks
- Proper structured logging with electron-log
- Cleaner dependency tree with optimized packages
- Consolidated component naming (removed "Refactored" suffixes)
- Updated package manager commands to use `pnpm`