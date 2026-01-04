# Architecture

## Goals

TaskForge is designed as a real-time collaboration system with strong security defaults, clear separation of concerns, and a contributor-friendly codebase.

The system prioritizes:

- Predictable API behavior (consistent error shapes, validation, pagination)
- Explicit authorization boundaries (team-scoped access control)
- Realtime correctness (authorized fanout, minimal broadcasts)
- Operational readiness (structured logs, graceful shutdown, environment-based config)

## Target system shape

TaskForge is best built as a modular monolith initially:

- **One deployable backend service:** HTTP + WebSocket
- **One database:** PostgreSQL
- **Optional Redis:** rate limiting, presence, and WebSocket fanout when running multiple instances

This keeps the contributor experience simple while leaving a clear path to scale.

## Backend layers

We keep a strict separation between layers to avoid tight coupling and “god modules”:

- **Transport layer:** HTTP controllers/routes and WebSocket gateways.
- **Application layer (services):** use-case oriented business logic (e.g. “create task”, “assign task”, “add comment”).
- **Data access layer (repositories):** all persistence details (SQL/ORM queries) live here.
- **Domain events (internal):** services publish events (e.g. `task.updated`) that can be consumed by the realtime layer and activity/audit logging.

## Built-in showcase

TaskForge includes a small showcase layer served by the backend (no separate frontend build).

- **Landing:** `http://localhost:3000/`
- **Demo UI:** `http://localhost:3000/app`
- **Swagger UI:** `http://localhost:3000/docs`
- **OpenAPI spec:** `http://localhost:3000/openapi.json`

## Data flow (HTTP)

```text
Client -> HTTP Controller -> Service -> Repository -> Postgres
                         -> Domain Event -> Activity Log + Realtime
```

## Data flow (Realtime)

```text
Client <-> WebSocket Gateway (auth) -> Event router -> Rooms
                                   -> Service -> Repository -> Postgres
```

## Authorization model

Authorization is team-scoped and role-based:

- **Team roles:** owner, admin, member
- **Core invariant:** every task belongs to a team; access to tasks is derived from membership in that team.

The transport layer authenticates the user identity (JWT), but authorization decisions should be enforced at the service layer.

## Scaling strategy

- **Stateless backend:** multiple instances behind a load balancer.
- **WebSockets:**
  - Small deployments: single instance.
  - Multi-instance deployments: Redis pubsub (or adapter) to fan out realtime events across instances.
- **Database:**
  - Proper indexing for team/task reads.
  - Pagination everywhere.

## Observability

- **Structured logs:** JSON logs with request IDs.
- **Errors:** explicit error types mapped to consistent API responses.
- **Health checks:** health endpoint for liveness checks.

## See also

- [Data model](data-model.md#data-model)
- [Realtime](realtime.md#realtime-design)
- [Technology stack](stack.md#technology-stack)
