const { query } = require("../config/database");
const { AppError, asyncHandler } = require("../utils/errors");

const listProjects = asyncHandler(async (req, res) => {
  const { orgId } = req.user;
  const result = await query(
    `SELECT p.*, u.full_name as creator_name,
      COUNT(t.id) as task_count
     FROM projects p
     JOIN users u ON p.created_by = u.id
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.organization_id = $1
     GROUP BY p.id, u.full_name
     ORDER BY p.created_at DESC`,
    [orgId],
  );
  res.json({ status: 200, data: result.rows });
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { orgId, id: userId } = req.user;

  const result = await query(
    "INSERT INTO projects (organization_id, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *",
    [orgId, name, description || null, userId],
  );
  res
    .status(201)
    .json({ status: 201, message: "Project created", data: result.rows[0] });
});

const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId } = req.user;
  const { name, description } = req.body;

  const result = await query(
    `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
     WHERE id = $3 AND organization_id = $4 RETURNING *`,
    [name, description, id, orgId],
  );

  if (!result.rows[0])
    throw new AppError(404, "NOT_FOUND", "Project not found");
  res.json({ status: 200, message: "Project updated", data: result.rows[0] });
});

const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId } = req.user;

  const result = await query(
    "DELETE FROM projects WHERE id = $1 AND organization_id = $2 RETURNING id",
    [id, orgId],
  );

  if (!result.rows[0])
    throw new AppError(404, "NOT_FOUND", "Project not found");
  res.json({ status: 200, message: "Project deleted" });
});

module.exports = { listProjects, createProject, updateProject, deleteProject };
