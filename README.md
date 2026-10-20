# Octa — Lightweight All-in-One Developer Workspace & Cockpit

Octa is a blazingly fast, low-memory desktop workstation engineered for modern developers. It consolidates databases, Docker, terminal sessions, API testing, code editing, and an integrated localhost browser into a unified, high-performance native desktop application powered by **Go** and **Wails v2**.

---

## Key Environments & Features

### 1. Integrated Localhost Browser
- **Minimal Resource Footprint**: Built specifically for local developer services without the bloat and memory overhead of heavy external browsers.
- **Multi-Tab Architecture**: Open and manage multiple local web services simultaneously.
- **Dynamic Port Shortcuts & Search History**: Quick-switch buttons automatically reflect your most frequently used localhost ports (e.g. 3000, 5173, 8000, 9001).
- **Persistent State**: Navigated pages retain their live state without reloading when switching between Octa workspaces.
- **Developer Services Ready**: Built-in cookie & header handling for local consoles including MinIO S3 Console, RabbitMQ Management, and local OAuth flows.
- **Rich Context Menu**: Native right-click menu with Back, Forward, Reload, Copy, and Paste.

### 2. Code Reviewer & Editor
- **Monaco Engine with Dark 2026 Theme**: Fast, syntax-highlighted code editor with customizable font sizes, line diffs, and auto-save options.
- **Cross-File Go to Definition (`Ctrl + Click` / `F12`)**:
  - Full support for TypeScript, JavaScript, React, NestJS, Express, and Python (`.py`).
  - Seamlessly resolves multi-line imports, `tsconfig.base.json` / `tsconfig.json` path aliases (e.g. `@scope/...`), and re-export chains (`export * from '...'`).
- **Global Project Search**:
  - Dedicated search sidebar tab to scan entire project files.
  - Automatically excludes `node_modules`, `.nx`, `.cache`, `dist`, `build`, `tmp`, and binary files.
  - Results grouped by file with line snippets; clicking immediately navigates, centers, and highlights the target match.
- **In-File Quick Search (`Ctrl + F`)**:
  - Top-mounted find widget with live occurrence highlighting and navigation across the current file.
- **Git Line Diffs**: Real-time gutter indicators for added, modified, and deleted lines.

### 3. Redis Workbench & Explorer
- **Visual Key Explorer**: Tree view and flat view with namespace grouping (`user:session:*`).
- **Multi-Type Key Editor**: Direct viewing and editing for Strings, Hashes, Lists, Sets, and Sorted Sets.
- **Live TTL Countdown & Expiration**: Real-time ticking TTL counter that automatically closes tabs when a key expires.
- **Stale Key Detection**: Periodically and on window focus validates open keys against the server, automatically closing tabs if a key is purged from Redis.

### 4. Docker Management
- **Runtime Provider Support**: Connect via native Windows Named Pipes or WSL2 Linux TCP (`tcp://127.0.0.1:2375`).
- **Container Control**: Real-time container logs, lifecycle management, and terminal exec.
- **Configurable Default Filter**: Configure whether the "Running only" filter starts On or Off by default in App Settings.

### 5. Database Studio & Query Workbench
- **Supported Engines**: PostgreSQL, MySQL, SQLite, MongoDB.
- **Schema Visualizer**: Interactive entity-relationship graphs and table structure inspector.
- **Execution History & Export**: Query logs, execution metrics, and table exports.

### 6. Integrated Terminals & Command Palette
- **Low-Latency PTY Sessions**: Native PowerShell, WSL, and Command Prompt tabs.
- **Universal Command Palette (`Ctrl + K`)**: Fast workspace and action switching.

---

## Tech Stack & Architecture

- **Backend**: Go 1.22+, Wails v2
- **Frontend**: React 18, TypeScript, TailwindCSS, Monaco Editor, Lucide Icons
- **Design Philosophy**: Strict modularity (all code files kept under 250 LOC for maximum maintainability)

---

## Getting Started & Development

### Prerequisites
- [Go 1.22+](https://golang.org/dl/)
- [Node.js 18+](https://nodejs.org/)
- [Wails CLI v2](https://wails.io/docs/gettingstarted/installation)

### Run in Development Mode
```bash
wails dev
```

### Build Production Binary
```bash
wails build
```
Output executable: `build/bin/Octa.exe`

### Build Windows Installer (Inno Setup)
```bash
& "C:\Program Files\Inno Setup 7\ISCC.exe" build\bin\octa-setup.iss
```
Output installer: `build/bin/Output/octa-setup.exe`
