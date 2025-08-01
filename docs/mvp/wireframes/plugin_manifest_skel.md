# PajamasWeb AI Hub — Plugin Manifest & Skeleton (v1.0)

---

## 📄 Plugin Manifest (`plugin.json`)

```json
{
  "name": "AI Bookkeeper",
  "version": "1.2.0",
  "type": "instrument",  // tool, instrument, workflow
  "license": "one-time", // or subscription
  "author": "PajamasWeb",
  "description": "An AI-driven bookkeeping assistant that automates accounting tasks.",
  "tags": ["finance", "accounting", "assistant"],
  "dependencies": {
    "ollama": true,
    "pandas": ">=1.4.0",
    "python": ">=3.10"
  },
  "embedding_support": true,
  "workflow_compatible": true,
  "instrument_compatible": true,
  "api": {
    "endpoints": [
      "/plugin/bookkeeper/run",
      "/plugin/bookkeeper/generate_report"
    ]
  },
  "memory_usage": {
    "vector_store": true,
    "relational_store": true
  },
  "entry_point": "run.py",
  "resources": {
    "models": "models/",
    "config": "config.yaml",
    "docs": "README.md"
  }
}
```

---

## 📂 Plugin Folder Structure

/plugins/ai-bookkeeper/
├── plugin.json
├── run.py
├── requirements.txt
├── config.yaml
├── models/  (optional)
│   ├── model_weights.bin
├── embedding_store.db  (if plugin uses local vectors)
├── README.md
├── utils/  (helper functions)
├── templates/  (report templates, etc.)
└── logs/

---

## 🔍 Plugin Capabilities

| Key                     | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `type`                  | Defines behavior (tool / instrument / workflow) |
| `embedding_support`     | Whether plugin stores embeddings                |
| `workflow_compatible`   | Can this plugin be called in a user workflow?   |
| `instrument_compatible` | Can it be used by a user-built instrument?      |
| `api.endpoints`         | Routes exposed to the local API Gateway         |
| `memory_usage`          | What kind of memory does this plugin use?       |

---

## 👥 Example `run.py`

```python
import json
from fastapi import FastAPI

app = FastAPI()

@app.post("/plugin/bookkeeper/run")
async def run_bookkeeper(data: dict):
    # Load data
    # Run tool logic
    result = {"summary": "Bookkeeping complete!", "details": data}
    return result

@app.post("/plugin/bookkeeper/generate_report")
async def generate_report(params: dict):
    # Generate report
    report = {
        "report_title": "Monthly Financial Summary",
        "total_revenue": 12000,
        "total_expenses": 5000
    }
    return report
```

---

## 🔌 How Plugins Integrate

- Hub scans `/plugins/` for valid `plugin.json`
- Registers endpoints to local API Gateway
- Provides list to Builder UI
- Memory Steward watches plugin memory (if used)
- User can combine plugins in Workflows or Instruments

---

## 🚀 Next

If you want, I can also generate:

- Full **example Tool manifest**
- Full **example Instrument manifest**
- Example **Workflow plugin manifest**
- Builder UI — how plugins appear to user (select, chain, configure)

---
