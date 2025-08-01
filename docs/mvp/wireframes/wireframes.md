# PajamasWeb AI Hub — Wireframes (Markdown + Mermaid)

---

## 🌐 Marketplace Wireframe

```mermaid
graph TD
  A[Marketplace Home]
  A --> B[Categories]
  A --> C[Search Bar]
  A --> D[Filters]
  B --> E[Tools]
  B --> F[Instruments]
  B --> G[Workflows]
  B --> H[Bundles]
  D --> I[License: One-time / Subscription / Free]
  D --> J[Sort: Popular, New, Updated]
  E --> K[Tool Listing]
  F --> L[Instrument Listing]
  G --> M[Workflow Listing]
  H --> N[Bundle Listing]
```

---

## 🔌 Plugin Manager Wireframe

```mermaid
graph TD
  A[Plugin Manager]
  A --> B[Installed Plugins List]
  B --> C[Plugin Details Panel]
  C --> D[Launch Plugin]
  C --> E[Update Plugin]
  C --> F[Remove Plugin]
  C --> G[License Status]
  C --> H[Memory Usage Info]
```

---

## 📈 Builder UI — Workflows & Instruments

```mermaid
graph TD
  A[Builder Main]
  A --> B[Workflow Builder]
  A --> C[Instrument Builder]
  B --> D[Canvas (Drag & Drop)]
  D --> E[Add Tool]
  D --> F[Add Condition]
  D --> G[Set Output]
  D --> H[Save Workflow]
  C --> I[Define Personality]
  C --> J[Assign Tools]
  C --> K[Configure Behavior]
  C --> L[Save Instrument]
```

---

## 📊 Memory Maintenance Tab

```mermaid
graph TD
  A[Memory Maintenance Dashboard]
  A --> B[Memory Health Overview]
  A --> C[Last Optimized Timestamp]
  A --> D[Run Optimization Button]
  A --> E[Optimizer Logs]
  A --> F[Manual Controls]
  F --> G[Summarize Now]
  F --> H[Archive Now]
  F --> I[Reindex Hot Memory]
  F --> J[Prune Redundant]
```

---

## 🌟 Summary

These Mermaid diagrams serve as the first wireframe spec for:

- Marketplace
- Plugin Manager
- Builder (Workflows + Instruments)
- Memory Maintenance

💡 You can:

- Copy them into GitHub Markdown
- Render them in VSCode + Mermaid plugins
- Export SVG/PNG for visual use
- Hand to designers/devs as the starting structure

---
