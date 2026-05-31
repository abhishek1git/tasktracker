const { query } = require("../config/database");
const { cacheGet, cacheSet, cacheDel } = require("../config/redis");
const { notifyTaskStatusChange } = require("../utils/websocket");
const { AppError, asyncHandler } = require("../utils/errors");

// Valid status transitions
const STATUS_TRANSITIONS = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_REVIEW", "BLOCKED"],
  IN_REVIEW: ["DONE", "IN_PROGRESS", "BLOCKED"],
  DONE: [], // Terminal state
  BLOCKED: ["TODO", "IN_PROGRESS", "IN_REVIEW"],
};

const isValidTransition = (from, to) => {
  return STATUS_TRANSITIONS[from]?.includes(to) || false;
};

const getCacheKey = (orgId, filters) => {
  const f = JSON.stringify(filters);
  return `tasks:org:${orgId}:${Buffer.from(f).toString("base64")}`;
};

const invalidateTaskCache = async (orgId, assigneeId = null) => {
  // Invalidate all task list caches for this org
  await cacheDel(`tasks:org:${orgId}:*`);
  if (assigneeId) {
    await cacheDel(`tasks:assignee:${assigneeId}:*`);
  }
};

const listTasks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, priority, assignee_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const { orgId, role, id: userId } = req.user;

  const filters = { page, limit, status, priority, assignee_id, role, userId };
  const cacheKey = getCacheKey(orgId, filters);

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const conditions = ["t.organization_id = $1"];
  const params = [orgId];
  let paramCount = 1;

  // MEMBER can only see their own tasks
  if (role === "MEMBER") {
    paramCount++;
    conditions.push(`t.assignee_id = $${paramCount}`);
    params.push(userId);
  } else if (assignee_id) {
    paramCount++;
    conditions.push(`t.assignee_id = $${paramCount}`);
    params.push(assignee_id);
  }

  if (status) {
    paramCount++;
    conditions.push(`t.status = $${paramCount}`);
    params.push(status);
  }

  if (priority) {
    paramCount++;
    conditions.push(`t.priority = $${paramCount}`);
    params.push(priority);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await query(
    `SELECT COUNT(*) FROM tasks t WHERE ${whereClause}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count);

  paramCount++;
  params.push(parseInt(limit));
  paramCount++;
  params.push(offset);

  const tasksResult = await query(
    `SELECT t.*, 
      u_assignee.full_name as assignee_name, u_assignee.email as assignee_email,
      u_creator.full_name as creator_name,
      p.name as project_name
     FROM tasks t
     LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
     LEFT JOIN users u_creator ON t.created_by = u_creator.id
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
    params,
  );

  const response = {
    status: 200,
    data: tasksResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };

  await cacheSet(cacheKey, response);
  res.json(response);
});

const getTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId, role, id: userId } = req.user;

  const result = await query(
    `SELECT t.*,
      u_assignee.full_name as assignee_name, u_assignee.email as assignee_email,
      u_creator.full_name as creator_name,
      p.name as project_name
     FROM tasks t
     LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
     LEFT JOIN users u_creator ON t.created_by = u_creator.id
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1 AND t.organization_id = $2`,
    [id, orgId],
  );

  const task = result.rows[0];
  if (!task) throw new AppError(404, "NOT_FOUND", "Task not found");

  // MEMBER can only view assigned tasks
  if (role === "MEMBER" && task.assignee_id !== userId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "You can only view tasks assigned to you",
    );
  }

  // Fetch history
  const history = await query(
    `SELECT tsh.*, u.full_name as changed_by_name
     FROM task_status_history tsh
     JOIN users u ON tsh.changed_by = u.id
     WHERE tsh.task_id = $1
     ORDER BY tsh.changed_at DESC`,
    [id],
  );

  res.json({ status: 200, data: { ...task, history: history.rows } });
});

