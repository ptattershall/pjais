-- Initial schema migration
-- Migrating from LiveStore to better-sqlite3

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Personas table - based on existing LiveStore PersonaData interface
CREATE TABLE IF NOT EXISTS personas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  personality_profile JSON,
  emotional_state JSON,
  privacy_settings JSON,
  memory_configuration JSON,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Memory entities table - based on existing MemoryEntity interface
CREATE TABLE IF NOT EXISTS memory_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  persona_id INTEGER,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  tier TEXT CHECK(tier IN ('hot', 'warm', 'cold')) DEFAULT 'warm',
  embedding_vector JSON,
  metadata JSON,
  importance_score REAL DEFAULT 0.5,
  last_accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (persona_id) REFERENCES personas (id) ON DELETE CASCADE
);

-- Memory relationships table - for memory entity connections
CREATE TABLE IF NOT EXISTS memory_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_memory_id INTEGER NOT NULL,
  to_memory_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL,
  strength REAL DEFAULT 1.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_memory_id) REFERENCES memory_entities (id) ON DELETE CASCADE,
  FOREIGN KEY (to_memory_id) REFERENCES memory_entities (id) ON DELETE CASCADE,
  UNIQUE(from_memory_id, to_memory_id, relationship_type)
);

-- Plugins table - for plugin management
CREATE TABLE IF NOT EXISTS plugins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  manifest JSON NOT NULL,
  enabled INTEGER DEFAULT 1,
  version TEXT,
  installation_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personas_updated ON personas(updated_at);
CREATE INDEX IF NOT EXISTS idx_personas_name ON personas(name);

CREATE INDEX IF NOT EXISTS idx_memory_entities_persona ON memory_entities(persona_id);
CREATE INDEX IF NOT EXISTS idx_memory_entities_type ON memory_entities(type);
CREATE INDEX IF NOT EXISTS idx_memory_entities_tier ON memory_entities(tier);
CREATE INDEX IF NOT EXISTS idx_memory_entities_updated ON memory_entities(updated_at);
CREATE INDEX IF NOT EXISTS idx_memory_entities_accessed ON memory_entities(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_memory_entities_importance ON memory_entities(importance_score);

CREATE INDEX IF NOT EXISTS idx_memory_relationships_from ON memory_relationships(from_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_to ON memory_relationships(to_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_type ON memory_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins(name);
CREATE INDEX IF NOT EXISTS idx_plugins_enabled ON plugins(enabled);

-- Full-Text Search for memory content (optional, can be enabled when needed)
-- CREATE VIRTUAL TABLE IF NOT EXISTS memory_search USING fts5(content, metadata);

-- Insert migration record
INSERT OR IGNORE INTO _migrations (id) VALUES ('001_init.sql');
