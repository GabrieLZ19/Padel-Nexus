import axios from "axios";
import { cerrarSesionCliente } from "./auth/sesionBff";

function resolveBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/proxy";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
});

// Warmup ping no bloqueante para mitigar el arranque en frío (cold start) en Render
if (typeof window !== "undefined") {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const healthUrl = base.replace(/\/api\/?$/, "") + "/health";
  fetch(healthUrl, { mode: "no-cors" }).catch(() => {});
}

// Interceptor para redireccionar automáticamente al login en caso de 401 (Sesión vencida)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        await cerrarSesionCliente();

        const path = window.location.pathname;
        const isAreaPrivada =
          path.startsWith("/dashboard") ||
          path.startsWith("/mi-perfil") ||
          path.startsWith("/club");

        if (isAreaPrivada) {
          window.location.href = "/login?expired=true";
        }
      }
    }
    return Promise.reject(error);
  },
);
