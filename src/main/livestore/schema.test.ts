import { describe, it, expect } from 'vitest'
import { schema, events, reactiveTables } from '../../livestore/schema'

describe('LiveStore Schema', () => {
  it('should export schema successfully', () => {
    expect(schema).toBeDefined()
    expect(events).toBeDefined()
    expect(reactiveTables).toBeDefined()
  })

  it('should have correct event definitions', () => {
    expect(events.personaCreated).toBeDefined()
    expect(events.personaUpdated).toBeDefined()
    expect(events.memoryEntityCreated).toBeDefined()
    expect(events.memoryEntityUpdated).toBeDefined()
  })

  it('should have correct table definitions', () => {
    expect(reactiveTables.personas).toBeDefined()
    expect(reactiveTables.memoryEntities).toBeDefined()
  })

  it('should have proper event schemas', () => {
    // Test that event schemas are properly defined
    expect(events.personaCreated.name).toBe('v1.PersonaCreated')
    expect(events.memoryEntityCreated.name).toBe('v1.MemoryEntityCreated')
  })
}) 