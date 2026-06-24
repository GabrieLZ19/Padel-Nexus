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
