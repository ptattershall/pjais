# Testing Guide for PJAIS

This document provides comprehensive information about the testing infrastructure and best practices for the PJAIS Electron application.

## Overview

PJAIS uses a multi-layered testing approach with modern testing tools optimized for Electron applications, Effect SQL, and React components.

### Testing Stack

- **Unit Testing**: Vitest with @effect/vitest for Effect programs
- **Integration Testing**: Custom integration tests with in-memory SQLite
- **Component Testing**: React Testing Library with jsdom
- **End-to-End Testing**: Playwright for full application workflows
- **Database Testing**: Effect SQL with in-memory SQLite databases

## Test Structure

src/
├── main/                         # Main process (Node.js)
│   ├── database/
│   │   ├── *.test.ts            # Database repository tests
│   ├── services/
│   │   ├──*.test.ts            # Service layer tests
│   └── ipc/
│       ├── *.test.ts            # IPC handler tests
├── renderer/                     # Renderer process (React)
│   └── components/
│       └── **/*.test.tsx        # React component tests
├── test-utils/                   # Shared testing utilities
│   └── index.ts                 # Test factories, mocks, helpers
e2e/                             # End-to-end tests
├── *.spec.ts                   # Playwright E2E tests

## Available Commands

### Main Process Tests

```bash
# Run all main process tests
pnpm run test:main

# Watch mode for development
pnpm run test:main:watch

# UI dashboard
pnpm run test:main:ui

# Coverage report
pnpm run test:coverage:main
```

### Renderer Process Tests

```bash
# Run all renderer tests
pnpm run test:renderer

# Watch mode for development
pnpm run test:renderer:watch

# UI dashboard
pnpm run test:renderer:ui

# Coverage report
pnpm run test:coverage:renderer
```

### Integration Tests

```bash
# Run integration tests
pnpm run test:integration

# Watch mode
pnpm run test:integration:watch
```

### End-to-End Tests

```bash
# Run E2E tests
pnpm run test:e2e

# UI mode for debugging
pnpm run test:e2e:ui

# Debug mode
pnpm run test:e2e:debug
```

### All Tests

```bash
# Run all test suites
pnpm run test:all

# Run unit tests only (main + renderer)
pnpm run test:unit

# Generate comprehensive coverage
pnpm run test:coverage
```

## Writing Tests

### Database Repository Tests

Database tests use Effect SQL with in-memory SQLite for fast, isolated testing:

```typescript
import { it as effectIt, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { PersonaRepository, PersonaRepositoryLive } from './persona-repository'
import { createTestDatabaseLayer, setupTestSchema } from '../../test-utils'

const TestLive = Layer.mergeAll(
  createTestDatabaseLayer(),
  PersonaRepositoryLive
)

effectIt('should create persona successfully', () =>
  Effect.gen(function* () {
    const repo = yield* PersonaRepository
    const persona = yield* repo.create(testPersonaData)
    
    expect(persona.id).toBeDefined()
    expect(persona.name).toBe('Test Persona')
  })
  .pipe(Effect.provide(TestLive))
)
```

### Service Layer Tests

Service tests use comprehensive mocking and dependency injection:

```typescript
import { describe, it, beforeEach, vi } from 'vitest'
import { SecurityManager } from './security-manager'
import { createMockSecurityManager } from '../../test-utils'

describe('SecurityManager', () => {
  let securityManager: SecurityManager
  
  beforeEach(() => {
    securityManager = new SecurityManager()
  })

  it('should initialize security components', async () => {
    await securityManager.initialize()
    
    expect(securityManager.getEncryptionService()).toBeDefined()
    expect(securityManager.getCSPManager()).toBeDefined()
  })
})
```

### IPC Handler Tests

IPC tests validate the communication layer between main and renderer:

```typescript
import { createPersona } from './personas'
import { createMockPersonaManager, createMockIpcEvent } from '../../test-utils'

describe('Personas IPC Handlers', () => {
  it('should create persona via IPC', async () => {
    const mockManager = createMockPersonaManager()
    const mockEvent = createMockIpcEvent()
    
    const handler = createPersona(mockManager)
    const result = await handler(mockEvent, testPersonaData)
    
    expect(mockManager.create).toHaveBeenCalledWith(testPersonaData)
    expect(result).toBeDefined()
  })
})
```

### React Component Tests

Component tests use React Testing Library with comprehensive mocking:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardOverview } from './DashboardOverview'
import { createTestPersona } from '../../../test-utils'

describe('DashboardOverview', () => {
  it('should render dashboard with persona info', async () => {
    // Mock electron API
    window.electronAPI.personas.getActive.mockResolvedValue(
      createTestPersona({ name: 'Active Assistant' })
    )
    
    render(<DashboardOverview />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Assistant')).toBeInTheDocument()
    })
  })
})
```

## Test Utilities

The `src/test-utils/` directory provides comprehensive testing utilities:

### Data Factories

```typescript
import { createTestPersona, createTestMemory, createTestPlugin } from './test-utils'

const persona = createTestPersona({ name: 'Custom Name' })
const memory = createTestMemory({ importance: 90 })
const plugin = createTestPlugin({ permissions: ['memory:read'] })
```

### Mock Factories

```typescript
import { createMockPersonaManager, createMockSecurityManager } from './test-utils'

const mockPersonaManager = createMockPersonaManager()
const mockSecurityManager = createMockSecurityManager()
```

### Database Testing

```typescript
import { createTestDatabaseLayer, setupTestSchema, cleanupTestDatabase } from './test-utils'

// Create in-memory test database
const TestDatabaseLive = createTestDatabaseLayer()

// Setup schema and cleanup
effectIt('test with clean database', () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* setupTestSchema(sql)
    // ... test logic
    yield* cleanupTestDatabase(sql)
  })
  .pipe(Effect.provide(TestDatabaseLive))
)
```

### Performance Testing

```typescript
import { runPerformanceTest, measureTime } from './test-utils'

it('should perform operations within time limits', async () => {
  const results = await runPerformanceTest(
    () => expensiveOperation(),
    { iterations: 100, maxDuration: 1000 }
  )
  
  expect(results.averageDuration).toBeLessThan(500)
})
```

## Testing Best Practices

### 1. Test Structure

- Use descriptive test names that explain the behavior being tested
- Group related tests using `describe` blocks
- Follow AAA pattern: Arrange, Act, Assert

### 2. Database Testing

- Use in-memory SQLite for fast, isolated tests
- Clean up database state between tests
- Test both success and failure scenarios
- Validate data integrity and constraints

### 3. Effect SQL Testing

- Use `@effect/vitest` for testing Effect programs
- Leverage Effect's dependency injection for mocking
- Test error handling with `Effect.exit`
- Use TestClock for time-dependent operations

### 4. Service Testing

- Mock external dependencies
- Test initialization and shutdown sequences
- Validate health monitoring and error recovery
- Test security and permission boundaries

### 5. Component Testing

- Mock Electron APIs consistently
- Test user interactions and accessibility
- Validate responsive design with viewport mocks
- Test error boundaries and loading states

### 6. Integration Testing

- Test real data flows between components
- Validate IPC communication
- Test database migrations and schema changes
- Verify service interactions

### 7. Performance Testing

- Set reasonable performance baselines
- Test with realistic data volumes
- Monitor memory usage and cleanup
- Validate batch operations and virtualization

## Mocking Strategies

### Electron APIs

```typescript
// Automatic mocking in vitest.renderer.setup.ts
global.electronAPI = {
  personas: { /* mocked methods */ },
  memories: { /* mocked methods */ },
  system: { /* mocked methods */ }
}
```

### Database Operations

```typescript
// Effect SQL mocking with test layers
const MockDatabaseLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    query: () => Effect.succeed([]),
    execute: () => Effect.succeed(undefined)
  })
)
```

### External Services

```typescript
// Service mocking with vi.mock
vi.mock('./external-service', () => ({
  ExternalService: vi.fn().mockImplementation(() => ({
    method: vi.fn().mockResolvedValue('mocked-result')
  }))
}))
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:

