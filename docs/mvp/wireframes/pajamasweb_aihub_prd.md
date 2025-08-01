# PajamasWeb AI Hub — Detailed PRD v1.0+

---

## 🏆 Vision

An **offline-first AI marketplace & personal AI system** — users can:

- Buy AI tools/instruments/workflows
- Build their own workflows & instruments
- Run everything locally — no cloud lock-in
- Manage AI “memory” that grows smarter over time
- Have an AI agent that optimizes memory for efficiency and accuracy

---

## 🌟 Core User Stories

- "I want to buy AI tools and use them offline."
- "I want to build custom workflows using my tools."
- "I want my AI to learn from history but stay fast."
- "I want my AI to manage its own memory so I don’t have to."
- "I want to choose — one-time purchase or subscription."

---

## 📚 Feature Set

---

### 1️⃣ Core App

| Feature                 | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| Cross-platform app      | Electron (v1), native installer Win/Mac/Linux        |
| Offline-first           | Works offline after install, checks licenses locally |
| Accounts + license mgmt | User accounts, purchase history, license status      |
| Optional subscription   | Supports both one-time and subscription models       |
| Central Dashboard       | View tools, instruments, workflows, memory status    |

---

### 2️⃣ Marketplace

| Feature            | Description                               |
| ------------------ | ----------------------------------------- |
| Browse categories  | Tools / Instruments / Workflows / Bundles |
| Filter by type     | One-time purchase / Subscription / Free   |
| Stripe integration | Handles purchase + subscription mgmt      |
| License keys       | Tied to user account, local activation    |
| Download + install | One-click install to Plugins folder       |
| Ratings + reviews  | (planned for v1.2)                        |

---

### 3️⃣ Plugin System

| Feature         | Description                                     |
| --------------- | ----------------------------------------------- |
| Tools           | Single-use functions (SEO analyzer, Summarizer) |
| Instruments     | Stateful agents (Bookkeeper, Marketing AI)      |
| Workflows       | Multi-step sequences                            |
| Manifest format | JSON/YAML manifest                              |
| Installation    | Per-plugin folder with code + models + storage  |
| Version mgmt    | Updates via Marketplace                         |
| License mgmt    | License key per plugin                          |
| API gateway     | Local API exposes plugins (REST/WS)             |

---

### 4️⃣ Builder

| Feature                  | Description                                         |
| ------------------------ | --------------------------------------------------- |
| Workflow Builder         | Drag & drop canvas (N8N-style)                      |
| Use owned tools          | Only can use purchased tools                        |
| Save workflows           | As JSON/graph files                                 |
| Run manually / scheduled | Cron / on-demand runs                               |
| Export workflows         | JSON export/import (future: share with other users) |

\| Instrument Builder       | Compose Instruments from: Personality + Tools + Workflows | | Editable behaviors       | Set conversation style, allowed actions | | Save Instruments         | Personal or Marketplace template |

---

### 5️⃣ Memory System

#### Hybrid Memory Model

| Layer                           | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| Vector DB (pgvector)            | Fast semantic recall (fuzzy memory)                  |
| Relational DB (Postgres/SQLite) | Explicit structured memory (entities, events, tasks) |
| Linkage between layers          | Vector entries linked to relational facts/events     |

**Data Lifecycle:**

- New facts: stored in relational + embedded into vector
- Stale data: summarized, compressed
- Very old: archived to disk
- All controlled by Memory Optimizer Agent

#### Relational Schema Example

**Entities:** | id | type | name | tags | last\_seen | importance\_rating |

**Events:** | id | entity\_id | type | timestamp | details\_json | embedding\_id |

**Tasks:** | id | assigned\_to | status | timestamps | result\_summary |

**Relations:** | id | from\_entity | to\_entity | relation\_type | created\_at |

---

### 6️⃣ Memory Optimizer Agent

Name suggestion: “Memory Steward”

| Feature                  | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| Monitors usage           | Logs query rates, plugin access, memory growth             |
| Summarizes stale vectors | Compresses old embeddings (meta embeddings)                |
| Archives old records     | Moves to cold storage when unused                          |
| Re-indexes active data   | Keeps hot index fast                                       |
| Suggests deletions       | Notifies user of redundant/outdated data                   |
| User config              | User sets thresholds (when to summarize, when to archive)  |
| Scheduled runs           | Background agent runs nightly / weekly                     |
| Report to UI             | “Last optimized: June 20” — “10,123 embeddings summarized” |
| API                      | Exposes status, triggers manual optimize                   |

#### Memory Optimizer Agent Task List

| Task                              | Example Trigger                 |
| --------------------------------- | ------------------------------- |
| Summarize stale embeddings        | No reference in 60 days         |
| Archive unused workflows          | No runs in 90 days              |
| Reindex hot entities              | High query rate detected        |
| Prune redundant embeddings        | > 85% similarity, no recent use |
| Optimize relational table indexes | Schema change or new plugin     |
| Notify user of memory trends      | Storage growth > threshold      |

---

### 7️⃣ User Interface

| Tab                | Sub-features                                 |
| ------------------ | -------------------------------------------- |
| Home Dashboard     | Status of AI Hub, memory health              |
| Marketplace        | Buy/install/update tools                     |
| My Tools           | View + manage installed plugins              |
| Builder            | Workflow / Instrument builder                |
| Workflows          | Run/manage workflows                         |
| Instruments        | Launch/manage instruments                    |
| Memory Maintenance | View memory status, run optimizer, view logs |
| Settings           | Accounts, licenses, preferences              |

---

### 8️⃣ Folder Structure

/PajamasWeb-Hub
|
|-- /hub-app (Electron)
/plugins (installed tools)
/plugins/seo-optimizer
  /embedding_store.db
  /models/
  /run.py
/workflows
/my-lead-funnel.json
/memory
/vector_store.pgvector
/relational.db (sqlite or pg)
/Memory-Steward-Agent/
/logs/
/hub-config.json

---

### 🚀 Development Phases (Detailed)

| Phase | Key Features                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------- |
| v1.0  | Core app, Marketplace, Plugin mgmt, LLM runner, Example plugins                                   |
| v1.1  | Workflow Builder v1, Instrument Builder v1, Memory System v1 (manual optimize)                    |
| v1.2  | Ratings/reviews, Template Marketplace, Memory Optimizer full agent, cold storage, full Memory tab |
| v1.3+ | 3rd-party plugin dev support, Team licenses, API integrations, Developer SDK                      |

---

### 🌟 Strategic Advantages

- Offline-first AI marketplace — unique positioning
- Buy or build — encourages creativity
- Self-maintaining memory system — differentiates from static pgvector setups
- Supports both casual users and power users
- Efficient + scalable — memory doesn’t bloat over time

---

**Conclusion:**

You now have a strong, unique architecture — blending:

- Marketplace
- Local AI tools
- Builder
- Hybrid memory
- AI-maintained memory optimizer

This positions PajamasWeb AI Hub as a top contender in the local AI market!
