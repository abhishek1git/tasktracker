const WebSocket = require("ws");

let wss;
const userConnections = new Map(); // userId -> Set of ws connections

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = decoded.sub;

      ws.userId = userId;

      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId).add(ws);

      ws.send(
        JSON.stringify({ type: "CONNECTED", message: "WebSocket connected" }),
      );

      ws.on("close", () => {
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            userConnections.delete(userId);
          }
        }
      });

      ws.on("error", (err) => {
        console.error("WS error for user", userId, err.message);
      });
    } catch (err) {
      ws.close(4001, "Invalid token");
    }
  });

  console.log("WebSocket server initialized");
  return wss;
};

const notifyUser = (userId, payload) => {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const message = JSON.stringify(payload);
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
};

const notifyTaskStatusChange = (task, changedBy) => {
  if (task.assignee_id) {
    notifyUser(task.assignee_id, {
      type: "TASK_STATUS_CHANGED",
      data: {
        taskId: task.id,
        taskTitle: task.title,
        newStatus: task.status,
        changedBy: changedBy.full_name || changedBy.email,
        timestamp: new Date().toISOString(),
      },
    });
  }
};

module.exports = { initWebSocket, notifyUser, notifyTaskStatusChange };
