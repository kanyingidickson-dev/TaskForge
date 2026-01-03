# TaskForge

TaskForge is a real-time team task tracker for managing tasks, deadlines, and collaboration with live updates.

## Project goals

- **Realtime collaboration**
  Live task updates, notifications, and presence.
- **Production practices**
  Clear layering, strong security defaults, predictable error handling, and observable services.
- **Open-source ready**
  Clean contributor experience, documented architecture, and incremental delivery.

## Architecture (high level)

- **API**
  HTTP REST endpoints for authentication, teams, tasks, comments, and activity logs.
- **Realtime gateway**
  WebSocket transport for low-latency task updates, notifications, and presence.
- **Database**
  PostgreSQL as the system of record (normalized schema + indexing strategy).
- **Cache / pubsub (scaling)**
  Redis as an optional component for rate limiting, presence, and WebSocket fanout in multi-instance deployments.

See:

- `docs/architecture.md`
- `docs/data-model.md`
- `docs/realtime.md`
- `docs/stack.md`

## Development status

This repository currently contains an Express-based HTTP skeleton and tests. The next steps are to formalize the architecture and evolve the codebase into a production-grade realtime system.

## Local development

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```
