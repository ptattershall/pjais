# PajamasWeb AI Hub — Memory Schema (v1.0)

---

## 🧵 Overview

A **hybrid memory model** combining:

- **Vector DB (pgvector)**: Fast semantic search and fuzzy memory
- **Relational DB (Postgres/SQLite)**: Structured knowledge (entities, events, relationships)
- **Linkage between layers**: Each embedding can be linked to structured facts/events for causality and reasoning

A background agent (**Memory Steward**) maintains and optimizes memory automatically.

---

## 📊 Core Tables & Schemas

---

### 1️⃣ **Vector DB: pgvector**

**Table: `embeddings`**

| Column Name         | Type            | Notes |
|---------------------|-----------------|-------|
| id                  | UUID / Serial PK | Unique ID |
| embedding           | VECTOR(1536)     | pgvector field |
| created_at          | TIMESTAMP        | |
| last_accessed       | TIMESTAMP        | updated on use |
| tags                | TEXT[]           | labels |
| related_entity_id   | UUID (FK)        | link to relational entity |
| importance_rating   | INT (0-100)      | for prioritization |
| archive_status      | ENUM (active, summarized, archived) | |

---

### 2️⃣ **Relational DB: Postgres / SQLite**

#### **Entities**

| Column Name         | Type      | Notes |
|---------------------|-----------|-------|
| id                  | UUID PK   | |
| type                | TEXT      | e.g., Person, Project, Concept |
| name                | TEXT      | |
| tags                | TEXT[]    | |
| last_seen           | TIMESTAMP | |
| importance_rating   | INT       | |

---

#### **Events**

| Column Name         | Type            | Notes |
|---------------------|-----------------|-------|
| id                  | UUID PK         | |
| entity_id           | UUID (FK)       | links to Entities |
| type                | TEXT            | Event type |
| timestamp           | TIMESTAMP       | |
| details_json        | JSONB            | any structured data |
| embedding_id        | UUID (FK)       | links to embedding if applicable |

---

#### **Tasks**

| Column Name         | Type            | Notes |
|---------------------|-----------------|-------|
| id                  | UUID PK         | |
| assigned_to         | TEXT / FK       | Instrument / Agent |
| status              | ENUM (pending, active, completed, failed) | |
| created_at          | TIMESTAMP       | |
| updated_at          | TIMESTAMP       | |
| result_summary      | TEXT            | short summary |

---

#### **Relations**

| Column Name         | Type            | Notes |
|---------------------|-----------------|-------|
| id                  | UUID PK         | |
| from_entity         | UUID (FK)       | |
| to_entity           | UUID (FK)       | |
| relation_type       | TEXT            | e.g., parent_of, derived_from, caused_by |
| created_at          | TIMESTAMP       | |

---

### 3️⃣ **Maintenance & Optimizer Support Tables**

#### **Optimizer Logs**

| Column Name         | Type            | Notes |
|---------------------|-----------------|-------|
| id                  | UUID PK         | |
| run_at              | TIMESTAMP       | |
| optimizer_action    | TEXT            | e.g., summarize_embeddings |
| affected_records    | INT             | |
| notes               | TEXT            | optional |

#### **Archive Table (cold storage)**

**Table: `archived_embeddings`**

| Column Name         | Type            | Notes |
|---------------------|-----------------|-------|
| id                  | UUID PK         | original embedding id |
| compressed_embedding| VECTOR(512) or BLOB | summarized form |
| archived_at         | TIMESTAMP       | |
| source_record       | JSONB           | original metadata |

---

## 🤖 Memory Steward Agent: Key Responsibilities

| Task                               | Description |
|------------------------------------|-------------|
| Summarize stale embeddings          | Aggregate + compress older embeddings |
| Archive unused workflows/events     | Move to cold storage (disk) |
| Reindex hot entities                | Keep fast retrieval optimized |
| Prune redundant embeddings          | De-duplicate and clean |
| Maintain relational indexes         | Optimize queries |
| Track memory growth + trends        | Monitor size/performance |

---

## 🌐 API Access to Memory

| Endpoint                           | Purpose |
|------------------------------------|-------------|
| `/memory/query_embedding`          | Semantic search on embeddings |
| `/memory/get_entity`               | Fetch structured entity info |
| `/memory/get_related_events`       | Trace related events |
| `/memory/optimizer_status`         | Show latest optimization runs |
| `/memory/trigger_optimizer`        | Manually trigger Memory Steward |

---

## 🚀 Future Expansions

- Support **versioned snapshots** of memory
- Allow user-driven "memory shaping"
- Enable export/import of memory graphs
- Graphical explorer for memory visualization

---

## 📅 Summary

This hybrid schema provides:

- **Fast semantic recall** (pgvector)
- **Structured causal history** (relational db)
- **Self-maintaining efficiency** (optimizer agent)

Ideal for:

- **Instruments** (contextual agents)
- **Workflows** (stateful task chains)
- **User memory** (long-term relevance)

---
