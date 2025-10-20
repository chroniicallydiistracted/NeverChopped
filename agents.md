# Project Overview: Live Fantasy Football Draft Party App

This project is a custom, family-friendly Live Draft Party application for a 10-team fantasy football league. The goal is to create a big-screen experience on par with FanDraft for a live, in-person snake draft.

- **Audience**: League members participating in a live, in person draft party.
- **Source of Truth**: This application is the source of truth during the draft. It imports pre-draft data from the Sleeper API (read-only) and exports final results for manual entry back into Sleeper.
- **Key Features**:
  - Big-screen draft board (grid view).
  - Real-time updates for all connected clients.
  - Commissioner console for pick entry, clock management, and undo.
  - Owner remotes for suggesting picks and managing queues.
  - Spoken pick announcements using Text-to-Speech (TTS).
  - Walk-up music for drafted players.
  - Local-first hosting via Docker on a single machine for LAN access.

# Tech Stack

The application is a TypeScript monorepo running in Docker Compose.

- **Backend (`/api`)**:
  - **Runtime**: Node.js 20 LTS
  - **Framework**: Hono
  - **Real-time**: Socket.IO 4
  - **Database**: PostgreSQL 15
  - **Language**: TypeScript

- **Frontend (`/web`)**:
  - **Framework**: React 18 with Vite
  - **State Management**: Zustand
  - **Routing**: React Router
  - **Styling**: Tailwind CSS
  - **Language**: TypeScript (TSX)

- **Infrastructure**:
  - **Containerization**: Docker Compose
  - **Reverse Proxy**: Caddy 2 (handles routing to `api` and `web` services)
  - **Package Manager**: `pnpm` (in a workspace configuration)

- **External APIs**:
  - **Sleeper API**: Read-only import of league, user, roster, draft, and player data.
  - **ElevenLabs API**: Primary provider for streaming Text-to-Speech.
  - **Google Cloud TTS API**: Fallback provider for Text-to-Speech.

# Coding Guidelines

- **Code Style**:
  - Use **spaces** for indentation, not tabs.
  - **Semicolons are required** at the end of statements in TypeScript/JavaScript.
  - Adhere to the existing ESLint and Prettier configurations.
- **Server Management**:
  - **ALWAYS use `./server.sh` for starting, stopping, and restarting the application**.
  - Available commands: `./server.sh start`, `./server.sh stop`, `./server.sh restart`, `./server.sh status`
  - Never manually start services with `npm run dev` or `docker compose up` - use the script!
  - The script handles port cleanup, dependency installation, database migrations, and proper process management.
- **TypeScript**:
  - **Strict mode is enabled**. Use explicit types and avoid `any` where possible.
  - Use modern features like `async/await` for promises.
  - File naming:
    - React Components: `PascalCase.tsx` (e.g., `BigScreen.tsx`)
    - Other TS files: `kebab-case.ts` (e.g., `static-server.js`)
- **API Design**:
  - Follow RESTful principles for HTTP endpoints.
  - Use the `tx` helper for database transactions to ensure atomicity.
  - WebSocket events should be clearly defined and typed.
- **General**:
  - Write clear, concise comments for complex logic.
  - Keep functions small and focused on a single responsibility.
  - All user-facing text should be friendly and clear.

# Project Structure

The project is organized as a monorepo with services in dedicated folders.

- `Caddyfile`: Caddy reverse proxy configuration. Maps `/api` to the backend and `/` to the frontend.
- `docker-compose.yml`: Defines the `caddy`, `api`, `web`, and `db` services.
- `package.json`: Root `pnpm` workspace configuration.
- `docs/`: Contains all specification and planning documents, including `SPEC-001_Implementation_Playbook.md`.
- `api/`: The backend Hono application.
  - `src/db/`: Database schema (`schema.sql`) and migration logic.
  - `src/routes/`: Hono route handlers for different API resources.
  - `src/import/`: Logic for importing data from the Sleeper API.
  - `src/tts/`: Text-to-Speech integration with ElevenLabs and Google.
- `web/`: The frontend React (Vite) application.
  - `src/components/`: Reusable React components for the different UIs (Big Screen, Commish, Owner).
  - `src/lib/`: Client-side API helpers and state management (`api.ts`).

# Available Resources & Scripts

- **Development Environment**:
  - The entire stack is orchestrated by `docker-compose.yml`.
  - Run `docker compose up --build` to start all services.
- **Database Migration**:
  - The database schema is in `api/src/db/schema.sql`.
  - The migration is run via a script in the `api` service. The `package.json` in that directory contains a `migrate` script.
- **Sleeper Data Import**:
  - A one-time import is required to populate the database. This is handled by `api/src/import/sleeper.ts`. It can be triggered by an admin script or a temporary admin endpoint.
- **Quickstart**:
  - The `quickstart.sh` script provides a guided setup for cloning, configuring, and running the application.
- **Testing**:
  - The project currently relies on manual end-to-end testing as outlined in the phase plan.
  - Client-side exports use `html2canvas` and `jsPDF`.
