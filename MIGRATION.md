# Database Migration Guide: LiveStore → better-sqlite3

This document provides comprehensive information about the database migration from LiveStore to better-sqlite3.

## Overview

PJai's has been migrated from LiveStore to better-sqlite3 for improved performance, reliability, and maintainability. The migration process is designed to be seamless, safe, and automatic.

## Migration Process

### Automatic Migration

The migration runs automatically when you start the application:

1. **Detection Phase**: The system checks for existing LiveStore databases
2. **Backup Phase**: Creates a timestamped backup of your data
3. **Validation Phase**: Validates data integrity using Zod schemas
4. **Migration Phase**: Transforms and imports data to the new SQLite schema
5. **Verification Phase**: Confirms successful migration

### Supported Data Sources

The migration system supports multiple LiveStore data formats:

#### SQLite Databases

- `livestore.db`
- `database.db`
- Custom database files in user data directory

#### JSON Data Files

- `data.json` with persona and memory exports
- Structured JSON files following LiveStore schema

### Migration Locations

The system searches for existing data in these locations:

**Primary Locations:**

- User data directory (`app.getPath('userData')`)
- Database subdirectories (`/db/`, `/data/`)

**Development Locations:**

- Project root directory
- Development data directories

## Data Transformation

### Persona Data

```typescript
// LiveStore format
{
  id: string
  name: string
  description: string
  personality: object
  memoryConfiguration: object
  privacySettings: object
  isActive: boolean
}

// New SQLite format (preserved structure)
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  personality JSON,
  memory_configuration JSON,
  privacy_settings JSON,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Memory Entity Data

```typescript
// LiveStore format
{
  id: string
  personaId: string
  type: string
  content: string
  tags: string[]
  importance: number
  memoryTier: string
}

// New SQLite format (enhanced)
CREATE TABLE memory_entities (
  id TEXT PRIMARY KEY,
  persona_id TEXT REFERENCES personas(id),
  type TEXT NOT NULL,
  name TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  tags JSON,
  importance INTEGER DEFAULT 50,
  memory_tier TEXT DEFAULT 'active',
  embedding JSON,
  embedding_model TEXT,
  access_count INTEGER DEFAULT 0,
  last_accessed TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
```

## Backup and Safety

### Automatic Backups

Before migration begins, the system creates:

backups/
├── livestore-backup-2025-01-10T10-30-00-000Z.db
├── livestore-backup-2025-01-10T10-30-00-000Z.db-wal
└── livestore-backup-2025-01-10T10-30-00-000Z.db-shm

### Backup Verification

Each backup includes:

- Original database files
- WAL (Write-Ahead Log) files
- Shared memory files
- Metadata with migration timestamp

### Rollback Process

If migration fails:

1. **Automatic Rollback**: The system automatically restores from backup
2. **Manual Rollback**: Users can restore from backup files
3. **Error Reporting**: Detailed error logs are generated

## Performance Improvements

### better-sqlite3 Benefits

- **Synchronous API**: Eliminates callback complexity
- **Better Performance**: 2-3x faster than async SQLite libraries
- **Memory Efficiency**: Lower memory usage and better GC behavior
- **WAL Mode**: Improved concurrent access and crash recovery
- **Native Addon**: Compiled C++ for maximum performance

### New Features

- **Prepared Statements**: Reusable, optimized queries
- **Transactions**: ACID compliance for data integrity
- **Foreign Keys**: Referential integrity enforcement
- **Full-Text Search**: Built-in FTS5 support for memory search
- **Connection Pooling**: Efficient resource management

## Troubleshooting

### Common Issues

#### Migration Fails to Detect Data

```bash
# Check for data in alternative locations
ls -la ~/Library/Application\ Support/PJais/
ls -la ~/.local/share/PJais/
ls -la %APPDATA%/PJais/
```

#### Permission Errors

```bash
# Ensure write permissions to user data directory
chmod -R 755 ~/Library/Application\ Support/PJais/
```

#### Corrupted LiveStore Database

- Check backup files in `backups/` directory
- Manually restore from most recent backup
- Contact support with error logs

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `MIGRATION_001` | LiveStore database not found | Check data directory permissions |
| `MIGRATION_002` | Backup creation failed | Ensure sufficient disk space |
| `MIGRATION_003` | Schema validation failed | Check data integrity |
| `MIGRATION_004` | Migration rollback triggered | Review error logs |

### Log Files

Migration logs are stored in:

- **Windows**: `%APPDATA%/PJais/logs/migration.log`
- **macOS**: `~/Library/Logs/PJais/migration.log`
- **Linux**: `~/.local/share/PJais/logs/migration.log`

## Manual Migration

If automatic migration fails, you can perform manual migration:

### Export from LiveStore

```javascript
// Connect to LiveStore database
const Database = require('better-sqlite3');
const oldDb = new Database('path/to/livestore.db');

// Export personas
const personas = oldDb.prepare('SELECT * FROM personas').all();
console.log(JSON.stringify(personas, null, 2));

// Export memories
const memories = oldDb.prepare('SELECT * FROM memory_entities').all();
console.log(JSON.stringify(memories, null, 2));
```

### Import to New Database

```bash
# Start PJais with migration disabled
SKIP_MIGRATION=true pnpm start

# Use the application's import functionality
# File > Import > From JSON/SQLite
```

## Development Notes

### Schema Changes

New schema includes these enhancements:

1. **Foreign Key Constraints**: Proper relationships between tables
2. **JSON Validation**: Structured JSON fields with validation
3. **Indexing**: Performance indexes on frequently queried fields
4. **Full-Text Search**: FTS5 virtual tables for memory search
5. **Audit Fields**: Created/updated timestamps for all records

### Migration Testing

Test migration with sample data:

```bash
# Run migration tests
pnpm test:migration

# Test with sample LiveStore data
pnpm test:migration:sample

# Benchmark migration performance
pnpm test:migration:benchmark
```

## Support

If you encounter issues during migration:

1. **Check Logs**: Review migration logs for specific errors
2. **Backup Verification**: Ensure backups exist before troubleshooting
3. **GitHub Issues**: Report bugs with log files attached
4. **Discord Support**: Join our Discord for real-time help

## Post-Migration

### Verification Steps

After successful migration:

1. **Data Integrity**: Verify all personas and memories are present
2. **Functionality**: Test persona activation, memory creation, plugin loading
3. **Performance**: Notice improved application responsiveness
4. **Backups**: Confirm backup files are safely stored

### Cleanup

Old LiveStore files can be safely removed after verification:

```bash
# Remove old LiveStore databases (after backup verification)
rm livestore.db*
rm database.db*
```

## Version Compatibility

| PJais Version | Migration Support | Notes |
|---------------|-------------------|-------|
| 1.0.x | ✅ Full Support | All LiveStore versions |
| 1.1.x | ✅ Full Support | Enhanced migration |
| 2.0.x | ✅ Full Support | Performance optimized |

Migration is supported for all LiveStore versions and data formats used in previous PJais releases.
