# LiveStore Query System

This directory contains the organized query system for PJai's LiveStore implementation. The queries are broken down into focused, manageable files for better maintainability and organization. All queries use the correct LiveStore API patterns and are fully type-safe.

## Structure

query/
├── types.ts                    # Shared types and interfaces
├── basic-persona-queries.ts    # Simple persona queries
├── basic-memory-queries.ts     # Simple memory queries
├── advanced-memory-queries.ts  # Complex memory filtering
├── analytics-queries.ts        # Analytics and reporting queries
├── search-queries.ts          # Search functionality
├── performance-queries.ts     # Performance monitoring
├── backward-compatibility.ts  # Legacy query system
├── index.ts                   # Main export file
└── README.md                  # This documentation

## Usage

### Import from the main index

```typescript
import { 
  useActivePersona, 
  usePersonaMemories, 
  useMemorySearch 
} from '../livestore/query'
```

### Import specific query types

```typescript
// For basic queries
import { useActivePersona } from '../livestore/query/basic-persona-queries'

// For analytics
import { useMemoryAnalytics } from '../livestore/query/analytics-queries'

// For backward compatibility
import { activePersona$ } from '../livestore/query/backward-compatibility'
```

## Query Categories

### Basic Queries

- **Persona Queries**: Simple persona operations (active, all, by ID, recent)
- **Memory Queries**: Basic memory operations (by persona, by tier, by ID, stats)

### Advanced Queries

- **Advanced Memory Queries**: Complex filtering (by type, importance, date range, tags)
- **Analytics Queries**: Reporting and analytics (memory analytics, persona analytics)
- **Search Queries**: Search functionality (memory search, persona search)
- **Performance Queries**: Performance monitoring (memory performance metrics)

### Backward Compatibility

- **Legacy Queries**: Reactive query system for existing components
- **Reactive Streams**: `$` suffixed queries for reactive programming

## Query Patterns

### LiveStore React Hooks (Correct API Usage)

```typescript
const { store } = useStore()
const query$ = queryDb(
  tables.personas.where({ isActive: true }).first(),
  { label: 'activePersona' }
)
return store.useQuery(query$)
```

### JavaScript Filtering Pattern (For Complex Queries)

```typescript
// Get data first, then filter in JavaScript
const memories$ = queryDb(
  tables.memoryEntities.where({ personaId }),
  { label: 'personaMemories', deps: [personaId] }
)
const memories = store.useQuery(memories$)

// Filter and calculate in JavaScript
const stats = {
  totalCount: memories?.length || 0,
  activeCount: memories?.filter(m => m.memoryTier === 'active').length || 0,
  averageImportance: memories?.length 
    ? memories.reduce((sum, m) => sum + (m.importance || 0), 0) / memories.length 
    : 0
}
```

### Backward Compatibility

```typescript
const persona$ = activePersona$
persona$.subscribe((persona) => {
  console.log('Active persona:', persona)
})
```

## Type Safety

All queries are fully typed with TypeScript interfaces defined in `types.ts`:

- `ReactiveQuery<T>`: Interface for reactive queries
- `QueryOptions`: Options for query configuration
- `DatabaseContext`: Context for Effect-based queries
- `MemoryAnalytics`: Memory analytics result type
- `PersonaAnalytics`: Persona analytics result type
- `MemoryPerformance`: Performance metrics type
- `MemoryStats`: Memory statistics type

## API Compatibility

### ✅ Supported LiveStore Methods

- `queryDb()`: Create reactive database queries
- `tables.table.where()`: Filter by conditions
- `tables.table.orderBy()`: Sort results
- `tables.table.first()`: Get first result
- `store.useQuery()`: React hook for query results

### ❌ Unsupported Methods (Not Available in LiveStore)

- `tables.table.select()`: Use JavaScript filtering instead
- `tables.table.filter()`: Use JavaScript filtering instead
- `tables.table.count()`: Use JavaScript `.length` instead
- `tables.table.avg()`: Use JavaScript `.reduce()` instead
- `tables.table.sum()`: Use JavaScript `.reduce()` instead
- `tables.table.groupBy()`: Use JavaScript grouping instead

## Migration Guide

### From Original queries.ts

**Before:**

```typescript
import { useActivePersona } from '../livestore/queries'
```

**After:**

```typescript
import { useActivePersona } from '../livestore/query'
```

### From Legacy Reactive Queries

**Before:**

```typescript
import { activePersona$ } from '../livestore/queries'
```

**After:**

```typescript
import { activePersona$ } from '../livestore/query'
```

## Benefits

1. **Modularity**: Each file has a single responsibility
2. **Maintainability**: Easier to find and modify specific query types
3. **Testability**: Individual query files can be tested in isolation
4. **Type Safety**: Centralized type definitions
5. **Backward Compatibility**: Legacy queries still work
6. **Clean API**: Single import point via index.ts
7. **Correct API Usage**: All queries use proper LiveStore patterns
8. **Performance**: Efficient JavaScript filtering instead of complex SQL operations
9. **Reliability**: No dependency on non-existent LiveStore methods

## Adding New Queries

1. **Identify the category** (basic, advanced, analytics, etc.)
2. **Add to appropriate file** or create new file if needed
3. **Export from index.ts** for main API access
4. **Update types.ts** if new types are needed
5. **Add tests** for the new query
6. **Update documentation** if needed

### Query Implementation Guidelines

- **Use `queryDb()` for database queries**
- **Use JavaScript filtering for complex operations**
- **Avoid non-existent LiveStore methods** (select, filter, count, avg, sum, groupBy)
- **Include proper TypeScript types**
- **Add meaningful labels for debugging**
- **Include dependencies in query options**

### Example: Adding a New Memory Query

```typescript
// In basic-memory-queries.ts
export const useMemoriesByPriority = (personaId: string, priority: 'high' | 'medium' | 'low') => {
  const { store } = useStore()
  
  const memories$ = queryDb(
    tables.memoryEntities.where({ personaId }),
    { label: 'personaMemoriesForPriority', deps: [personaId] }
  )
  
  const memories = store.useQuery(memories$)
  
  if (!memories) return []
  
  return memories
    .filter(memory => memory.priority === priority)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
```
