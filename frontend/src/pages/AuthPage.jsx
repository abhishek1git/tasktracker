import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { extractError } from "../utils/helpers";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    organization_name: "",
    organization_id: "",
  });
  const [joinMode, setJoinMode] = useState("create"); // 'create' | 'join'
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email.trim().toLowerCase(), form.password);
      } else {
        const payload = {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          full_name: form.full_name.trim(),
        };
        if (joinMode === "create" && form.organization_name.trim()) {
          payload.organization_name = form.organization_name.trim();
        } else if (joinMode === "join" && form.organization_id.trim()) {
          payload.organization_id = form.organization_id.trim();
        } else {
          toast.error(
            joinMode === "create"
              ? "Organization name is required"
              : "Organization ID is required",
          );
          setLoading(false);
          return;
        }
        await register(payload);
      }
      navigate("/");
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at 30% 40%, rgba(59,130,246,0.08) 0%, var(--bg-primary) 60%)",
        padding: "20px",
      }}
    >
      {/* Logo area */}
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-light)",
              borderRadius: "12px",
              padding: "10px 18px",
              marginBottom: "20px",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth="2"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
            <span
              style={{
                fontWeight: 700,
                fontSize: "15px",
                letterSpacing: "-0.3px",
              }}
            >
              TaskTracker
            </span>
          </div>
          <h1
            style={{ fontSize: "24px", fontWeight: 700, marginBottom: "6px" }}
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            {mode === "login"
              ? "Sign in to your workspace"
              : "Set up your team workspace"}
          </p>
        </div>

        <div
          className="card"
          style={{ border: "1px solid var(--border-light)" }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {mode === "register" && (
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  className="input"
                  name="full_name"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {mode === "register" && (
              <>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["create", "join"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setJoinMode(m)}
                      className={`btn ${joinMode === m ? "btn-primary" : "btn-secondary"}`}
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        fontSize: "12px",
                      }}
                    >
                      {m === "create" ? "+ New Org" : "Join Existing"}
                    </button>
                  ))}
                </div>

                {joinMode === "create" ? (
                  <div className="input-group">
                    <label className="input-label">Organization Name</label>
                    <input
                      className="input"
                      name="organization_name"
                      placeholder="Acme Corp"
                      value={form.organization_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                ) : (
                  <div className="input-group">
                    <label className="input-label">Organization ID</label>
                    <input
                      className="input"
                      name="organization_id"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={form.organization_id}
                      onChange={handleChange}
                      required
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                      }}
                    />
                    <span
                      style={{ fontSize: "11px", color: "var(--text-muted)" }}
                    >
                      Ask your admin for the organization ID
                    </span>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ justifyContent: "center", marginTop: "4px" }}
            >
              {loading ? (
                <span className="spinner" style={{ width: 16, height: 16 }} />
              ) : null}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="divider" style={{ margin: "16px 0" }} />

          <p
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: "13px",
            }}
          >
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-blue)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
              }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
