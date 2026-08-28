"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  User,
  X,
  Headset,
  ShoppingBag,
  ExternalLink,
  Users,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ChatService } from "@/utils/services/chat";
import { useChat } from "@/hooks/useChat";
import { useProfileStore } from "@/store/useProfileStore";
import { sileo } from "sileo";
import type { ChatConversacion, ChatMensaje } from "@/utils/types";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import ChatParticipantesBar from "@/components/chat/ChatParticipantesBar";
import {
  buscarParticipante,
  mapPartidoParticipantes,
  type ChatParticipanteInfo,
} from "@/components/chat/chatParticipants";

export type ChatInboxTab =
  | "todos"
  | "directos"
  | "soporte"
  | "marketplace"
  | "partidos";

interface ChatInboxProps {
  title?: string;
  subtitle?: string;
  defaultTab?: ChatInboxTab;
  showSoporteButton?: boolean;
  className?: string;
}

function formatPrecio(precio: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
}

function tabForConv(conv: ChatConversacion): ChatInboxTab {
  switch (conv.tipo) {
    case "partido":
      return "partidos";
    case "marketplace":
      return "marketplace";
    case "soporte":
      return "soporte";
    default:
      return "directos";
  }
}

function buildMensajesUrl(convId?: string | null, tab?: ChatInboxTab) {
  const params = new URLSearchParams();
  if (tab) params.set("tab", tab);
  if (convId) params.set("c", convId);
  const query = params.toString();
  return query ? `/mensajes?${query}` : "/mensajes";
}

