-- ElectronPajamas Database Schema
-- SQLite database schema for personas, memories, and conversations

-- =============================================================================
-- PERSONAS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    personality_traits TEXT DEFAULT '[]', -- JSON array
    personality_temperament TEXT DEFAULT 'balanced',
    personality_communication_style TEXT DEFAULT 'conversational',
    memory_max_memories INTEGER DEFAULT 1000,
    memory_importance_threshold INTEGER DEFAULT 50,
    memory_auto_optimize BOOLEAN DEFAULT TRUE,
    memory_retention_period INTEGER DEFAULT 30,
    memory_categories TEXT DEFAULT '["conversation","learning","preference","fact"]', -- JSON array
    memory_compression_enabled BOOLEAN DEFAULT TRUE,
    privacy_data_collection BOOLEAN DEFAULT TRUE,
    privacy_analytics_enabled BOOLEAN DEFAULT FALSE,
    privacy_share_with_researchers BOOLEAN DEFAULT FALSE,
    privacy_allow_personality_analysis BOOLEAN DEFAULT TRUE,
    privacy_memory_retention BOOLEAN DEFAULT TRUE,
    privacy_export_data_allowed BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- MEMORY ENTITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS memory_entities (
    id TEXT PRIMARY KEY,
    persona_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT DEFAULT '',
    content TEXT NOT NULL,
    summary TEXT DEFAULT '',
    tags TEXT DEFAULT '[]', -- JSON array
    importance INTEGER DEFAULT 50,
    memory_tier TEXT DEFAULT 'active',
    embedding TEXT DEFAULT NULL, -- JSON array of numbers
    embedding_model TEXT DEFAULT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- =============================================================================
-- CONVERSATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    persona_id TEXT NOT NULL,
    title TEXT NOT NULL,
    messages TEXT DEFAULT '[]', -- JSON array of message objects
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Persona indexes
CREATE INDEX IF NOT EXISTS idx_personas_active ON personas(is_active);
CREATE INDEX IF NOT EXISTS idx_personas_created_at ON personas(created_at);

-- Memory entity indexes
CREATE INDEX IF NOT EXISTS idx_memory_entities_persona_id ON memory_entities(persona_id);
CREATE INDEX IF NOT EXISTS idx_memory_entities_type ON memory_entities(type);
CREATE INDEX IF NOT EXISTS idx_memory_entities_importance ON memory_entities(importance);
CREATE INDEX IF NOT EXISTS idx_memory_entities_memory_tier ON memory_entities(memory_tier);
CREATE INDEX IF NOT EXISTS idx_memory_entities_created_at ON memory_entities(created_at);
CREATE INDEX IF NOT EXISTS idx_memory_entities_deleted_at ON memory_entities(deleted_at);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_persona_id ON conversations(persona_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

-- Personas updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_personas_updated_at
    AFTER UPDATE ON personas
    FOR EACH ROW
BEGIN
    UPDATE personas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Memory entities updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_memory_entities_updated_at
    AFTER UPDATE ON memory_entities
    FOR EACH ROW
BEGIN
    UPDATE memory_entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Conversations updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_conversations_updated_at
    AFTER UPDATE ON conversations
    FOR EACH ROW
BEGIN
    UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END; 