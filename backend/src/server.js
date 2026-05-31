require("dotenv").config();
const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { globalErrorHandler } = require("./utils/errors");
const { initWebSocket } = require("./utils/websocket");
const { runMigrations } = require("./migrations/run");
const { runSeed } = require("./migrations/seed");
const { getRedisClient } = require("./config/redis");

const authRoutes = require("./routes/auth.routes");
const taskRoutes = require("./routes/task.routes");
const userRoutes = require("./routes/user.routes");
const projectRoutes = require("./routes/project.routes");

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    }),
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many auth attempts, please try again later",
    }),
});

app.use(limiter);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Routes
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/projects", projectRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use(globalErrorHandler);

// Initialize WebSocket
initWebSocket(server);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Run migrations
  let retries = 10;
  while (retries > 0) {
    try {
      await runMigrations();
      await runSeed();
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error("Failed to run migrations after 10 attempts");
        process.exit(1);
      }
      console.log(`Migration failed, retrying in 3s... (${retries} left)`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // Initialize Redis
  try {
    getRedisClient();
  } catch (err) {
    console.warn("Redis unavailable, caching disabled");
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });
};

startServer();

module.exports = app;
