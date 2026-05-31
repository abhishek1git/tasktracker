import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import queryClient from "./config/queryClient";
import AppRoutes from "./routes/AppRoutes";
import useAuthStore from "./store/authStore";

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-light)",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
          },
          success: {
            iconTheme: {
              primary: "var(--accent-emerald)",
              secondary: "var(--bg-card)",
            },
          },
          error: {
            iconTheme: {
              primary: "var(--accent-rose)",
              secondary: "var(--bg-card)",
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}