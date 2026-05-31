const bcrypt = require("bcryptjs");
const { query } = require("../config/database");
const { revokeAllUserTokens } = require("../utils/jwt");
const { AppError, asyncHandler } = require("../utils/errors");

const listUsers = asyncHandler(async (req, res) => {
  const { orgId } = req.user;
  const { page = 1, limit = 20, role } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = ["organization_id = $1"];
  const params = [orgId];
  let paramCount = 1;

  if (role) {
    paramCount++;
    conditions.push(`role = $${paramCount}`);
    params.push(role);
  }

  const whereClause = conditions.join(" AND ");
  const countResult = await query(
    `SELECT COUNT(*) FROM users WHERE ${whereClause}`,
    params,
  );

  paramCount++;
  params.push(parseInt(limit));
  paramCount++;
  params.push(offset);

  const result = await query(
    `SELECT id, email, full_name, role, is_active, created_at
     FROM users WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
    params,
  );

  res.json({
    status: 200,
    data: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
    },
  });
});

const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId } = req.user;

  const result = await query(
    "SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = $1 AND organization_id = $2",
    [id, orgId],
  );

  if (!result.rows[0]) throw new AppError(404, "NOT_FOUND", "User not found");
  res.json({ status: 200, data: result.rows[0] });
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId, role: requesterRole, id: requesterId } = req.user;
  const { full_name, role, is_active } = req.body;

  // Users can update their own name; only ADMIN can change roles or deactivate
  if (
    (role !== undefined || is_active !== undefined) &&
    requesterRole !== "ADMIN"
  ) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only admins can change roles or account status",
    );
  }

  // Prevent self-demotion for last admin
  if (id === requesterId && role && role !== "ADMIN") {
    const adminCount = await query(
      "SELECT COUNT(*) FROM users WHERE organization_id = $1 AND role = 'ADMIN' AND is_active = TRUE",
      [orgId],
    );
    if (parseInt(adminCount.rows[0].count) <= 1) {
      throw new AppError(
        400,
        "INVALID_OPERATION",
        "Cannot demote the last admin",
      );
    }
  }

  const result = await query(
    `UPDATE users SET
      full_name = COALESCE($1, full_name),
      role = COALESCE($2, role),
      is_active = COALESCE($3, is_active),
      updated_at = NOW()
     WHERE id = $4 AND organization_id = $5
     RETURNING id, email, full_name, role, is_active`,
    [full_name, role, is_active, id, orgId],
  );

  if (!result.rows[0]) throw new AppError(404, "NOT_FOUND", "User not found");

  if (is_active === false) {
    await revokeAllUserTokens(id);
  }

  res.json({ status: 200, message: "User updated", data: result.rows[0] });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orgId, id: requesterId } = req.user;

  if (id === requesterId) {
    throw new AppError(
      400,
      "INVALID_OPERATION",
      "Cannot delete your own account",
    );
  }

  const result = await query(
    "DELETE FROM users WHERE id = $1 AND organization_id = $2 RETURNING id",
    [id, orgId],
  );

  if (result.rows.length === 0)
    throw new AppError(404, "NOT_FOUND", "User not found");
  await revokeAllUserTokens(id);

  res.json({ status: 200, message: "User deleted" });
});

module.exports = { listUsers, getUser, updateUser, deleteUser };
