require("dotenv").config();
const { pool } = require("../config/database");

// Each entry is a single SQL statement — pg.query() only executes one at a time
const statements = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  `CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'MEMBER')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Guard CREATE TYPE with DO blocks so reruns don't fail
  `DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,

  `DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,

  `CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    status task_status NOT NULL DEFAULT 'TODO',
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS task_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id),
    from_status task_status,
    to_status task_status NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_organization ON tasks(organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`,
  `CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_status_history(task_id)`,
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("Running migrations...");
    for (const sql of statements) {
      await client.query(sql);
    }
    console.log("Migrations completed successfully");
  } catch (err) {
    console.error("Migration failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
