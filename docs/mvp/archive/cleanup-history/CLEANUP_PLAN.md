# Project Cleanup Plan

## Phase 1: Safe Cleanup (Zero Risk)

### Temporary Files & Build Artifacts
```bash
# Remove temporary directories
rm -rf temp-test-db/
rm -rf temp-test-sandbox/
rm -rf test-results/
rm -rf playwright-report/

# Clean common build artifacts (if they exist)
rm -rf .vite/
rm -rf dist/
rm -rf out/
rm -rf node_modules/.cache/
```

### Example/Demo Files
- [ ] Remove `src/renderer/components/memory/MemoryExplorerExample.tsx`
- [ ] Remove `src/renderer/components/memory/MemoryTimelineExample.tsx`

### Outdated Documentation
- [ ] Remove `src/renderer/components/memory/CLEANUP_TASKS.md`
- [ ] Remove `src/renderer/components/personas/CLEANUP_SUMMARY.md`

## Phase 2: Code Consolidation (Low Risk)

### Main Entry Points
- [ ] Verify `src/main-simple.ts` is not used, then remove
- [ ] Verify `src/main-test.ts` is not used, then remove
- [ ] Keep `src/main/index.ts` as primary entry point

### Refactored Components
- [ ] Verify original versions are not used, then remove:
  - Check if `DashboardOverview.tsx` exists and is unused
  - Check if `MemoryAdvancedSearch.tsx` exists and is unused
  - Check if `PersonaAdvancedPersonalityEditor.tsx` exists and is unused
- [ ] Rename "Refactored" versions to standard names

## Phase 3: Dependency Cleanup (Medium Risk)

### Dependency Audit
```bash
# Check for unused dependencies
npm install -g depcheck
depcheck

# Alternative: npm-check-unused
npx npm-check-unused
```

### Specific Dependencies to Investigate
- [ ] `electron-store` - Search codebase for usage
- [ ] `react-window` - Verify usage in virtualized components
- [ ] `uuid` - Check actual usage patterns

## Phase 4: Code Quality (Higher Risk)

### TODO Items
- [ ] Replace TODO items in `src/livestore/queries.ts` with actual implementation
- [ ] Review TODO comments in database managers
- [ ] Implement or remove mock database functions

### Code Quality Improvements
- [ ] Remove console.log statements in production code
- [ ] Clean up commented-out code blocks
- [ ] Standardize import statements

## Phase 5: Documentation Review

### Documentation Audit
- [ ] Review all 47 markdown files in `/docs/`
- [ ] Remove outdated wireframes and planning documents
- [ ] Update `CLAUDE.md` if configuration is outdated
- [ ] Consolidate overlapping documentation

## Execution Commands

### Safe Cleanup Script
```bash
#!/bin/bash
# Phase 1: Safe cleanup
echo "Starting safe cleanup..."

# Remove temporary directories
rm -rf temp-test-db/
rm -rf temp-test-sandbox/
rm -rf test-results/
rm -rf playwright-report/

# Remove example files
rm -f src/renderer/components/memory/MemoryExplorerExample.tsx
rm -f src/renderer/components/memory/MemoryTimelineExample.tsx

# Remove outdated documentation
rm -f src/renderer/components/memory/CLEANUP_TASKS.md
rm -f src/renderer/components/personas/CLEANUP_SUMMARY.md

echo "Safe cleanup completed!"
```

### Dependency Check Script
```bash
#!/bin/bash
# Check for unused dependencies
echo "Checking for unused dependencies..."

# Install depcheck if not present
if ! command -v depcheck &> /dev/null; then
    npm install -g depcheck
fi

# Run dependency check
depcheck

echo "Dependency check completed!"
```

## Risk Assessment

| Phase | Risk Level | Impact | Reversibility |
|-------|------------|---------|---------------|
| **Phase 1** | 🟢 **None** | High | N/A |
| **Phase 2** | 🟡 **Low** | Medium | Easy |
| **Phase 3** | 🟡 **Medium** | Medium | Easy |
| **Phase 4** | 🟠 **High** | High | Difficult |
| **Phase 5** | 🟢 **Low** | Low | Easy |

## Expected Benefits

- **Storage Savings**: 100-200MB
- **Build Performance**: 5-10% faster builds
- **Maintainability**: Reduced technical debt
- **Code Quality**: Cleaner, more focused codebase
- **Documentation**: Up-to-date, relevant documentation

## Validation Steps

After each phase:
1. Run `npm run lint` to check for errors
2. Run `npm run test` to ensure functionality
3. Run `npm run build` to verify build process
4. Test core application functionality

## Rollback Plan

- Keep git commits separate for each phase
- Create backup branch before starting
- Document any removed files for potential restoration