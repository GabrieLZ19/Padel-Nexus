"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import {
  useIniciarChatClub,
  type ContextoReservaParaChat,
} from "@/hooks/useIniciarChatClub";

type EscribirAlClubButtonProps = {
  clubId: string;
  clubNombre?: string;
  className?: string;
  redirectPath?: string;
  contextoReserva?: ContextoReservaParaChat;
};

export function EscribirAlClubButton({
  clubId,
  clubNombre,
  className = "",
  redirectPath,
  contextoReserva,
}: EscribirAlClubButtonProps) {
  const router = useRouter();
  const { profile } = useProfileStore();
  const { iniciarChatConClub } = useIniciarChatClub();
  const [abriendo, setAbriendo] = useState(false);

  const handleClick = async () => {
    if (!profile?.id) {
      const vuelta =
        redirectPath || `/reservar/club/${clubId}`;
      router.push(`/login?redirect=${encodeURIComponent(vuelta)}`);
      return;
    }
    setAbriendo(true);
    try {
      await iniciarChatConClub(clubId, {
        clubNombre: contextoReserva?.clubNombre ?? clubNombre,
        cancha: contextoReserva?.cancha,
        fecha: contextoReserva?.fecha,
        hora: contextoReserva?.hora,
      });
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={abriendo}
      aria-label={
        clubNombre
          ? `Escribir al club ${clubNombre}`
          : "Escribir al club"
      }
      className={
        className ||
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-sm font-bold text-white hover:border-brand-chartreuse/40 hover:text-brand-chartreuse transition-colors cursor-pointer disabled:opacity-50"
      }
    >
      {abriendo ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageSquare className="w-4 h-4" />
      )}
      Escribir al club
    </button>
  );
}
