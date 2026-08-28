"use client";

import { MessageCircle } from "lucide-react";
import { Check, CheckCheck } from "lucide-react";
import ChatParticipantAvatar from "./ChatParticipantAvatar";
import {
  nombreParticipante,
  type ChatParticipanteInfo,
} from "./chatParticipants";
import type { ChatMensaje } from "@/utils/types";

type Props = {
  mensaje: ChatMensaje;
  esMio: boolean;
  participante?: ChatParticipanteInfo | null;
  esGrupo?: boolean;
  onMensajePrivado?: (userId: string) => void;
  formatTime?: (date: string) => string;
  showReadReceipt?: boolean;
  bubbleSize?: "sm" | "md";
};

export default function ChatMessageBubble({
  mensaje,
  esMio,
  participante,
  esGrupo = false,
  onMensajePrivado,
  formatTime,
  showReadReceipt = false,
  bubbleSize = "md",
}: Props) {
  const textSize =
    bubbleSize === "sm" ? "text-[13px]" : "text-sm";
  const padding = bubbleSize === "sm" ? "px-3 py-2" : "px-4 py-2.5";
  const maxWidth =
    bubbleSize === "sm"
      ? "max-w-[90%] sm:max-w-[85%]"
      : "max-w-[88%] sm:max-w-[75%] lg:max-w-[60%]";

  const timeLabel = formatTime
    ? formatTime(mensaje.created_at)
    : new Date(mensaje.created_at).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      });

  if (esMio) {
    return (
      <div className="flex justify-end items-end gap-1.5 sm:gap-2 w-full">
        <div
          className={`${maxWidth} rounded-2xl ${padding} bg-brand-chartreuse text-brand-black rounded-br-md`}
        >
          <p className={`${textSize} whitespace-pre-wrap wrap-break-word leading-relaxed`}>
            {mensaje.contenido}
          </p>
          <div className="flex items-center gap-1 mt-1 justify-end">
            <span className="text-[10px] text-brand-black/50">{timeLabel}</span>
            {showReadReceipt && (
              <span className="text-brand-black/50">
                {mensaje.leido ? (
                  <CheckCheck className="size-3" />
                ) : (
                  <Check className="size-3" />
                )}
              </span>
            )}
          </div>
        </div>
        {esGrupo && (
          <ChatParticipantAvatar
            participante={participante}
            size="sm"
            className="hidden sm:flex"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1.5 sm:gap-2 w-full group">
      <div className="relative shrink-0 hidden sm:block">
        <ChatParticipantAvatar participante={participante} size="sm" />
        {esGrupo && onMensajePrivado && participante?.id && (
          <button
            type="button"
            onClick={() => onMensajePrivado(participante.id)}
            title={`Mensaje privado a ${nombreParticipante(participante)}`}
            className="absolute -bottom-1 -right-1 size-5 rounded-full bg-brand-card border border-brand-white/10 text-brand-chartreuse flex items-center justify-center hover:bg-brand-chartreuse hover:text-brand-black cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MessageCircle className="size-2.5" />
          </button>
        )}
      </div>

      <div className={`flex flex-col items-start min-w-0 flex-1 sm:flex-none ${maxWidth}`}>
        {esGrupo && (
          <div className="flex items-center gap-1.5 mb-1 px-0.5 sm:px-1 max-w-full">
            <span className="text-[10px] font-bold text-gray-500 truncate">
              {nombreParticipante(participante)}
            </span>
            {onMensajePrivado && participante?.id && (
              <button
                type="button"
                onClick={() => onMensajePrivado(participante.id)}
                className="text-[10px] font-bold text-brand-chartreuse hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Privado
              </button>
            )}
          </div>
        )}
        <div
          className={`w-full rounded-2xl ${padding} bg-brand-card border border-brand-white/5 text-brand-white rounded-bl-md`}
        >
          <p className={`${textSize} whitespace-pre-wrap wrap-break-word leading-relaxed`}>
            {mensaje.contenido}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-gray-500">{timeLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
