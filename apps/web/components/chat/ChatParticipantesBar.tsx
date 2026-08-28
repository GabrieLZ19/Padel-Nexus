"use client";

import { MessageCircle } from "lucide-react";
import ChatParticipantAvatar from "./ChatParticipantAvatar";
import {
  nombreParticipante,
  type ChatParticipanteInfo,
} from "./chatParticipants";

type Props = {
  participantes: ChatParticipanteInfo[];
  usuarioActualId?: string;
  onMensajePrivado?: (userId: string) => void;
  className?: string;
  compact?: boolean;
  mobile?: boolean;
};

export default function ChatParticipantesBar({
  participantes,
  usuarioActualId,
  onMensajePrivado,
  className = "",
  compact = false,
  mobile = false,
}: Props) {
  if (participantes.length === 0) return null;

  return (
    <div className={className}>
      {!compact && !mobile && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Jugadores del grupo
        </p>
      )}
      <div
        className={`flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-brand-white/10 ${
          compact && !mobile ? "justify-end" : ""
        }`}
      >
        {participantes.map((p) => {
          const esMio = p.id === usuarioActualId;
          return (
            <div
              key={p.id}
              className={`shrink-0 flex flex-col items-center gap-1 ${
                mobile
                  ? "min-w-[44px]"
                  : compact
                    ? "min-w-[52px]"
                    : "min-w-[72px] gap-1.5"
              }`}
            >
              <div className="relative">
                <ChatParticipantAvatar
                  participante={p}
                  size={mobile ? "xs" : compact ? "sm" : "md"}
                />
                {!esMio && onMensajePrivado && (
                  <button
                    type="button"
                    onClick={() => onMensajePrivado(p.id)}
                    title={`Mensaje privado a ${nombreParticipante(p)}`}
                    className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-brand-chartreuse text-brand-black flex items-center justify-center border-2 border-brand-card hover:opacity-90 cursor-pointer ${
                      mobile ? "size-4" : compact ? "size-5" : "size-6"
                    }`}
                  >
                    <MessageCircle
                      className={
                        mobile ? "size-2" : compact ? "size-2.5" : "size-3"
                      }
                    />
                  </button>
                )}
              </div>
              <span
                className={`font-bold text-gray-400 truncate text-center ${
                  mobile
                    ? "text-[8px] max-w-[44px]"
                    : compact
                      ? "text-[9px] max-w-[52px]"
                      : "text-[10px] max-w-[72px]"
                }`}
              >
                {esMio ? "Vos" : participantePrimerNombre(p)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function participantePrimerNombre(p: ChatParticipanteInfo) {
  return p.nombre || p.apellido || "Jugador";
}
