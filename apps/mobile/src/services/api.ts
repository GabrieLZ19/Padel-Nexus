import axios from "axios";

import { clearAccessToken, getAccessToken } from "@/src/lib/secureToken";
import { resolveApiUrl } from "@/src/lib/resolveApiUrl";

const API_URL = resolveApiUrl();

if (__DEV__) {
  console.log("[mobile] API URL:", API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
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
