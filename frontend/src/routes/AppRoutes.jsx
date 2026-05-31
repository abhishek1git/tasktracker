import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "../components/Layout";
// import Layout from "../layouts/Layout";
import AuthPage from "../pages/AuthPage";
import Dashboard from "../pages/Dashboard";
import TasksPage from "../pages/TasksPage";
import ProjectsPage from "../pages/ProjectsPage";
import UsersPage from "../pages/UsersPage";
import AnalyticsPage from "../pages/AnalyticsPage";

import RequireAuth from "./RequireAuth";
import RequireRole from "./RequireRole";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />

        <Route path="tasks" element={<TasksPage />} />

        <Route path="projects" element={<ProjectsPage />} />

        <Route
          path="users"
          element={
            <RequireRole roles={["ADMIN", "MANAGER"]}>
              <UsersPage />
            </RequireRole>
          }
        />

        <Route
          path="analytics"
          element={
            <RequireRole roles={["ADMIN", "MANAGER"]}>
              <AnalyticsPage />
            </RequireRole>
          }
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}