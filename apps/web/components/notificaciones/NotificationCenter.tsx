"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Trash2,
  Check,
  CheckCheck,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { sileo } from "sileo";
import { NotificacionesService } from "@/utils/services";
import { Notificacion } from "@/utils/types";
import { useSocket } from "@/hooks/useSocket";
import { useProfileStore } from "@/store/useProfileStore";

export default function NotificationCenter() {
  const { profile } = useProfileStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notificacion[]>([]);

  // Cargar notificaciones históricas al montar
  useEffect(() => {
    if (!profile) return;
    const fetchNotifications = async () => {
      try {
        const data = await NotificacionesService.getAll();
        setNotifications(data);
      } catch (err) {
        console.error("Error al obtener notificaciones:", err);
      }
    };
    fetchNotifications();
  }, [profile]);

  // Suscribirse al WebSocket y disparar sileo toast en tiempo real
  useSocket((newNotif: Notificacion) => {
    setNotifications((prev) => [newNotif, ...prev]);

    // Disparar el toast Sileo según el tipo
    const payload = {
      title: newNotif.titulo,
      description: newNotif.mensaje,
    };

    switch (newNotif.tipo) {
      case "success":
        sileo.success(payload);
        break;
      case "error":
        sileo.error(payload);
        break;
      case "warning":
        sileo.warning(payload);
        break;
      default:
        sileo.info(payload);
        break;
    }
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificacionesService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leido: true } : n)),
      );
    } catch (err) {
      console.error("Error al marcar como leída:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificacionesService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, leido: true })));
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await NotificacionesService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error al eliminar notificación:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.leido).length;

  const getTypeStyles = (tipo: string) => {
    switch (tipo) {
      case "success":
        return {
          icon: <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />,
          bg: "bg-emerald-500/5",
          badge: "bg-emerald-500/20 text-emerald-300",
          accent: "bg-emerald-400",
        };
      case "error":
        return {
          icon: <XCircle className="size-4 text-rose-400 shrink-0" />,
          bg: "bg-rose-500/5",
          badge: "bg-rose-500/20 text-rose-300",
          accent: "bg-rose-400",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="size-4 text-amber-400 shrink-0" />,
          bg: "bg-amber-500/5",
          badge: "bg-amber-500/20 text-amber-300",
          accent: "bg-amber-400",
        };
      default:
        return {
          icon: <Info className="size-4 text-sky-400 shrink-0" />,
          bg: "bg-sky-500/5",
          badge: "bg-sky-500/20 text-sky-300",
          accent: "bg-sky-400",
        };
    }
  };

  if (!profile) return null;

  return (
    <div className="relative">
      {/* Trigger — Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 relative cursor-pointer ${
          isOpen
            ? "border-brand-chartreuse/40 bg-brand-chartreuse/10 text-brand-chartreuse"
            : "border-brand-white/10 text-gray-400 hover:text-brand-white hover:bg-brand-white/5"
        }`}
      >
        <Bell
          className={`size-5 transition-all duration-300 ${
            unreadCount > 0 && !isOpen
              ? "animate-[wiggle_1.2s_ease-in-out_infinite]"
              : ""
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-chartreuse text-[10px] font-bold text-brand-black shadow-[0_0_8px_rgba(163,230,53,0.7)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel flotante */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-3 w-80 md:w-96 bg-brand-black/96 backdrop-blur-md border border-brand-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-white/5">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-brand-chartreuse" />
                <h3 className="text-sm font-bold text-brand-white">
                  Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse text-[10px] font-bold border border-brand-chartreuse/20 shadow-[0_0_6px_rgba(163,230,53,0.3)]">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-brand-chartreuse hover:text-brand-chartreuse/80 flex items-center gap-1 cursor-pointer bg-transparent border-0 transition-colors"
                  >
                    <CheckCheck className="size-3.5" />
                    Marcar leídas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-brand-white bg-transparent border-0 cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Lista de notificaciones */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-brand-white/4 scrollbar-thin scrollbar-thumb-brand-white/10 scrollbar-track-transparent">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-white/5 flex items-center justify-center">
                    <Bell className="size-5 text-gray-600 stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Todo al día
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      No tenés notificaciones pendientes.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const styles = getTypeStyles(notif.tipo);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.leido && handleMarkAsRead(notif.id)}
                      className={`relative flex gap-3 px-4 py-3.5 transition-all duration-150 group cursor-pointer ${
                        notif.leido
                          ? "opacity-60 hover:opacity-80 hover:bg-brand-white/2"
                          : `${styles.bg} hover:brightness-110`
                      }`}
                    >
                      {/* Indicador de no leído */}
                      {!notif.leido && (
                        <div
                          className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r ${styles.accent}`}
                        />
                      )}

                      {/* Icono */}
                      <div className="mt-0.5">{styles.icon}</div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <span className="text-[13px] font-semibold text-brand-white leading-snug">
                            {notif.titulo}
                          </span>
                          <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">
                            {new Date(notif.created_at).toLocaleTimeString(
                              "es-AR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-400 leading-relaxed">
                          {notif.mensaje}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${styles.badge}`}
                          >
                            {notif.tipo}
                          </span>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {!notif.leido && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notif.id);
                                }}
                                title="Marcar como leída"
                                className="p-1 rounded-md bg-brand-white/5 hover:bg-brand-chartreuse/20 text-brand-chartreuse transition-colors cursor-pointer border-0"
                              >
                                <Check className="size-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(notif.id, e)}
                              title="Eliminar"
                              className="p-1 rounded-md bg-brand-white/5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer border-0"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-brand-white/5 text-center">
                <p className="text-[10px] text-gray-600">
                  {notifications.length} notificación
                  {notifications.length !== 1 ? "es" : ""} en total
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
