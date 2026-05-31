const bcrypt = require("bcryptjs");
const { query } = require("../config/database");
const {
  generateTokens,
  saveRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} = require("../utils/jwt");
const { AppError, asyncHandler } = require("../utils/errors");

const register = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    full_name,
    organization_name,
    organization_id,
    role,
  } = req.body;

  let orgId = organization_id;

  if (!orgId && organization_name) {
    // Create new organization
    const slug =
      organization_name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") +
      "-" +
      Date.now();
    const orgResult = await query(
      "INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id",
      [organization_name, slug],
    );
    orgId = orgResult.rows[0].id;
  }

  if (!orgId) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Either organization_id or organization_name is required",
    );
  }

  // Verify org exists
  const orgCheck = await query("SELECT id FROM organizations WHERE id = $1", [
    orgId,
  ]);
  if (orgCheck.rows.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  // Check email uniqueness
  const existing = await query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rows.length > 0) {
    throw new AppError(409, "CONFLICT", "Email already registered");
  }

  // Determine role - first user in org becomes ADMIN
  const userCount = await query(
    "SELECT COUNT(*) FROM users WHERE organization_id = $1",
    [orgId],
  );
  let assignedRole = "MEMBER";
  if (parseInt(userCount.rows[0].count) === 0) {
    assignedRole = "ADMIN";
  } else if (role && ["ADMIN", "MANAGER", "MEMBER"].includes(role)) {
    assignedRole = role;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (organization_id, email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, full_name, role, organization_id, created_at`,
    [orgId, email, passwordHash, full_name, assignedRole],
  );

  const user = result.rows[0];
  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user.id, refreshToken);

  res.status(201).json({
    status: 201,
    message: "Registration successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      organization_id: user.organization_id,
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    `SELECT u.*, o.name as org_name FROM users u
     JOIN organizations o ON u.organization_id = o.id
     WHERE u.email = $1`,
    [email],
  );

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (!user.is_active) {
    throw new AppError(
      403,
      "ACCOUNT_DISABLED",
      "Your account has been disabled",
    );
  }

  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user.id, refreshToken);

  res.json({
    status: 200,
    message: "Login successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        organization_id: user.organization_id,
        org_name: user.org_name,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  const tokenData = await validateRefreshToken(refresh_token);
  if (!tokenData) {
    throw new AppError(
      401,
      "INVALID_TOKEN",
      "Invalid or expired refresh token",
    );
  }

  if (!tokenData.is_active) {
    throw new AppError(
      403,
      "ACCOUNT_DISABLED",
      "Your account has been disabled",
    );
  }

  // Rotate: revoke old, issue new
  await revokeRefreshToken(refresh_token);

  const user = {
    id: tokenData.user_id,
    email: tokenData.email,
    role: tokenData.role,
    organization_id: tokenData.organization_id,
  };

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  await saveRefreshToken(user.id, newRefreshToken);

  res.json({
    status: 200,
    message: "Tokens refreshed",
    data: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    await revokeRefreshToken(refresh_token);
  }
  res.json({ status: 200, message: "Logged out successfully" });
});

const me = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.organization_id, u.created_at, o.name as org_name
     FROM users u JOIN organizations o ON u.organization_id = o.id
     WHERE u.id = $1`,
    [req.user.id],
  );

  if (!result.rows[0]) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  res.json({ status: 200, data: result.rows[0] });
});

module.exports = { register, login, refresh, logout, me };
