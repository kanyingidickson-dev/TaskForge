# Realtime design

## Goals

Realtime features in TaskForge must be:

- Authorized (no cross-team leakage)
- Efficient (avoid global broadcasts)
- Predictable (versioned event contracts)
- Scalable (supports multiple backend instances)

## Transport

WebSockets are used for low-latency updates. A Socket.IO-style layer is acceptable if we need fallbacks and room semantics; a pure `ws` approach is also viable if we keep the protocol explicit.

## Connection lifecycle

1. Client connects and sends an auth token (or provides it in the initial handshake).
2. Server validates token and binds `userId` to the connection.
3. Server joins the socket to team-scoped rooms.
4. Client subscribes to narrower scopes (task room, board room) as needed.

Current implementation:

- WebSocket endpoint: `/realtime?token=<accessToken>`
- Token must be a valid JWT access token.

Client messages:

- `{"type":"subscribe","teamId":"<uuid>"}`
- `{"type":"unsubscribe","teamId":"<uuid>"}`

Server messages:

- `{"type":"subscribed","teamId":"<uuid>"}`
- `{"type":"unsubscribed","teamId":"<uuid>"}`
- `{"type":"activity","activity":{...}}`
- `{"type":"error","code":"..."}`

## Room / channel strategy

Rooms are the core mechanism for limiting fanout:

- `team:{teamId}`
  Default room for team-wide notifications.
- `task:{taskId}`
  Used for task viewers (presence + comment stream).

Avoid broadcasting to `team:{teamId}` for high-frequency events when a narrower scope exists.

## Event contracts

Events should be versionable and consistent:

- `task.created`
- `task.updated`
- `task.deleted`
- `task.assigned`
- `comment.created`
- `comment.deleted`
- `presence.joined`
- `presence.left`

Each event payload should include:

- `type`
- `teamId`
- `actorUserId`
- `ts`
- `data` (event-specific)

## Authorization rules

- A socket may only join rooms for teams the user is a member of.
- Task room joins must verify the task belongs to the team and the user has access.

## Preventing unnecessary broadcasts

- Emit to `task:{taskId}` for comment streams and presence.
- Emit to `team:{teamId}` only for events that materially affect many clients (e.g. a new task created).

## Multi-instance scaling

When running multiple backend instances:

- Use a shared pubsub (e.g. Redis) to relay events across instances.
- WebSocket fanout becomes:

```text
Service emits domain event -> Pubsub -> Each instance emits to its local sockets
```

The domain event is the stable internal contract; the websocket layer is a consumer.
