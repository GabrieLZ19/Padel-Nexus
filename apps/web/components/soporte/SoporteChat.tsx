"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Headset,
  Check,
  CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatService } from "@/utils/services/chat";
import { useChat } from "@/hooks/useChat";
import { useProfileStore } from "@/store/useProfileStore";
import type { ChatMensaje } from "@/utils/types";

export default function SoporteChat() {
  const { profile } = useProfileStore();
  const {
    joinConversation,
    leaveConversation,
    sendMessage,
    onNewMessage,
    emitTyping,
    emitStopTyping,
    onUserTyping,
    onUserStopTyping,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Iniciar o retomar conversación de soporte ───────────────────────
  const handleOpen = async () => {
    setIsOpen(true);
    setNoLeidos(0);

    if (conversacionId) {
      // Ya tenemos una conversación, solo recargar mensajes
      joinConversation(conversacionId);
      await loadMensajes(conversacionId);
      return;
    }

    setLoading(true);
    try {
      const result = await ChatService.iniciarSoporte();
      setConversacionId(result.id);
      joinConversation(result.id);
      await loadMensajes(result.id);
    } catch (err) {
      console.error("Error al iniciar soporte:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (conversacionId) {
      leaveConversation(conversacionId);
    }
  };

  const loadMensajes = async (convId: string) => {
    try {
      const { mensajes: msgs } = await ChatService.getMensajes(convId);
      setMensajes(msgs);
    } catch (err) {
      console.error("Error al cargar mensajes de soporte:", err);
    }
  };

  // ── Escuchar nuevos mensajes ────────────────────────────────────────
  useEffect(() => {
    const cleanup = onNewMessage((mensaje: ChatMensaje) => {
      if (conversacionId && mensaje.conversacion_id === conversacionId) {
        setMensajes((prev) => {
          if (prev.some((m) => m.id === mensaje.id)) return prev;

          // Buscar si existe un mensaje temporal idéntico enviado por mí
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

        if (!isOpen) {
          setNoLeidos((prev) => prev + 1);
        }
      }
    });

    return cleanup;
  }, [onNewMessage, conversacionId, isOpen]);

  // ── Typing indicators ──────────────────────────────────────────────
  useEffect(() => {
    const cleanupTyping = onUserTyping((data) => {
      if (data.conversacion_id === conversacionId) {
        setIsTyping(true);
      }
    });

    const cleanupStopTyping = onUserStopTyping((data) => {
      if (data.conversacion_id === conversacionId) {
        setIsTyping(false);
      }
    });

    return () => {
      cleanupTyping();
      cleanupStopTyping();
    };
  }, [onUserTyping, onUserStopTyping, conversacionId]);

  // ── Auto-scroll ─────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, isTyping]);

  // ── Chat notification listener (para no leídos cuando está cerrado) ─
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.conversacion_id === conversacionId && !isOpen) {
        setNoLeidos((prev) => prev + 1);
      }
    };

    window.addEventListener("chat_notification", handler);
    return () => window.removeEventListener("chat_notification", handler);
  }, [conversacionId, isOpen]);

  // ── Cargar no leídos al montar ──────────────────────────────────────
  useEffect(() => {
    ChatService.getNoLeidos()
      .then((total) => setNoLeidos(total))
      .catch(() => {});
  }, []);

  // ── Enviar mensaje ──────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!inputMsg.trim() || !conversacionId) return;

    sendMessage(conversacionId, inputMsg);

    const optimisticMsg: ChatMensaje = {
      id: `temp-${Date.now()}`,
      conversacion_id: conversacionId,
      remitente_id: profile?.id || "",
      contenido: inputMsg.trim(),
      leido: false,
      created_at: new Date().toISOString(),
    };

    setMensajes((prev) => [...prev, optimisticMsg]);
    setInputMsg("");
    emitStopTyping(conversacionId);
    inputRef.current?.focus();
  }, [inputMsg, conversacionId, sendMessage, emitStopTyping, profile?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMsg(e.target.value);
    if (conversacionId) {
      emitTyping(conversacionId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping(conversacionId);
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!profile) return null;

  return (
    <>
      {/* Botón flotante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-brand-chartreuse text-brand-black flex items-center justify-center shadow-[0_0_25px_rgba(203,254,1,0.3)] hover:shadow-[0_0_35px_rgba(203,254,1,0.5)] hover:scale-105 transition-all cursor-pointer"
          >
            <MessageSquare className="size-6" />
            {noLeidos > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-[10px] font-black px-1 shadow-lg">
                {noLeidos > 99 ? "99+" : noLeidos}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] max-h-[80vh] bg-brand-black border border-brand-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-brand-card border-b border-brand-white/5 flex items-center gap-3">
              <div className="size-9 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center">
                <Headset className="size-4 text-brand-chartreuse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-brand-white">
                  Soporte Padel Nexus
                </h4>
                <p className="text-[10px] text-gray-500">
                  {isTyping ? (
                    <span className="text-brand-chartreuse animate-pulse">
                      Escribiendo...
                    </span>
                  ) : (
                    "Normalmente respondemos rápido"
                  )}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-brand-white/5 transition-colors cursor-pointer"
              >
                <X className="size-4 text-gray-400" />
              </button>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin size-6 border-2 border-brand-chartreuse border-t-transparent rounded-full" />
                </div>
              ) : mensajes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="size-14 rounded-2xl bg-brand-card border border-brand-white/5 flex items-center justify-center mb-4">
                    <Headset className="size-6 text-brand-chartreuse/50" />
                  </div>
                  <h4 className="text-sm font-bold text-brand-white mb-1">
                    ¡Hola! 👋
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    ¿Tenés alguna duda o problema? Escribinos y te ayudamos lo
                    antes posible.
                  </p>
                </div>
              ) : (
                mensajes.map((msg) => {
                  const esMio = msg.remitente_id === profile?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${esMio ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                          esMio
                            ? "bg-brand-chartreuse text-brand-black rounded-br-md"
                            : "bg-brand-card border border-brand-white/5 text-brand-white rounded-bl-md"
                        }`}
                      >
                        <p className="text-[13px] whitespace-pre-wrap wrap-break-word leading-relaxed">
                          {msg.contenido}
                        </p>
                        <div
                          className={`flex items-center gap-1 mt-0.5 ${esMio ? "justify-end" : ""}`}
                        >
                          <span
                            className={`text-[9px] ${esMio ? "text-brand-black/40" : "text-gray-600"}`}
                          >
                            {formatMessageTime(msg.created_at)}
                          </span>
                          {esMio &&
                            (msg.leido ? (
                              <CheckCheck className="size-2.5 text-brand-black/40" />
                            ) : (
                              <Check className="size-2.5 text-brand-black/40" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-brand-card border border-brand-white/5 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <span className="size-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="size-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="size-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-brand-white/5 bg-brand-card/30">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={inputMsg}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje..."
                  rows={1}
                  className="flex-1 resize-none bg-brand-card border border-brand-white/5 rounded-xl px-3 py-2.5 text-[13px] text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors max-h-24"
                  style={{ minHeight: "40px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputMsg.trim()}
                  className="shrink-0 size-10 rounded-xl bg-brand-chartreuse text-brand-black flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