export default function ChatInbox({
  title = "Mensajes",
  subtitle = "Conversaciones en tiempo real",
  defaultTab = "todos",
  showSoporteButton = false,
  className = "",
}: ChatInboxProps) {
  const { profile } = useProfileStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkConvId = searchParams.get("c");
  const tabParam = searchParams.get("tab");

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

  const [conversaciones, setConversaciones] = useState<ChatConversacion[]>([]);
  const [activeConv, setActiveConv] = useState<ChatConversacion | null>(null);
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ChatInboxTab>(defaultTab);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConvRef = useRef<ChatConversacion | null>(null);
  const mensajesFetchGenRef = useRef(0);

  const fetchConversaciones = useCallback(async () => {
    try {
      const data = await ChatService.getConversaciones();
      setConversaciones(data);
      return data;
    } catch (err) {
      console.error("Error al cargar conversaciones:", err);
      return [] as ChatConversacion[];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversaciones();
  }, [fetchConversaciones]);

  useEffect(() => {
    if (
      tabParam === "todos" ||
      tabParam === "directos" ||
      tabParam === "soporte" ||
      tabParam === "marketplace" ||
      tabParam === "partidos"
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchMensajes = useCallback(async (convId: string, cursor?: string) => {
    const fetchGen = ++mensajesFetchGenRef.current;
    if (!cursor) setLoadingMensajes(true);
    try {
      const { mensajes: msgs, hay_mas } = await ChatService.getMensajes(
        convId,
        cursor,
      );

      if (fetchGen !== mensajesFetchGenRef.current) return;

      if (cursor) {
        setMensajes((prev) => [...msgs, ...prev]);
      } else {
        setMensajes(msgs);
      }
      setHayMas(hay_mas);
    } catch (err) {
      if (fetchGen !== mensajesFetchGenRef.current) return;
      console.error("Error al cargar mensajes:", err);
    } finally {
      if (fetchGen === mensajesFetchGenRef.current) {
        setLoadingMensajes(false);
      }
    }
  }, []);

  const selectConversacion = useCallback(
    (conv: ChatConversacion) => {
      const prev = activeConvRef.current;
      if (prev?.id && prev.id !== conv.id) {
        leaveConversation(prev.id);
      }

      activeConvRef.current = conv;
      setActiveConv(conv);
      setMensajes([]);
      setHayMas(false);
      setTypingUsers(new Set());
      setShowMobileChat(true);
      joinConversation(conv.id);
      fetchMensajes(conv.id);

      setConversaciones((prevConvs) =>
        prevConvs.map((c) => (c.id === conv.id ? { ...c, no_leidos: 0 } : c)),
      );
    },
    [joinConversation, leaveConversation, fetchMensajes],
  );

  const handleSelectConversacion = useCallback(
    (conv: ChatConversacion) => {
      const tab = tabForConv(conv);
      setActiveTab(tab);
      selectConversacion(conv);
      router.replace(buildMensajesUrl(conv.id, tab), { scroll: false });
    },
    [selectConversacion, router],
  );

  // Deep link ?c=conversacionId — solo cuando cambia la URL, no al elegir en sidebar
  useEffect(() => {
    if (loading || !deepLinkConvId) return;
    const conv = conversaciones.find((c) => c.id === deepLinkConvId);
    if (!conv || activeConvRef.current?.id === deepLinkConvId) return;
    selectConversacion(conv);
  }, [deepLinkConvId, conversaciones, loading, selectConversacion]);

  const handleContactarAdministracion = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ChatService.iniciarSoporte();
      const actualizadas = await ChatService.getConversaciones();
      setConversaciones(actualizadas);

      const soporteConv = actualizadas.find((c) => c.id === result.id);
      if (soporteConv) {
        handleSelectConversacion(soporteConv);
      }
    } catch (err) {
      console.error("Error al contactar soporte administrador:", err);
    } finally {
      setLoading(false);
    }
  }, [handleSelectConversacion]);

  useEffect(() => {
    const cleanup = onNewMessage((mensaje: ChatMensaje) => {
      if (activeConv && mensaje.conversacion_id === activeConv.id) {
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
      }

      setConversaciones((prev) =>
        prev.map((c) => {
          if (c.id === mensaje.conversacion_id) {
            return {
              ...c,
              ultimo_mensaje: {
                contenido: mensaje.contenido,
                created_at: mensaje.created_at,
                remitente_id: mensaje.remitente_id,
              },
              no_leidos:
                activeConv?.id === mensaje.conversacion_id
                  ? c.no_leidos
                  : c.no_leidos + 1,
            };
          }
          return c;
        }),
      );
    });

    return cleanup;
  }, [onNewMessage, activeConv]);

  useEffect(() => {
    const cleanupTyping = onUserTyping((data) => {
      if (data.conversacion_id === activeConv?.id) {
        setTypingUsers((prev) => new Set(prev).add(data.usuario_id));
      }
    });

    const cleanupStopTyping = onUserStopTyping((data) => {
      if (data.conversacion_id === activeConv?.id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.usuario_id);
          return next;
        });
      }
    });

    return () => {
      cleanupTyping();
      cleanupStopTyping();
    };
  }, [onUserTyping, onUserStopTyping, activeConv]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !hayMas || loadingMensajes || !activeConv) return;

    if (container.scrollTop < 50) {
      const oldestMsg = mensajes[0];
      if (oldestMsg) {
        fetchMensajes(activeConv.id, oldestMsg.created_at);
      }
    }
  }, [hayMas, loadingMensajes, activeConv, mensajes, fetchMensajes]);

  const handleSend = useCallback(() => {
    if (!inputMsg.trim() || !activeConv) return;

    sendMessage(activeConv.id, inputMsg);

    const optimisticMsg: ChatMensaje = {
      id: `temp-${Date.now()}`,
      conversacion_id: activeConv.id,
      remitente_id: profile?.id || "",
      contenido: inputMsg.trim(),
      leido: false,
      created_at: new Date().toISOString(),
    };

    setMensajes((prev) => [...prev, optimisticMsg]);
    setInputMsg("");

    setConversaciones((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            ultimo_mensaje: {
              contenido: optimisticMsg.contenido,
              created_at: optimisticMsg.created_at,
              remitente_id: optimisticMsg.remitente_id,
            },
          };
        }
        return c;
      }),
    );

    emitStopTyping(activeConv.id);
    inputRef.current?.focus();
  }, [inputMsg, activeConv, sendMessage, emitStopTyping, profile?.id]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputMsg(e.target.value);

      if (activeConv) {
        emitTyping(activeConv.id);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          emitStopTyping(activeConv.id);
        }, 2000);
      }
    },
    [activeConv, emitTyping, emitStopTyping],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  useEffect(() => {
    const handler = () => {
      fetchConversaciones();
    };

    window.addEventListener("chat_notification", handler);
    return () => window.removeEventListener("chat_notification", handler);
  }, [fetchConversaciones]);

  const filteredConversaciones = conversaciones.filter((conv) => {
    const matchTab =
      activeTab === "todos" ||
      (activeTab === "directos" && conv.tipo === "directo") ||
      (activeTab === "soporte" && conv.tipo === "soporte") ||
      (activeTab === "marketplace" && conv.tipo === "marketplace") ||
      (activeTab === "partidos" && conv.tipo === "partido");

    const nombreParticipante =
      `${conv.otro_participante.nombre || ""} ${conv.otro_participante.apellido || ""}`.toLowerCase();
    const nombreProducto = (conv.producto?.nombre || "").toLowerCase();
    const nombreClub = (conv.partido?.club_nombre || "").toLowerCase();
    const nombreCancha = (conv.partido?.cancha_nombre || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchSearch =
      !searchQuery ||
      nombreParticipante.includes(q) ||
      nombreProducto.includes(q) ||
      nombreClub.includes(q) ||
      nombreCancha.includes(q);

    return matchTab && matchSearch;
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  };

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDisplayName = (p: ChatConversacion["otro_participante"]) => {
    if (p.nombre && p.apellido)
      return `${p.apellido.toUpperCase()}, ${p.nombre}`;
    if (p.nombre) return p.nombre;
    if (p.apellido) return p.apellido.toUpperCase();
    return "Usuario";
  };

  const getRolBadge = (rol: string) => {
    const roles: Record<string, string> = {
      superadmin: "Super Admin",
      admin: "Admin",
      admin_federacion: "Federación",
      admin_provincial: "Provincial",
      usuario: "Jugador",
    };
    return roles[rol] || rol;
  };

  const formatPartidoFecha = (fecha?: string | null) => {
    if (!fecha) return "";
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const getConversationTitle = (conv: ChatConversacion) => {
    if (conv.tipo === "partido" && conv.partido) {
      return conv.partido.club_nombre || "Grupo de reserva";
    }
    return getDisplayName(conv.otro_participante);
  };

  const getConversationSubtitle = (conv: ChatConversacion) => {
    if (conv.tipo !== "partido" || !conv.partido) return null;
    const parts = [
      conv.partido.cancha_nombre,
      formatPartidoFecha(conv.partido.fecha_reserva),
      conv.partido.nivel_requerido,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  const participantesActivos: ChatParticipanteInfo[] =
    activeConv?.tipo === "partido" && activeConv.partido
      ? mapPartidoParticipantes(activeConv.partido.participantes)
      : [];

  const miParticipante: ChatParticipanteInfo | null = profile?.id
    ? buscarParticipante(participantesActivos, profile.id) || {
        id: profile.id,
        nombre: profile.nombre ?? null,
        apellido: profile.apellido ?? null,
        avatar_url: profile.avatar_url ?? null,
      }
    : null;

  const resolverParticipanteMensaje = (
    remitenteId: string,
  ): ChatParticipanteInfo | null => {
    if (!activeConv) return null;
    if (activeConv.tipo === "partido") {
      return (
        buscarParticipante(participantesActivos, remitenteId) ||
        miParticipante
      );
    }
    if (remitenteId === profile?.id) return miParticipante;
    return {
      id: activeConv.otro_participante.id,
      nombre: activeConv.otro_participante.nombre,
      apellido: activeConv.otro_participante.apellido,
      avatar_url: activeConv.otro_participante.avatar_url,
    };
  };

  const handleMensajePrivado = useCallback(
    async (userId: string) => {
      if (!profile?.id || userId === profile.id) return;

      try {
        const conv = await ChatService.iniciarChat(userId);
        const actualizadas = await ChatService.getConversaciones();
        setConversaciones(actualizadas);

        const directConv = actualizadas.find((c) => c.id === conv.id);
        if (!directConv) {
          sileo.error({
            title: "Error",
            description: "No se pudo abrir el chat privado.",
          });
          return;
        }

        setActiveTab("directos");
        handleSelectConversacion(directConv);
      } catch (err: unknown) {
        const message = isAxiosError(err)
          ? err.response?.data?.error || "No se pudo abrir el chat privado."
          : "No se pudo abrir el chat privado.";
        sileo.error({ title: "Error", description: message });
      }
    },
    [profile?.id, handleSelectConversacion],
  );

  const handleTabChange = useCallback(
    (tab: ChatInboxTab) => {
      setActiveTab(tab);
      router.replace(buildMensajesUrl(deepLinkConvId, tab), { scroll: false });
    },
    [deepLinkConvId, router],
  );

  const tabs: { key: ChatInboxTab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "partidos", label: "Reservas" },
    { key: "marketplace", label: "Ventas" },
    { key: "directos", label: "Directos" },
    { key: "soporte", label: "Soporte" },
  ];

  const productoImagen =
    activeConv?.producto?.thumbnail_url ||
    activeConv?.producto?.imagenes?.[0] ||
    null;

  return (
    <div
      className={`flex flex-col min-h-0 h-[calc(100dvh-4.5rem)] md:h-[calc(100dvh-5.5rem)] ${className}`}
    >
      <div
        className={`px-4 md:px-6 lg:px-10 py-4 md:py-6 border-b border-brand-white/5 shrink-0 ${
          showMobileChat ? "hidden md:block" : ""
        }`}
      >
        <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-brand-white">
          {title}
        </h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div
          className={`w-full md:w-96 lg:w-[420px] border-r border-brand-white/5 flex flex-col shrink-0 bg-brand-black min-h-0 ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="px-4 pt-4 pb-2">
            <div className="flex bg-brand-card p-1 rounded-xl border border-brand-white/5 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`shrink-0 flex-1 min-w-[72px] py-2 px-2 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? "bg-brand-chartreuse text-brand-black shadow-sm"
                      : "text-gray-400 hover:text-brand-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-white/5 rounded-xl text-sm text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-white cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {showSoporteButton && profile?.rol === "admin_club" && (
            <div className="px-4 pb-2">
              <button
                onClick={handleContactarAdministracion}
                className="w-full bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/20 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-brand-chartreuse/5"
              >
                <Headset className="size-3.5 animate-pulse" /> Contactar a la
                Administración
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse flex gap-3 p-3 rounded-xl"
                  >
                    <div className="size-12 rounded-full bg-brand-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-brand-white/5 rounded w-2/3" />
                      <div className="h-2 bg-brand-white/5 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
                <MessageSquare className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-medium text-center">
                  {searchQuery
                    ? "No se encontraron conversaciones"
                    : "No hay conversaciones aún"}
                </p>
              </div>
            ) : (
              filteredConversaciones.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversacion(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all cursor-pointer border-l-2 ${
                    activeConv?.id === conv.id
                      ? "bg-brand-chartreuse/5 border-l-brand-chartreuse"
                      : "border-l-transparent hover:bg-brand-white/3"
                  }`}
                >
                  <div className="relative size-12 rounded-full bg-brand-card border border-brand-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {conv.tipo === "partido" ? (
                      <Users className="size-5 text-brand-chartreuse" />
                    ) : conv.otro_participante.avatar_url ? (
                      <Image
                        src={conv.otro_participante.avatar_url}
                        alt="Avatar"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="size-5 text-gray-500" />
                    )}
                    {conv.tipo === "soporte" && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-brand-chartreuse rounded-full p-0.5">
                        <Headset className="size-2.5 text-brand-black" />
                      </div>
                    )}
                    {conv.tipo === "marketplace" && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-brand-chartreuse rounded-full p-0.5">
                        <ShoppingBag className="size-2.5 text-brand-black" />
                      </div>
                    )}
                    {conv.tipo === "partido" && (
                      <div className="absolute -bottom-0.5 -right-0.5 bg-brand-chartreuse rounded-full p-0.5">
                        <Calendar className="size-2.5 text-brand-black" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-brand-white truncate">
                        {getConversationTitle(conv)}
                      </span>
                      {conv.ultimo_mensaje && (
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {formatTime(conv.ultimo_mensaje.created_at)}
                        </span>
                      )}
                    </div>
                    {conv.producto && (
                      <p className="text-[11px] text-brand-chartreuse/80 truncate mt-0.5">
                        {conv.producto.nombre}
                      </p>
                    )}
                    {conv.tipo === "partido" && getConversationSubtitle(conv) && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {getConversationSubtitle(conv)}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 truncate">
                        {conv.ultimo_mensaje
                          ? conv.ultimo_mensaje.remitente_id === profile?.id
                            ? `Tú: ${conv.ultimo_mensaje.contenido}`
                            : conv.ultimo_mensaje.contenido
                          : "Sin mensajes"}
                      </p>
                      {conv.no_leidos > 0 && (
                        <span className="shrink-0 min-w-5 h-5 flex items-center justify-center bg-brand-chartreuse text-brand-black rounded-full text-[10px] font-black px-1.5 shadow-[0_0_8px_rgba(203,254,1,0.3)]">
                          {conv.no_leidos > 99 ? "99+" : conv.no_leidos}
                        </span>
                      )}
                    </div>
                    {conv.tipo === "soporte" && (
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-brand-chartreuse bg-brand-chartreuse/10 px-2 py-0.5 rounded-md border border-brand-chartreuse/20">
                        Soporte
                      </span>
                    )}
                    {conv.tipo === "marketplace" && (
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-brand-chartreuse bg-brand-chartreuse/10 px-2 py-0.5 rounded-md border border-brand-chartreuse/20">
                        Marketplace
                      </span>
                    )}
                    {conv.tipo === "partido" && (
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-brand-chartreuse bg-brand-chartreuse/10 px-2 py-0.5 rounded-md border border-brand-chartreuse/20">
                        Grupo de reserva
                        {conv.partido?.participantes.length
                          ? ` · ${conv.partido.participantes.length}`
                          : ""}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col bg-brand-black min-h-0 ${
            !showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              <div className="shrink-0 px-3 md:px-4 lg:px-6 py-3 md:py-4 border-b border-brand-white/5 bg-brand-card/50">
                <div className="flex items-start gap-2 md:gap-3">
                <button
                  onClick={() => {
                    setShowMobileChat(false);
                    if (activeConv) leaveConversation(activeConv.id);
                    activeConvRef.current = null;
                    setActiveConv(null);
                    router.replace(buildMensajesUrl(null, activeTab), {
                      scroll: false,
                    });
                  }}
                  className="md:hidden p-1.5 rounded-xl bg-brand-white/5 hover:bg-brand-white/10 transition-colors cursor-pointer shrink-0 mt-0.5"
                >
                  <ArrowLeft className="size-4 text-gray-400" />
                </button>

                <div className="relative size-9 md:size-10 rounded-full bg-brand-card border border-brand-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {activeConv.tipo === "partido" ? (
                    <Users className="size-4 text-brand-chartreuse" />
                  ) : activeConv.otro_participante.avatar_url ? (
                    <Image
                      src={activeConv.otro_participante.avatar_url}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="size-4 text-gray-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-brand-white truncate">
                    {getConversationTitle(activeConv)}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {activeConv.tipo === "partido" ? (
                      <span className="text-[9px] md:text-[10px] font-bold uppercase text-brand-chartreuse bg-brand-chartreuse/10 px-1.5 md:px-2 py-0.5 rounded border border-brand-chartreuse/20">
                        Grupo de reserva
                      </span>
                    ) : (
                      <span className="text-[9px] md:text-[10px] font-bold uppercase text-gray-500 bg-brand-white/5 px-1.5 md:px-2 py-0.5 rounded">
                        {getRolBadge(activeConv.otro_participante.rol)}
                      </span>
                    )}
                    {activeConv.tipo === "partido" &&
                      getConversationSubtitle(activeConv) && (
                        <span className="hidden sm:inline text-[10px] text-gray-500 truncate">
                          {getConversationSubtitle(activeConv)}
                        </span>
                      )}
                    {typingUsers.size > 0 && (
                      <span className="text-[10px] md:text-[11px] text-brand-chartreuse font-medium animate-pulse">
                        Escribiendo...
                      </span>
                    )}
                  </div>
                  {activeConv.tipo === "partido" &&
                    getConversationSubtitle(activeConv) && (
                      <p className="sm:hidden text-[10px] text-gray-500 truncate mt-1">
                        {getConversationSubtitle(activeConv)}
                      </p>
                    )}
                </div>

                {activeConv.tipo === "partido" &&
                  participantesActivos.length > 0 && (
                    <div className="hidden md:block shrink-0 max-w-[min(100%,280px)]">
                      <ChatParticipantesBar
                        participantes={participantesActivos}
                        usuarioActualId={profile?.id}
                        onMensajePrivado={(userId) => {
                          void handleMensajePrivado(userId);
                        }}
                        compact
                      />
                    </div>
                  )}
                </div>

                {activeConv.tipo === "partido" &&
                  participantesActivos.length > 0 && (
                    <div className="md:hidden mt-2.5 pt-2.5 border-t border-brand-white/5 -mx-1 px-1">
                      <ChatParticipantesBar
                        participantes={participantesActivos}
                        usuarioActualId={profile?.id}
                        onMensajePrivado={(userId) => {
                          void handleMensajePrivado(userId);
                        }}
                        compact
                        mobile
                      />
                    </div>
                  )}
              </div>

              {activeConv.tipo === "marketplace" && activeConv.producto && (
                <Link
                  href={`/marketplace/producto/${activeConv.producto.id}`}
                  className="shrink-0 mx-3 md:mx-4 lg:mx-6 mt-2 md:mt-3 flex items-center gap-2.5 md:gap-3 rounded-xl md:rounded-2xl border border-brand-white/10 bg-brand-card/80 p-2.5 md:p-3 hover:border-brand-chartreuse/40 transition-colors"
                >
                  <div className="relative size-11 md:size-14 rounded-lg md:rounded-xl overflow-hidden bg-brand-black/40 border border-brand-white/10 shrink-0">
                    {productoImagen ? (
                      <Image
                        src={productoImagen}
                        alt={activeConv.producto.nombre}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <ShoppingBag className="size-5 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-white truncate">
                      {activeConv.producto.nombre}
                    </p>
                    <p className="text-xs text-brand-chartreuse font-bold mt-0.5">
                      {formatPrecio(activeConv.producto.precio)}
                    </p>
                  </div>
                  <ExternalLink className="size-4 text-gray-500 shrink-0" />
                </Link>
              )}

              {activeConv.tipo === "partido" && activeConv.partido && (
                <Link
                  href={`/partidos/${activeConv.partido.id}`}
                  className="shrink-0 mx-3 md:mx-4 lg:mx-6 mt-2 md:mt-3 flex items-center gap-2.5 md:gap-3 rounded-xl md:rounded-2xl border border-brand-white/10 bg-brand-card/80 p-2.5 md:p-3 hover:border-brand-chartreuse/40 transition-colors"
                >
                  <div className="size-11 md:size-14 rounded-lg md:rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shrink-0">
                    <Calendar className="size-5 md:size-6 text-brand-chartreuse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-bold text-brand-white truncate">
                      {activeConv.partido.club_nombre || "Convocatoria"}
                    </p>
                    <p className="text-[11px] md:text-xs text-gray-400 mt-0.5 truncate">
                      {[
                        activeConv.partido.cancha_nombre,
                        formatPartidoFecha(activeConv.partido.fecha_reserva),
                        activeConv.partido.hora_inicio?.slice(0, 5),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-[10px] md:text-[11px] text-brand-chartreuse font-bold mt-0.5 md:mt-1">
                      {activeConv.partido.participantes.length} jugador
                      {activeConv.partido.participantes.length === 1
                        ? ""
                        : "es"}{" "}
                      · Ver convocatoria
                    </p>
                  </div>
                  <ExternalLink className="size-3.5 md:size-4 text-gray-500 shrink-0" />
                </Link>
              )}

              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 md:px-4 lg:px-6 py-3 md:py-4 space-y-3"
              >
                {loadingMensajes && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin size-5 border-2 border-brand-chartreuse border-t-transparent rounded-full" />
                  </div>
                )}

                {hayMas && !loadingMensajes && (
                  <button
                    onClick={() => {
                      if (mensajes[0] && activeConv) {
                        fetchMensajes(activeConv.id, mensajes[0].created_at);
                      }
                    }}
                    className="w-full py-2 text-xs text-gray-500 hover:text-brand-chartreuse transition-colors cursor-pointer"
                  >
                    Cargar mensajes anteriores
                  </button>
                )}

                {mensajes.map((msg) => {
                  const esMio = msg.remitente_id === profile?.id;
                  const esGrupo = activeConv.tipo === "partido";
                  return (
                    <ChatMessageBubble
                      key={msg.id}
                      mensaje={msg}
                      esMio={esMio}
                      participante={resolverParticipanteMensaje(msg.remitente_id)}
                      esGrupo={esGrupo}
                      onMensajePrivado={(userId) => {
                        void handleMensajePrivado(userId);
                      }}
                      formatTime={formatMessageTime}
                      showReadReceipt
                    />
                  );
                })}

                {typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-brand-card border border-brand-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="shrink-0 px-3 md:px-4 lg:px-6 py-3 md:py-4 border-t border-brand-white/5 bg-brand-card/30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex items-end gap-2 md:gap-3">
                  <textarea
                    ref={inputRef}
                    value={inputMsg}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    className="flex-1 min-w-0 resize-none bg-brand-card border border-brand-white/5 rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-sm text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors max-h-28 md:max-h-32"
                    style={{ minHeight: "42px" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputMsg.trim()}
                    className="shrink-0 size-10 md:size-11 rounded-xl bg-brand-chartreuse text-brand-black flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_10px_rgba(203,254,1,0.2)]"
                  >
                    <Send className="size-4 md:size-5" />
                  </button>
                </div>
                <p className="hidden md:block text-[10px] text-gray-600 mt-2 pl-1">
                  Enter para enviar · Shift+Enter para nueva línea
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 px-6">
              <div className="size-20 rounded-3xl bg-brand-card border border-brand-white/5 flex items-center justify-center mb-6">
                <MessageSquare className="size-8 text-brand-chartreuse/40" />
              </div>
              <h3 className="text-lg font-bold text-brand-white mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                Elige un chat de la lista para comenzar a enviar mensajes en
                tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
