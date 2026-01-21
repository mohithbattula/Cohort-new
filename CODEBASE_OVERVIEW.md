# Cohort‑new Codebase Overview

```mermaid
flowchart TB
    subgraph Root[Project Root]
        A[App.tsx]
        B[index.tsx]
        C[package.json]
        D[vite.config.ts]
        E[.env]
        subgraph Src[src]
            F[components/]
            G[services/]
            H[utils/]
            I[database/]
            J[styles/]
        end
    end
    A --> B
    B --> F
    B --> G
    B --> H
    B --> I
    B --> J
    C --> A
    D --> A
    E --> A
```

The diagram shows the high‑level structure:
- **App.tsx / index.tsx** – entry points for the React application.
- **components/** – reusable UI components.
- **services/** – API wrappers and business‑logic services.
- **utils/** – helper functions and shared utilities.
- **database/** – schema definitions / migration scripts.
- **styles/** – Tailwind configuration and global CSS.
- **package.json**, **vite.config.ts** – project and build configuration.
- **.env** – environment variables used at runtime.
```
