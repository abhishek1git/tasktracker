import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";

const WS_BASE =
  process.env.REACT_APP_WS_URL ||
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
    window.location.host +
    "/ws";

export const useWebSocket = () => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !mountedRef.current) return;

    try {
      const ws = new WebSocket(`${WS_BASE}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mountedRef.current) setIsConnected(true);
      };

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "TASK_STATUS_CHANGED") {
            const notif = {
              id: Date.now(),
              ...msg.data,
              read: false,
            };
            setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
            toast(`📋 "${msg.data.taskTitle}" moved to ${msg.data.newStatus}`, {
              style: {
                background: "#131d35",
                color: "#e8edf5",
                border: "1px solid #1e2d4a",
              },
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        if (mountedRef.current) {
          setIsConnected(false);
          reconnectTimer.current = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAllRead,
    clearNotifications,
  };
};
