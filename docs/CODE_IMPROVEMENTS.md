# Code Improvements Tracker

This document tracks non-critical code improvements, refactoring opportunities, and technical debt items identified during development.

## Recent Changes

### 2026-02-26: Replit Plugin Cleanup

**Status**: ✅ Completed

**Changes Made**:
- Removed `@replit/vite-plugin-cartographer` from vite.config.ts and package.json
- Removed `@replit/vite-plugin-dev-banner` from vite.config.ts and package.json
- Kept `@replit/vite-plugin-runtime-error-modal` for development error handling

**Rationale**: Simplified build configuration by removing unused Replit-specific development tools while maintaining essential error overlay functionality.

**Next Steps**:
- Run `npm install` to clean up node_modules and package-lock.json
- Consider if runtime-error-modal is needed for production builds (currently only useful in Replit environment)

---

## Pending Improvements

### Low Priority

#### Consider Environment-Specific Plugin Loading
**File**: `vite.config.ts`

**Current State**: Runtime error modal plugin is always loaded

**Suggestion**: Consider conditionally loading the Replit error modal only in Replit environment:
```typescript
plugins: [
  react(),
  ...(process.env.REPL_ID ? [runtimeErrorOverlay()] : []),
],
```

**Impact**: Minor - reduces plugin overhead in non-Replit environments

**Effort**: Minimal

---

## Completed Items

- ✅ Removed unused Replit cartographer plugin
- ✅ Removed unused Replit dev banner plugin
- ✅ Cleaned up package.json devDependencies

