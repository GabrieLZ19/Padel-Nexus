"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ChatService } from "@/utils/services/chat";
import { sileo } from "sileo";

export function useIniciarChatClub() {
  const router = useRouter();

  const iniciarChatConClub = useCallback(
    async (clubId: string) => {
      try {
        const conv = await ChatService.iniciarChatClub(clubId);
        router.push(`/mensajes?c=${conv.id}&tab=directos`);
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