- Pull requests
- Main branch pushes
- Release tags

### Coverage Requirements

- Main process: 80% minimum
- Renderer components: 75% minimum
- Integration tests: Critical paths covered
- E2E tests: Happy path and error scenarios

### Performance Monitoring

- Database operations: < 100ms average
- Service initialization: < 2s
- Component rendering: < 16ms (60fps)
- Memory usage: No leaks detected

## Debugging Tests

### Using Vitest UI

```bash
pnpm run test:main:ui
pnpm run test:renderer:ui
```

### Debugging E2E Tests

```bash
pnpm run test:e2e:debug
```

### Browser DevTools

Enable debug mode in component tests:

```typescript
import { screen } from '@testing-library/react'

// Add debug output
screen.debug()

// Or debug specific elements
screen.debug(screen.getByRole('button'))
```

### Database Debugging

```typescript
effectIt('debug database operations', () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    
    // Log queries for debugging
    const result = yield* sql`SELECT * FROM personas`
    console.log('Database result:', result)
  })
  .pipe(Effect.provide(TestLive))
)
```

## Common Testing Patterns

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const promise = asyncOperation()
  
  await waitFor(() => {
    expect(screen.getByText('Loading complete')).toBeInTheDocument()
  })
  
  const result = await promise
  expect(result).toBeDefined()
})
```

### Testing Error Conditions

```typescript
it('should handle errors gracefully', async () => {
  mockService.method.mockRejectedValue(new Error('Service unavailable'))
  
  render(<Component />)
  
  await waitFor(() => {
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })
})
```

### Testing User Interactions

```typescript
it('should respond to user interactions', async () => {
  const user = userEvent.setup()
  render(<Component />)
  
  await user.click(screen.getByRole('button', { name: 'Submit' }))
  
  expect(mockCallback).toHaveBeenCalled()
})
```

## Troubleshooting

### Common Issues

1. **Import Resolution**: Use path aliases defined in vitest configs
2. **Electron APIs**: Ensure proper mocking in setup files
3. **Database Tests**: Use Effect.provide with correct layers
4. **Async Tests**: Use proper waiting strategies with waitFor
5. **Memory Leaks**: Clear mocks and cleanup state between tests

### Environment Variables

```bash
# Enable debug logging
DEBUG=true pnpm run test:main

# Run tests with Electron's Node version
ELECTRON_RUN_AS_NODE=true pnpm run test:main

# Increase test timeout for slow operations
VITEST_TIMEOUT=30000 pnpm run test:integration
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure adequate test coverage
3. Update test utilities for reusable patterns
4. Add performance tests for critical paths
5. Update this documentation for new patterns

For questions or issues with testing, please refer to the project's issue tracker or contact the development team.
