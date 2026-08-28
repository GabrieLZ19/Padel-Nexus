"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Send, MessageSquare, ExternalLink } from "lucide-react";
import { ChatService } from "@/utils/services/chat";
import { useChat } from "@/hooks/useChat";
import { useProfileStore } from "@/store/useProfileStore";
import { useIniciarChatDirecto } from "@/hooks/useIniciarChatDirecto";
import type { ChatMensaje } from "@/utils/types";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import ChatParticipantesBar from "@/components/chat/ChatParticipantesBar";
import {
  buscarParticipante,
  type ChatParticipanteInfo,
} from "@/components/chat/chatParticipants";

type Props = {
  conversacionId: string;
  participantes?: ChatParticipanteInfo[];
  className?: string;
  expanded?: boolean;
};

export default function PartidoChatPanel({
  conversacionId,
  participantes = [],
  className = "",
  expanded = false,
}: Props) {
  const { profile } = useProfileStore();
  const { iniciarChatDirecto } = useIniciarChatDirecto();
  const { joinConversation, leaveConversation, sendMessage, onNewMessage } =
    useChat();

  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMensajes = useCallback(async () => {
    setLoading(true);
    try {
      const { mensajes: msgs } = await ChatService.getMensajes(conversacionId);
      setMensajes(msgs);
    } catch {
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  }, [conversacionId]);

  useEffect(() => {
    joinConversation(conversacionId);
    void loadMensajes();
    return () => leaveConversation(conversacionId);
  }, [conversacionId, joinConversation, leaveConversation, loadMensajes]);

  useEffect(() => {
    const cleanup = onNewMessage((mensaje: ChatMensaje) => {
      if (mensaje.conversacion_id !== conversacionId) return;
      setMensajes((prev) => {
        if (prev.some((m) => m.id === mensaje.id)) return prev;
        const tempIndex = prev.findIndex(
          (m) =>
            m.id.startsWith("temp-") &&
            m.remitente_id === mensaje.remitente_id &&
            m.contenido === mensaje.contenido,
        );
        if (tempIndex !== -1) {
          const next = [...prev];
          next[tempIndex] = mensaje;
          return next;
        }
        return [...prev, mensaje];
      });
    });
    return cleanup;
  }, [conversacionId, onNewMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const handleMensajePrivado = useCallback(
    (userId: string) => {
      if (!profile?.id || userId === profile.id) return;
      void iniciarChatDirecto(userId);
    },
    [iniciarChatDirecto, profile?.id],
  );

  const handleSend = () => {
    if (!input.trim() || !profile?.id) return;
    sendMessage(conversacionId, input);
    setMensajes((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        conversacion_id: conversacionId,
        remitente_id: profile.id,
        contenido: input.trim(),
        leido: false,
        created_at: new Date().toISOString(),
      },
    ]);
    setInput("");
  };

  const miParticipante =
    buscarParticipante(participantes, profile?.id || "") ||
    (profile?.id
      ? {
          id: profile.id,
          nombre: profile.nombre ?? null,
          apellido: profile.apellido ?? null,
          avatar_url: profile.avatar_url ?? null,
        }
      : null);

  if (!profile?.id) {
    return (
      <div
        className={`rounded-2xl border border-brand-white/10 bg-brand-card p-6 text-center text-sm text-gray-400 ${className}`}
      >
        Iniciá sesión para chatear con el grupo del partido.
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-3xl border border-brand-white/10 bg-brand-card overflow-hidden shadow-2xl ${className}`}
    >
      <div className="px-5 py-4 border-b border-brand-white/5 bg-brand-black/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-black text-brand-white flex items-center gap-2">
                <MessageSquare className="size-4 text-brand-chartreuse shrink-0" />
                Chat del partido
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Coordiná en grupo o tocá el ícono para hablar en privado.
              </p>
            </div>

            {participantes.length > 0 && (
              <ChatParticipantesBar
                participantes={participantes}
                usuarioActualId={profile.id}
                onMensajePrivado={handleMensajePrivado}
                compact
                className="sm:ml-auto"
              />
            )}
          </div>

          <Link
            href={`/mensajes?c=${conversacionId}&tab=partidos`}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-brand-chartreuse hover:underline"
          >
            En Mensajes
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-5 py-4 space-y-4 ${
          expanded ? "min-h-[320px]" : "min-h-[220px] max-h-[360px]"
        }`}
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-brand-chartreuse" />
          </div>
        ) : mensajes.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">
            Todavía no hay mensajes. ¡Rompé el hielo!
          </p>
        ) : (
          mensajes.map((msg) => {
            const esMio = msg.remitente_id === profile.id;
            const participante = esMio
              ? miParticipante
              : buscarParticipante(participantes, msg.remitente_id);

            return (
              <ChatMessageBubble
                key={msg.id}
                mensaje={msg}
                esMio={esMio}
                participante={participante}
                esGrupo
                bubbleSize="sm"
                onMensajePrivado={handleMensajePrivado}
              />
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-brand-white/5 flex gap-2 bg-brand-black/20">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escribí un mensaje..."
          className="flex-1 bg-brand-black border border-brand-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim()}
          className="shrink-0 size-10 rounded-xl bg-brand-chartreuse text-brand-black flex items-center justify-center disabled:opacity-40 cursor-pointer"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
