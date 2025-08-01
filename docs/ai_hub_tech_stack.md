# PajamasWeb AI Hub — Finalized Tech Stack & Choices

---

## 🎨 UI Layer

| Library | Notes |
| ------- | ----- |
|         |       |

| **React**          | Core UI library for building components |
| **Shadcn/ui**      | Component library built on Tailwind CSS and Radix UI |
| **Radix UI**       | Headless UI primitives for accessibility |
| **Framer Motion**  | For animations and complex transitions |

---

## 🧠 State & Data Management

| Tool                         | Notes                                    |
| ---------------------------- | ---------------------------------------- |
| **TanStack Query**           | Server sync & data caching               |
| **Zustand**                  | UI state & local Persona state           |
| **Redux Toolkit (optional)** | If deep normalized state is needed later |

---

## 🗃️ Local Database / Offline

| Option                             | Notes                                                  |
| ---------------------------------- | ------------------------------------------------------ |
| **LiveStore**                      | Real-time local-first database with SQLite + sync     |
| **SQLite (native)**               | Enhanced structured storage with better performance    |
| **ElectricSQL / Triplit (future)** | Optional future federated sync support                 |

---

## ⚙️ Electron App

| Feature                | Tool                                |
| ---------------------- | ----------------------------------- |
| **Electron v36+**      | Core app shell                      |
| **Vite**               | React app build system              |
| **electron-builder**   | Packaging and installer creation    |
| **Express or Fastify** | Internal REST/WebSocket API         |
| **IPC Manager**        | For Renderer <-> Main communication |

---

## 🧠 AI & Engine Integration

| Engine                   | Notes                         |
| ------------------------ | ----------------------------- |
| **Ollama**               | LLaMA.cpp-based LLMs          |
| **LLaMA.cpp**            | Local models integration      |
| **LM Studio (optional)** | Extra model hosting if needed |

---

## 🛠️ Testing

| Tool                      | Notes                              |
| ------------------------- | ---------------------------------- |
| **Jest**                  | Unit tests                         |
| **React Testing Library** | Component tests                    |
| **Spectron**              | Electron E2E tests                 |
| **Playwright (optional)** | Advanced E2E + browser-based tests |

---

## 💻 Styling / Themes

| Option           | Notes                                  |
| ---------------- | -------------------------------------- |
| **Tailwind CSS** | Primary utility-first CSS framework    |
| **PostCSS**      | For processing and extending CSS       |
| **CSS Modules**  | For component-level style encapsulation|

---

## 🗂️ Packaging & Windows

- **Custom window chrome** → Frameless styled windows (Electron API)
- **Multi-window support** → Persona Profiles / Dev Tools / Marketplace as separate views

---

## Example Project Layout

/pjais
├── /src
│   ├── /main               # Main Process
│   │   ├── main.ts         # Application entry point
│   │   ├── menu.ts         # Application menu
│   │   └── ...             # Other main process files (IPC, services)
│   ├── /renderer           # Renderer Process (React)
│   │   ├── main.tsx        # React entry point
│   │   ├── App.tsx         # Main React component
│   │   ├── /components     # React components
│   │   └── ...             # Other renderer files (pages, hooks, styles)
│   ├── /preload            # Preload scripts
│   │   └── index.ts
│   └── /shared             # Shared code (types, utils)
│       ├── /types
│       └── /utils
├── /dist                   # Build output
└── package.json

---

## Dev Scripts Example

```json
"scripts": {
  "start": "electron-forge start",
  "package": "electron-forge package",
  "make": "electron-forge make",
  "publish": "electron-forge publish",
  "lint": "eslint --ext .ts,.tsx ."
}
```

---
