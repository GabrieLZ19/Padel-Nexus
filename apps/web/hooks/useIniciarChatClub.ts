"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ChatService } from "@/utils/services/chat";
import { sileo } from "sileo";

export type ContextoReservaParaChat = {
  clubNombre?: string;
  cancha?: string;
  fecha?: string;
  hora?: string;
};

export function useIniciarChatClub() {
  const router = useRouter();

  const iniciarChatConClub = useCallback(
    async (clubId: string, contexto?: ContextoReservaParaChat) => {
      try {
        const conv = await ChatService.iniciarChatClub(clubId);
        const params = new URLSearchParams({
          c: conv.id,
          tab: "directos",
          club: clubId,
        });
        if (contexto?.clubNombre?.trim()) {
          params.set("ref_club", contexto.clubNombre.trim());
        }
        if (contexto?.cancha?.trim()) {
          params.set("ref_cancha", contexto.cancha.trim());
        }
        if (contexto?.fecha?.trim()) {
          params.set("ref_fecha", contexto.fecha.trim());
        }
        if (contexto?.hora?.trim()) {
          params.set("ref_hora", contexto.hora.trim());
        }
        router.push(`/mensajes?${params.toString()}`);
      } catch (err: unknown) {
        const message = isAxiosError(err)
          ? err.response?.data?.error ||
            "No se pudo abrir el chat con el club."
          : "No se pudo abrir el chat con el club.";
        sileo.error({ title: "Error", description: message });
      }
    },
    [router],
  );

  return { iniciarChatConClub };
}
