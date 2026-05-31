import React from "react";
import { useQuery } from "@tanstack/react-query";
import { tasksAPI } from "../services/api";
import { extractError } from "../utils/helpers";

const BAR_COLORS = {
  TODO: "var(--text-muted)",
  IN_PROGRESS: "var(--accent-blue)",
  IN_REVIEW: "var(--accent-purple)",
  DONE: "var(--accent-emerald)",
  BLOCKED: "var(--accent-rose)",
  LOW: "var(--accent-emerald)",
  MEDIUM: "var(--accent-amber)",
  HIGH: "var(--accent-rose)",
};

const STATUS_LABELS = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};

function BarChart({ data, labelKey, valueKey, colorKey, title }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => parseInt(d[valueKey])));

  return (
    <div className="card" style={{ flex: 1, minWidth: 0 }}>
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "16px",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {data.map((item, i) => {
          const label = STATUS_LABELS[item[labelKey]] || item[labelKey];
          const value = parseInt(item[valueKey]);
          const pct = max > 0 ? (value / max) * 100 : 0;
          const color =
            BAR_COLORS[item[colorKey || labelKey]] || "var(--accent-blue)";
          return (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {value}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--bg-input)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 3,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverdueTable({ data }) {
  const withOverdue = data?.filter((u) => parseInt(u.overdue_count) > 0) || [];
  return (
    <div className="card">
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "16px",
        }}
      >
        Overdue Tasks per User
      </h3>
      {withOverdue.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            padding: "20px",
            fontSize: "13px",
          }}
        >
          🎉 No overdue tasks
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Member", "Overdue Tasks"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 0",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withOverdue.map((u, i) => (
              <tr
                key={u.id}
                style={{
                  borderBottom:
                    i < withOverdue.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <td style={{ padding: "10px 0" }}>
                  <div style={{ fontWeight: 500, fontSize: "13px" }}>
                    {u.full_name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {u.email}
                  </div>
                </td>
                <td style={{ padding: "10px 0" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(244,63,94,0.15)",
                      color: "var(--accent-rose)",
                      border: "1px solid rgba(244,63,94,0.3)",
                      borderRadius: "20px",
                      padding: "2px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    ⚠ {u.overdue_count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CompletionTable({ data }) {
  if (!data?.length) return null;
  return (
    <div className="card">
      <h3
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "16px",
        }}
      >
        Avg Completion Time
      </h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Member", "Avg Hours", "Completed"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 0",
                  textAlign: "left",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((u, i) => (
            <tr
              key={u.id}
              style={{
                borderBottom:
                  i < data.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <td
                style={{ padding: "10px 0", fontWeight: 500, fontSize: "13px" }}
              >
                {u.full_name}
              </td>
              <td
                style={{
                  padding: "10px 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  color: "var(--accent-cyan)",
                }}
              >
                {u.avg_completion_hours}h
              </td>
              <td
                style={{
                  padding: "10px 0",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                {u.completed_tasks} tasks
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => tasksAPI.analytics().then((r) => r.data),
  });

  const analytics = data?.data;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Analytics</h1>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "2px",
          }}
        >
          Team performance and task insights
        </p>
      </div>

      {isLoading ? (
        <div className="page-loading">
          <div className="spinner spinner-lg" />
        </div>
      ) : error ? (
        <div className="empty-state card">
          <span style={{ color: "var(--accent-rose)" }}>
            Failed to load analytics
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Charts row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <BarChart
              data={analytics?.status_distribution}
              labelKey="status"
              valueKey="count"
              colorKey="status"
              title="Tasks by Status"
            />
            <BarChart
              data={analytics?.priority_distribution}
              labelKey="priority"
              valueKey="count"
              colorKey="priority"
              title="Tasks by Priority"
            />
          </div>

          {/* Tables row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "280px" }}>
              <OverdueTable data={analytics?.overdue_per_user} />
            </div>
            <div style={{ flex: 1, minWidth: "280px" }}>
              <CompletionTable data={analytics?.avg_completion_time} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
