import type { ChatPartidoParticipante } from "@/utils/types";

export type ChatParticipanteInfo = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  avatar_url: string | null;
};

export function nombreParticipante(
  participante?: ChatParticipanteInfo | null,
): string {
  if (!participante) return "Jugador";
  const parts = [participante.nombre, participante.apellido].filter(Boolean);
  return parts.length ? parts.join(" ") : "Jugador";
}

export function inicialesParticipante(
  participante?: ChatParticipanteInfo | null,
): string {
  const n = participante?.nombre?.[0] || "";
  const a = participante?.apellido?.[0] || "";
  return (n + a).toUpperCase() || "?";
}

export function mapPartidoParticipantes(
  participantes: ChatPartidoParticipante[] = [],
): ChatParticipanteInfo[] {
  return participantes.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    avatar_url: p.avatar_url,
  }));
}

export function buscarParticipante(
  participantes: ChatParticipanteInfo[],
  userId: string,
): ChatParticipanteInfo | undefined {
  return participantes.find((p) => p.id === userId);
}
