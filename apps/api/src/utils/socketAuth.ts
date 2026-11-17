import type { Socket } from "socket.io";
import { supabase } from "../config/supabase";

export type SocketDataAuth = {
  usuarioId?: string;
};

export function extraerTokenSocket(socket: Socket): string | null {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string") {
    const trimmed = fromAuth.trim();
    if (trimmed && trimmed !== "undefined" && trimmed !== "null") {
      return trimmed;
    }
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const trimmed = header.slice(7).trim();
    if (trimmed) return trimmed;
  }

  const cookieHeader = socket.handshake.headers.cookie;
  if (typeof cookieHeader === "string") {
    const match = cookieHeader.match(/(?:^|;\s*)padel_token=([^;]+)/);
    const raw = match?.[1];
    if (raw) {
      try {
        const trimmed = decodeURIComponent(raw).trim();
        if (trimmed) return trimmed;
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function verificarUsuarioDesdeToken(
  token: string,
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.id) {
    return null;
  }
  return user.id;
}

export function usuarioIdVerificadoSocket(socket: Socket): string | undefined {
  const data = socket.data as SocketDataAuth;
  return data.usuarioId;
}