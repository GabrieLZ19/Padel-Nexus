import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  withCredentials: true,
});

// Interceptor optimizado para leer la cookie de sesión nativa
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Helper simple para extraer el valor de la cookie "padel_token"
    const match = document.cookie.match(new RegExp("(^| )padel_token=([^;]+)"));
    const token = match ? match[2] : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para redireccionar automáticamente al login en caso de 401 (Sesión vencida)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        // Limpiar cookies de sesión
        document.cookie = "padel_token=; path=/; max-age=0;";
        document.cookie = "padel_user_role=; path=/; max-age=0;";
        
        // Redirigir a login indicando que la sesión expiró SOLAMENTE si está en un área privada
        const path = window.location.pathname;
        const isAreaPrivada = path.startsWith("/dashboard") || path.startsWith("/mi-perfil");
        
        if (isAreaPrivada) {
          window.location.href = "/login?expired=true";
        }
      }
    }
    return Promise.reject(error);
  }
);
