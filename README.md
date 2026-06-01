# TaskTracker — Team Task Management System

A full-stack team task tracker with authentication, RBAC, real-time notifications, caching, and containerized deployment.

## Quick Start

```bash
git clone <repo>
cd tasktracker
docker compose up --build
```

Open **http://localhost:3000** — no manual setup required.

**First user to register becomes ADMIN automatically.**

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│          React + TanStack Query                 │
└──────────────┬──────────────────────────────────┘
               │ HTTP + WebSocket
┌──────────────▼──────────────────────────────────┐
│              Nginx (port 3000)                  │
│   Serves React SPA, proxies /api/* and /ws      │
└──────────┬──────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────┐
│         Node.js / Express (port 5000)           │
│  Auth · RBAC middleware · REST API · WebSocket  │
└──────┬───────────────────────────┬──────────────┘
       │                           │
┌──────▼──────┐           ┌────────▼───────┐
│ PostgreSQL  │           │     Redis      │
│  (data)     │           │   (cache)      │
└─────────────┘           └────────────────┘
```

---

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `organizations` | Top-level tenant; all data is scoped to an org |
| `users` | Org members with role (ADMIN/MANAGER/MEMBER) |
| `refresh_tokens` | Hashed refresh tokens for JWT rotation |
| `projects` | Grouping of tasks within an org |
| `tasks` | Core entity: title, description, priority, status, assignee, due_date |
| `task_status_history` | Audit log of every status change |

### Design Decisions

**Why a separate `task_status_history` table?**  
Storing transitions as immutable audit records (rather than a JSON field on `tasks`) lets us compute analytics (avg completion time, cycle time) with simple SQL window functions and GROUP BY — no JSON parsing needed.

**Index choices:**
- `idx_tasks_status` — list endpoint always filters/sorts by status (Kanban views)
- `idx_tasks_assignee` — MEMBER queries are always `WHERE assignee_id = ?`; cache keys also group by assignee
- `idx_tasks_due_date` — analytics query for overdue tasks (`WHERE due_date < NOW()`)
- `idx_tasks_organization` — every query is scoped to an org; this index is always hit first
- `idx_users_email` — login lookup

**Multi-tenancy via `organization_id` on every table** rather than separate schemas — simpler joins, single connection pool, easy horizontal growth.

---

## Caching Strategy

Redis caches the task list endpoint (`GET /api/v1/tasks`) with:

- **Cache key**: `tasks:org:{orgId}:base64({filters})` — unique per org + filter combination
- **TTL**: 300 seconds (configurable via `CACHE_TTL`)
- **Invalidation**: Any write operation (create, update, delete task OR status change) calls `cacheDel('tasks:org:{orgId}:*')` which uses Redis `KEYS` pattern matching to wipe all cached variants for that org

**Why wipe all variants on write?**  
A task update can affect multiple filter combinations (e.g. status change shifts the task from one status-filtered view to another). Granular invalidation would require tracking every cache key a task appears in — complex and error-prone. For a team-scoped list with 5-minute TTL, a broad wipe is the correct trade-off.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register + get tokens |
| POST | `/api/v1/auth/login` | Login + get tokens |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke token |
| GET | `/api/v1/auth/me` | Current user info |

### Tasks

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/tasks` | ALL | List tasks (paginated, filtered) |
| GET | `/api/v1/tasks/:id` | ALL | Get task details + history |
| POST | `/api/v1/tasks` | MANAGER, ADMIN | Create task |
| PUT | `/api/v1/tasks/:id` | MANAGER, ADMIN | Update task |
| PATCH | `/api/v1/tasks/:id/status` | Assignee, MANAGER, ADMIN | Update status |
| DELETE | `/api/v1/tasks/:id` | ADMIN | Delete task |
| GET | `/api/v1/tasks/analytics` | MANAGER, ADMIN | Analytics |

**List tasks query params:** `page`, `limit`, `status`, `priority`, `assignee_id`

### Status Transitions

```
TODO → IN_PROGRESS → IN_REVIEW → DONE
 ↘          ↘            ↘
          BLOCKED (reachable from any active state)
BLOCKED → TODO | IN_PROGRESS | IN_REVIEW
```

### Users

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/v1/users` | MANAGER, ADMIN |
| GET | `/api/v1/users/:id` | MANAGER, ADMIN |
| PUT | `/api/v1/users/:id` | Self (name only) or ADMIN (role/status) |
| DELETE | `/api/v1/users/:id` | ADMIN |

### Projects

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/v1/projects` | ALL |
| POST | `/api/v1/projects` | MANAGER, ADMIN |
| PUT | `/api/v1/projects/:id` | MANAGER, ADMIN |
| DELETE | `/api/v1/projects/:id` | ADMIN |

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "due_date must be a future date",
  "details": [...]
}
```

Common error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_TRANSITION`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`

---

## Real-time Notifications (WebSocket)

Connect to `ws://localhost:3000/ws?token=<access_token>`

When a task's status changes, the assignee receives:

```json
{
  "type": "TASK_STATUS_CHANGED",
  "data": {
    "taskId": "uuid",
    "taskTitle": "Fix login bug",
    "newStatus": "IN_REVIEW",
    "changedBy": "Jane Smith",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

The frontend displays toast notifications and stores them in a notification panel with unread counts.

---

## Role Permissions Matrix

| Action | MEMBER | MANAGER | ADMIN |
|--------|--------|---------|-------|
| View own tasks | ✅ | ✅ | ✅ |
| View all tasks | ❌ | ✅ | ✅ |
| Create task | ❌ | ✅ | ✅ |
| Edit task | ❌ | ✅ | ✅ |
| Delete task | ❌ | ❌ | ✅ |
| Update own task status | ✅ | ✅ | ✅ |
| Update any task status | ❌ | ✅ | ✅ |
| View team members | ❌ | ✅ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |
| Delete users | ❌ | ❌ | ✅ |
| Manage projects | ❌ | ✅ | ✅ |
| View analytics | ❌ | ✅ | ✅ |

RBAC is enforced exclusively in middleware (`src/middleware/rbac.js`), not inside controllers.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Backend port |
| `DB_HOST` | postgres | PostgreSQL host |
| `DB_NAME` | tasktracker | Database name |
| `DB_USER` | taskuser | DB user |
| `DB_PASSWORD` | taskpassword | DB password |
| `JWT_ACCESS_SECRET` | — | **Change in production** |
| `JWT_REFRESH_SECRET` | — | **Change in production** |
| `JWT_ACCESS_EXPIRES` | 15m | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | 7d | Refresh token lifetime |
| `REDIS_HOST` | redis | Redis host |
| `CACHE_TTL` | 300 | Cache TTL in seconds |

---

## Bonus Features Implemented

1. **Analytics endpoint** (`GET /api/v1/tasks/analytics`):
   - Overdue task count per user (SQL aggregation with `GROUP BY`)
   - Average completion time per user (SQL `EXTRACT(EPOCH ...)` for duration)
   - Task distribution by status and priority

2. **Real-time notifications** (WebSocket):
   - JWT-authenticated WebSocket connections
   - Server pushes `TASK_STATUS_CHANGED` events to assignees
   - Frontend shows toast + notification panel with unread badge
   - Auto-reconnects on disconnect
