import { format, formatDistanceToNow, isPast, isToday } from "date-fns";

export const formatDate = (date) => {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
};

export const formatRelative = (date) => {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const isDueSoon = (date) => {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diff = d - now;
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
};

export const isOverdue = (date, status) => {
  if (!date || status === "DONE" || status === "BLOCKED") return false;
  return isPast(new Date(date));
};

export const STATUS_LABELS = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  BLOCKED: "Blocked",
};

export const STATUS_TRANSITIONS = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_REVIEW", "BLOCKED"],
  IN_REVIEW: ["DONE", "IN_PROGRESS", "BLOCKED"],
  DONE: [],
  BLOCKED: ["TODO", "IN_PROGRESS", "IN_REVIEW"],
};

export const STATUS_BADGE_CLASS = {
  TODO: "badge-todo",
  IN_PROGRESS: "badge-inprogress",
  IN_REVIEW: "badge-inreview",
  DONE: "badge-done",
  BLOCKED: "badge-blocked",
};

export const PRIORITY_BADGE_CLASS = {
  LOW: "badge-low",
  MEDIUM: "badge-medium",
  HIGH: "badge-high",
};

export const ROLE_BADGE_CLASS = {
  ADMIN: "badge-admin",
  MANAGER: "badge-manager",
  MEMBER: "badge-member",
};

export const canEditTask = (role) => role === "ADMIN" || role === "MANAGER";
export const canManageUsers = (role) => role === "ADMIN";
export const canManageProjects = (role) =>
  role === "ADMIN" || role === "MANAGER";

export const extractError = (err) => {
  return err?.response?.data?.message || err?.message || "Something went wrong";
};

export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
