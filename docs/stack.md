# Technology stack

This document describes the target stack for TaskForge and why it fits a production realtime collaboration system.

## Current state

The repository currently contains a minimal Express HTTP skeleton.

## Target stack

### Backend

- **Runtime**: Node.js
- **Language**: TypeScript (strict)
- **HTTP framework**: Express (initially)
- **Database**: PostgreSQL
- **Data access**: Prisma (migrations + type-safe queries)
- **Authentication**: JWT access tokens + refresh tokens
- **Validation**: Zod (request validation and shared types)
- **Realtime**: WebSockets with room semantics (team/task scoped)

Why this combination:

- Express keeps the transport layer small and explicit.
- Prisma provides a pragmatic path to production migrations and type safety.
- Zod makes input validation deterministic and keeps API contracts readable.

### Frontend

- **Framework**: React + TypeScript
- **State**: Zustand (small surface area) or Redux Toolkit (if the app grows complex)
- **Realtime client**: WebSocket client with explicit event contracts

### Infrastructure

- `.env` driven configuration (never commit secrets)
- Docker-ready setup for local dev (Postgres, optional Redis)
- Structured JSON logging and health endpoints

## Alternatives considered

- **NestJS**
  Good for larger teams and strong conventions, but adds framework weight early. We can reassess once the domain grows.

- **Socket.IO vs ws**
  Socket.IO is convenient (rooms, reconnection, fallbacks). `ws` is simpler and more explicit. The deciding factor will be multi-instance scaling and the desired client ergonomics.