const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    priority = "MEDIUM",
    assignee_id,
    project_id,
    due_date,
  } = req.body;
  const { orgId, id: userId } = req.user;

  // Validate assignee belongs to same org
  if (assignee_id) {
    const assigneeCheck = await query(
      "SELECT id FROM users WHERE id = $1 AND organization_id = $2 AND is_active = TRUE",
      [assignee_id, orgId],
    );
    if (assigneeCheck.rows.length === 0) {
      throw new AppError(
        400,
        "INVALID_REFERENCE",
        "Assignee not found in your organization",
      );
    }
  }

  // Validate project belongs to same org
  if (project_id) {
    const projectCheck = await query(
      "SELECT id FROM projects WHERE id = $1 AND organization_id = $2",
      [project_id, orgId],
    );
    if (projectCheck.rows.length === 0) {
      throw new AppError(
        400,
        "INVALID_REFERENCE",
        "Project not found in your organization",
      );
    }
  }

  const result = await query(
    `INSERT INTO tasks (organization_id, project_id, title, description, priority, assignee_id, created_by, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      orgId,
      project_id || null,
      title,
      description || null,
      priority,
      assignee_id || null,
      userId,
      due_date || null,
    ],
  );

  const task = result.rows[0];
  await invalidateTaskCache(orgId, assignee_id);

  res.status(201).json({ status: 201, message: "Task created", data: task });
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId, role, id: userId } = req.user;
  const { title, description, priority, assignee_id, project_id, due_date } =
    req.body;

  const existing = await query(
    "SELECT * FROM tasks WHERE id = $1 AND organization_id = $2",
    [id, orgId],
  );

  const task = existing.rows[0];
  if (!task) throw new AppError(404, "NOT_FOUND", "Task not found");

  // MEMBER cannot update task details (only status via separate endpoint)
  if (role === "MEMBER") {
    throw new AppError(403, "FORBIDDEN", "Members cannot edit task details");
  }

  // Validate assignee
  if (assignee_id) {
    const assigneeCheck = await query(
      "SELECT id FROM users WHERE id = $1 AND organization_id = $2 AND is_active = TRUE",
      [assignee_id, orgId],
    );
    if (assigneeCheck.rows.length === 0) {
      throw new AppError(
        400,
        "INVALID_REFERENCE",
        "Assignee not found in your organization",
      );
    }
  }

  // Build update fields dynamically to avoid null-cast issues
  const updates = [];
  const params = [];
  let idx = 1;

  if (title !== undefined) {
    updates.push(`title = $${idx++}`);
    params.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${idx++}`);
    params.push(description);
  }
  if (priority !== undefined) {
    updates.push(`priority = $${idx++}`);
    params.push(priority);
  }
  if (assignee_id !== undefined) {
    updates.push(`assignee_id = $${idx++}`);
    params.push(assignee_id || null);
  }
  if (project_id !== undefined) {
    updates.push(`project_id = $${idx++}`);
    params.push(project_id || null);
  }
  if (due_date !== undefined) {
    updates.push(`due_date = $${idx++}`);
    params.push(due_date || null);
  }

  if (updates.length === 0) {
    return res.json({ status: 200, message: "No changes", data: task });
  }

  updates.push(`updated_at = NOW()`);
  params.push(id, orgId);

  const updated = await query(
    `UPDATE tasks SET ${updates.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
    params,
  );

  await invalidateTaskCache(orgId, task.assignee_id);
  if (assignee_id && assignee_id !== task.assignee_id) {
    await invalidateTaskCache(orgId, assignee_id);
  }

  res.json({ status: 200, message: "Task updated", data: updated.rows[0] });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;
  const { orgId, role, id: userId } = req.user;

  const existing = await query(
    `SELECT t.*, u.full_name as user_full_name FROM tasks t
     LEFT JOIN users u ON u.id = $3
     WHERE t.id = $1 AND t.organization_id = $2`,
    [id, orgId, userId],
  );

  const task = existing.rows[0];
  if (!task) throw new AppError(404, "NOT_FOUND", "Task not found");

  // Permission check: only assignee or MANAGER/ADMIN can advance status
  const canAdvance =
    role === "ADMIN" || role === "MANAGER" || task.assignee_id === userId;
  if (!canAdvance) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only the assignee or a manager can update task status",
    );
  }

  // Validate transition
  if (!isValidTransition(task.status, newStatus)) {
    const allowed = STATUS_TRANSITIONS[task.status] || [];
    throw new AppError(
      400,
      "INVALID_TRANSITION",
      `Cannot transition from ${task.status} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
    );
  }

  const updated = await query(
    `UPDATE tasks
     SET status = $1,
         updated_at = NOW(),
         completed_at = CASE WHEN $1::task_status = 'DONE' THEN NOW() ELSE NULL END
     WHERE id = $2 AND organization_id = $3
     RETURNING *`,
    [newStatus, id, orgId],
  );

  // Record history
  await query(
    "INSERT INTO task_status_history (task_id, changed_by, from_status, to_status) VALUES ($1, $2, $3, $4)",
    [id, userId, task.status, newStatus],
  );

  await invalidateTaskCache(orgId, task.assignee_id);

  // Real-time notification
  const updatedTask = updated.rows[0];
  notifyTaskStatusChange(updatedTask, {
    full_name: task.user_full_name,
    email: req.user.email,
  });

  res.json({ status: 200, message: "Task status updated", data: updatedTask });
});

const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId } = req.user;

  const existing = await query(
    "SELECT id, assignee_id FROM tasks WHERE id = $1 AND organization_id = $2",
    [id, orgId],
  );

  if (existing.rows.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Task not found");
  }

  await query("DELETE FROM tasks WHERE id = $1", [id]);
  await invalidateTaskCache(orgId, existing.rows[0].assignee_id);

  res.json({ status: 200, message: "Task deleted" });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const { orgId } = req.user;

  // Overdue tasks per user
  const overdueResult = await query(
    `SELECT 
      u.id, u.full_name, u.email,
      COUNT(t.id) as overdue_count
     FROM users u
     LEFT JOIN tasks t ON t.assignee_id = u.id 
       AND t.due_date < NOW() 
       AND t.status NOT IN ('DONE', 'BLOCKED')
     WHERE u.organization_id = $1
     GROUP BY u.id, u.full_name, u.email
     ORDER BY overdue_count DESC`,
    [orgId],
  );

  // Average completion time per user (in hours)
  const completionResult = await query(
    `SELECT 
      u.id, u.full_name,
      ROUND(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600)::numeric, 2) as avg_completion_hours,
      COUNT(t.id) as completed_tasks
     FROM users u
     JOIN tasks t ON t.assignee_id = u.id AND t.status = 'DONE' AND t.completed_at IS NOT NULL
     WHERE u.organization_id = $1
     GROUP BY u.id, u.full_name
     ORDER BY avg_completion_hours ASC`,
    [orgId],
  );

  // Task distribution by status
  const statusDistResult = await query(
    `SELECT status, COUNT(*) as count 
     FROM tasks WHERE organization_id = $1 
     GROUP BY status`,
    [orgId],
  );

  // Task distribution by priority
  const priorityDistResult = await query(
    `SELECT priority, COUNT(*) as count 
     FROM tasks WHERE organization_id = $1 
     GROUP BY priority`,
    [orgId],
  );

  res.json({
    status: 200,
    data: {
      overdue_per_user: overdueResult.rows,
      avg_completion_time: completionResult.rows,
      status_distribution: statusDistResult.rows,
      priority_distribution: priorityDistResult.rows,
    },
  });
});

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getAnalytics,
};
