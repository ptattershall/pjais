# Testing Documentation

This document describes the comprehensive testing strategy implemented for PJAIS, including unit tests, integration tests, and end-to-end tests.

## Test Architecture

### Test Types

1. **Unit Tests** - Test individual components and functions in isolation
2. **Integration Tests** - Test service interactions and system integration
3. **E2E Tests** - Test complete user workflows through the application

### Test Structure

src/
├── main/
│   ├── services/
│   │   ├── *.test.ts                    # Unit tests
│   │   ├──*.integration.test.ts        # Integration tests
│   │   └── abstractions.test.ts         # Service abstraction tests
│   └── integration/
│       ├── service-integration.test.ts  # Cross-service integration
│       └── ipc-integration.test.ts      # IPC communication tests
e2e/
├── persona-management.spec.ts           # Persona workflow tests
├── memory-management.spec.ts            # Memory workflow tests
├── dashboard-integration.spec.ts        # Dashboard integration tests
└── main.spec.ts                         # Basic app functionality

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit                # Unit tests only
npm run test:integration         # Integration tests only
npm run test:e2e                # E2E tests only

# Run with coverage
npm run test:coverage
```

### Development Commands

```bash
# Watch mode for development
npm run test:main:watch          # Unit tests in watch mode
npm run test:integration:watch   # Integration tests in watch mode

# UI mode for debugging
npm run test:main:ui             # Unit tests with UI
npm run test:e2e:ui              # E2E tests with UI
npm run test:e2e:debug           # E2E tests with debugging
```

## Test Configuration

### Unit Tests (Vitest)

- **Framework**: Vitest
- **Environment**: Node.js
- **Location**: `src/main/**/*.test.ts`
- **Config**: `vitest.config.ts`

### Integration Tests (Vitest)

- **Framework**: Vitest
- **Environment**: Node.js
- **Location**: `src/main/integration/**/*.test.ts`
- **Config**: `vitest.integration.config.ts`

### E2E Tests (Playwright)

- **Framework**: Playwright
- **Environment**: Electron
- **Location**: `e2e/**/*.spec.ts`
- **Config**: `playwright.e2e.config.ts`

## Test Coverage

### Current Coverage Areas

#### Service Layer Tests

- ✅ Memory Management Service
- ✅ Persona Management Service
- ✅ Database Manager
- ✅ Security Manager
- ✅ Encryption Service
- ✅ Plugin Manager
- ✅ Service Abstractions
- ✅ Dependency Injection

#### Integration Tests

- ✅ Service-to-Service Communication
- ✅ Database Transactions
- ✅ Security Policy Enforcement
- ✅ Performance Under Load
- ✅ Error Handling
- ✅ Health Monitoring
- ✅ IPC Communication

#### E2E Tests

- ✅ Persona Creation & Management
- ✅ Memory Creation & Management
- ✅ Advanced Search Functionality
- ✅ Dashboard Overview
- ✅ System Health Monitoring
- ✅ Export/Import Operations
- ✅ Real-time Updates

### Coverage Targets

- **Unit Tests**: 80%+ line coverage
- **Integration Tests**: 70%+ service interaction coverage
- **E2E Tests**: 90%+ critical user path coverage

## Test Data Management

### Mock Services

Mock implementations are provided for all major services:

- `MockMemoryManager` - Full memory management mock
- `MockPersonaManager` - Persona management mock
- `MockDatabaseManager` - Database operations mock
- `MockSecurityManager` - Security operations mock

### Test Containers

The `DependencyContainer` system provides:

- Service mocking and stubbing
- Dependency injection for tests
- Isolated test environments
- Cleanup and teardown

### Data Fixtures

Test data is managed through:

- Factory functions for creating test data
- Shared fixtures for common scenarios
- Cleanup utilities for test isolation

## Test Patterns

### Unit Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ServiceClass } from './service';

describe('ServiceClass', () => {
  let service: ServiceClass;

  beforeEach(() => {
    service = new ServiceClass();
  });

  afterEach(() => {
    // Cleanup
  });

  it('should perform expected operation', () => {
    // Test implementation
  });
});
```

### Integration Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestContainer } from '../services/DependencyContainer';

describe('Service Integration', () => {
  let container: DependencyContainer;

  beforeEach(async () => {
    container = setupTestContainer();
    await container.initializeAll();
  });

  afterEach(async () => {
    await container.shutdownAll();
  });

  it('should handle cross-service operations', async () => {
    // Test cross-service functionality
  });
});
```

### E2E Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to feature
  });

  test('should complete user workflow', async ({ page }) => {
    // Test complete user workflow
  });
});
```

