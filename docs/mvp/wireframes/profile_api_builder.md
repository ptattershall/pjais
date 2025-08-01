# PajamasWeb AI Hub — User Profile + API Key Mgmt + Advanced Builder Wireframes

---

## 👤 User Profile UI Wireframe

```mermaid
graph TD
  A[User Profile]
  A --> B[Basic Info]
  B --> B1[Display Name]
  B --> B2[Email Address]
  B --> B3[Profile Picture]

  A --> C[Account Details]
  C --> C1[Plan: Free / Pro / Team License]
  C --> C2[Purchase History]

  A --> D[Security Settings]
  D --> D1[Password Reset]
  D --> D2[2FA Management]

  A --> E[Activity Log]
  A --> F[Developer Profile]
  F --> F1[Submitted Plugins]
  F --> F2[Developer Rating]
```

---

## 🔑 API Key Management UI Wireframe

```mermaid
graph TD
  A[API Key Management]
  A --> B[Active API Keys List]
  A --> C[Generate New API Key]
  C --> C1[Name/Label Input]
  C --> C2[Permissions Scope]

  A --> D[API Key Status]
  D --> D1[Active]
  D --> D2[Revoked]

  A --> E[Revoke API Key Button]
  A --> F[API Usage Statistics]
  F --> F1[Requests per Key]
  F --> F2[Last Used Timestamp]
```

---

## 🌐 Advanced Builder UI (Workflows + Nested Workflows)

```mermaid
graph TD
  A[Advanced Builder Home]
  A --> B[Workflow Builder Tab]
  A --> C[Instrument Builder Tab]

  B --> D[Main Workflow Canvas]
  D --> E[Tool Nodes]
  D --> F[Condition Nodes]
  D --> G[Sub-workflow Nodes]
  G --> G1[Linked Saved Workflows]
  D --> H[Output Nodes]

  B --> I[Version Control]
  I --> I1[Save Versions]
  I --> I2[Restore Version]

  B --> J[Import/Export JSON]

  C --> K[Define Personality Block]
  C --> L[Assign Tool Access]
  C --> M[Set Behavioral Logic]
  C --> N[Advanced Memory Settings per Instrument]
```

---

## 🌟 Summary

This doc contains:

- **User Profile UI wireframe**
- **API Key Management UI wireframe**
- **Advanced Builder UI wireframe (nested workflows, versioning)**

You can:

- Add to v1.2 Builder feature set
- Include User Profile & API for Dev Portal / Pro Users
- Feed directly to frontend for implementation

---
