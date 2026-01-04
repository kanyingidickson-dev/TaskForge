# Data model

## Principles

- All collaboration is **team-scoped**.
- Tasks belong to a team; access is derived from team membership.
- Prefer normalized tables with explicit foreign keys.
- Use soft deletes where record history matters (e.g. tasks, comments).
- Write queries that are index-friendly (team_id leading columns).

## Core entities

### Users

- `id` (uuid, pk)
- `email` (unique)
- `name`
- `password_hash` (or external auth identifier)
- `created_at`, `updated_at`

Indexes:

- unique index on `email`

### Teams

- `id` (uuid, pk)
- `name`
- `created_by_user_id` (fk -> users)
- `created_at`, `updated_at`

Indexes:

- index on `created_by_user_id`

### Team memberships

- `id` (uuid, pk)
- `team_id` (fk -> teams)
- `user_id` (fk -> users)
- `role` (owner|admin|member)
- `created_at`, `updated_at`

Constraints + indexes:

- unique constraint on `(team_id, user_id)`
- index on `(user_id, team_id)` for listing user teams

### Team invites

- `id` (uuid, pk)
- `team_id` (fk -> teams)
- `email` (invitee email)
- `role` (admin|member)
- `token_hash`
- `expires_at`
- `accepted_at` (nullable)
- `created_by_user_id` (fk -> users)
- `created_at`

Indexes:

- index on `(team_id, email)`
- index on `expires_at`

### Tasks

- `id` (uuid, pk)
- `team_id` (fk -> teams)
- `title`
- `description` (nullable)
- `status` (todo|in_progress|blocked|done)
- `priority` (low|medium|high|urgent)
- `due_at` (nullable)
- `created_by_user_id` (fk -> users)
- `assignee_user_id` (nullable, fk -> users)
- `deleted_at` (nullable)
- `created_at`, `updated_at`

Indexes:

- index on `(team_id, status, updated_at desc)`
- index on `(team_id, assignee_user_id, due_at)`
- partial index on `(team_id, updated_at desc)` where `deleted_at is null`

### Comments

- `id` (uuid, pk)
- `task_id` (fk -> tasks)
- `team_id` (denormalized for faster auth checks; fk -> teams)
- `author_user_id` (fk -> users)
- `body`
- `deleted_at` (nullable)
- `created_at`, `updated_at`

Indexes:

- index on `(task_id, created_at asc)`
- index on `(team_id, created_at desc)`

### Activity log

Append-only audit trail of important actions.

- `id` (uuid, pk)
- `team_id` (fk -> teams)
- `actor_user_id` (nullable for system actions)
- `entity_type` (task|comment|team|membership)
- `entity_id` (uuid)
- `action` (created|updated|deleted|commented|assigned|status_changed)
- `data` (jsonb, minimal payload for timeline rendering)
- `created_at`

Indexes:

- index on `(team_id, created_at desc)`
- index on `(entity_type, entity_id)`

## Notes on soft deletes

- Tasks and comments use `deleted_at` so the system can preserve context and activity history.
- Queries must consistently filter `deleted_at is null` unless explicitly requested.

## Implementation note

This model is implemented in Prisma at [`prisma/schema.prisma`](../prisma/schema.prisma).

## See also

- [Architecture](architecture.md#architecture)
- [Realtime](realtime.md#realtime-design)
- [Technology stack](stack.md#technology-stack)