## Test Environments

### Development Environment

- Fast feedback loop
- Watch mode enabled
- UI debugging available
- Hot reload for rapid iteration

### CI/CD Environment

- Headless execution
- Parallel test execution
- Coverage reporting
- Artifact collection

### Production Testing

- Smoke tests for critical paths
- Performance benchmarks
- Security validation
- System health checks

## Debugging Tests

### Unit Tests

```bash
# Run with debug logging
DEBUG=* npm run test:unit

# Run specific test file
npm run test:unit -- --run specific-test.test.ts

# Run with UI for debugging
npm run test:main:ui
```

### Integration Tests

```bash
# Run with verbose output
npm run test:integration -- --reporter=verbose

# Run specific test suite
npm run test:integration -- --run service-integration

# Watch mode for development
npm run test:integration:watch
```

### E2E Tests

```bash
# Run with UI for debugging
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific spec file
npm run test:e2e -- persona-management.spec.ts
```

## Best Practices

### Test Organization

1. **Descriptive Names**: Use clear, descriptive test names
2. **Logical Grouping**: Group related tests in describe blocks
3. **Proper Setup/Teardown**: Use beforeEach/afterEach for cleanup
4. **Isolated Tests**: Each test should be independent

### Mock Strategy

1. **Mock External Dependencies**: Database, file system, network
2. **Use Real Implementations**: When testing integration
3. **Consistent Mocking**: Use same mocks across test files
4. **Clear Mock Boundaries**: Know what's mocked vs real

### Assertion Strategy

1. **Specific Assertions**: Test exact expected values
2. **Error Testing**: Test both success and failure cases
3. **Edge Cases**: Test boundary conditions
4. **Performance**: Include performance assertions where relevant

### Data Management

1. **Test Data Isolation**: Each test should have its own data
2. **Cleanup**: Always clean up test data
3. **Realistic Data**: Use realistic test data
4. **Factory Functions**: Use factories for consistent data creation

## Continuous Integration

### Test Pipeline

1. **Code Quality**: Linting and formatting checks
2. **Unit Tests**: Fast feedback on code changes
3. **Integration Tests**: Service interaction validation
4. **E2E Tests**: Critical path verification
5. **Coverage Reports**: Ensure adequate test coverage

### Failure Handling

1. **Fast Failure**: Fail fast on critical errors
2. **Detailed Reporting**: Provide clear error messages
3. **Artifact Collection**: Collect screenshots, logs, videos
4. **Retry Logic**: Retry flaky tests with exponential backoff

## Performance Testing

### Load Testing

- Concurrent user simulation
- Memory usage monitoring
- Database performance testing
- System resource utilization

### Stress Testing

- High-volume data processing
- Memory leak detection
- Error rate monitoring
- Recovery time measurement

## Security Testing

### Input Validation

- SQL injection prevention
- XSS protection
- Command injection protection
- Path traversal prevention

### Authentication & Authorization

- Access control testing
- Session management
- Token validation
- Permission enforcement

## Maintenance

### Test Maintenance

1. **Regular Updates**: Keep tests current with code changes
2. **Refactor Tests**: Improve test quality and maintainability
3. **Remove Obsolete**: Clean up outdated tests
4. **Documentation**: Keep test documentation current

### Tool Updates

1. **Framework Updates**: Keep testing frameworks current
2. **Dependency Updates**: Update test dependencies
3. **Configuration**: Update test configurations
4. **Best Practices**: Adopt new testing best practices

## Troubleshooting

### Common Issues

#### Test Timeout

```bash
# Increase timeout for slow tests
npm run test:integration -- --testTimeout=60000
```

#### Memory Leaks

```bash
# Run with memory monitoring
npm run test:integration -- --detectLeaks
```

#### Flaky Tests

```bash
# Run tests multiple times
npm run test:e2e -- --repeat-each=3
```

### Getting Help

- Check test logs for detailed error messages
- Use debugging tools provided by test frameworks
- Review test documentation and examples
- Check CI/CD pipeline logs for environment-specific issues

## Metrics and Reporting

### Test Metrics

- Test execution time
- Test pass/fail rates
- Code coverage percentages
- Flaky test identification

### Reporting

- HTML reports for detailed analysis
- JSON reports for CI/CD integration
- JUnit XML for test management tools
- Coverage reports for code quality

This comprehensive testing strategy ensures high code quality, system reliability, and user experience validation across all aspects of the PJAIS application.
