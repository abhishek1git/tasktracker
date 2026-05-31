const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { query } = require("../config/database");

const generateTokens = (user) => {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organization_id,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });

  const refreshToken = crypto.randomBytes(64).toString("hex");
  return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

const saveRefreshToken = async (userId, token) => {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hash, expiresAt],
  );
};

const validateRefreshToken = async (token) => {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await query(
    `SELECT rt.*, u.id as user_id, u.email, u.role, u.organization_id, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token_hash = $1 AND rt.revoked = FALSE AND rt.expires_at > NOW()`,
    [hash],
  );
  return result.rows[0] || null;
};

const revokeRefreshToken = async (token) => {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await query(
    "UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1",
    [hash],
  );
};

const revokeAllUserTokens = async (userId) => {
  await query("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1", [
    userId,
  ]);
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  saveRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
