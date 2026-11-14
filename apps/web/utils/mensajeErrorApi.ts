import axios from "axios";

/** Texto legible desde errores de la API (axios o Error). */
export function mensajeErrorApi(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; error?: string }
      | string
      | undefined;
    if (typeof data === "string" && data.trim()) return data.trim();
    const msg = data?.message || data?.error;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return fallback;
}
