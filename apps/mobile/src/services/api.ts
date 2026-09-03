import axios from "axios";

import { clearAccessToken, getAccessToken } from "@/src/lib/secureToken";
import { resolveApiUrl } from "@/src/lib/resolveApiUrl";

const API_URL = resolveApiUrl();

if (__DEV__) {
  console.log("[mobile] API URL:", API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  // Render free tier puede tardar ~50s en despertar del sleep.
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  config.headers["X-Padel-Client"] = "mobile";
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAccessToken();
    }
    return Promise.reject(error);
  },
);
