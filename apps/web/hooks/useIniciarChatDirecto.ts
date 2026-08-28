"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ChatService } from "@/utils/services/chat";
import { sileo } from "sileo";

export function useIniciarChatDirecto() {
  const router = useRouter();

  const iniciarChatDirecto = useCallback(
    async (destinatarioId: string) => {
      try {
        const conv = await ChatService.iniciarChat(destinatarioId);
        router.push(`/mensajes?c=${conv.id}&tab=directos`);
      } catch (err: unknown) {
        const message = isAxiosError(err)
          ? err.response?.data?.error || "No se pudo abrir el chat privado."
          : "No se pudo abrir el chat privado.";
        sileo.error({ title: "Error", description: message });
      }
    },
    [router],
  );

  return { iniciarChatDirecto };
}
