import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useProfileStore } from "@/store/useProfileStore";

let socketInstance: Socket | null = null;

/**
 * Obtiene la instancia singleton del socket (sin crear un hook).
 * Usado por useChat para acceder a la misma conexión.
 */
export const getSocketInstance = (): Socket | null => socketInstance;

export const useSocket = (onNotificationReceived?: (notif: any) => void) => {
  const { profile } = useProfileStore();
  const callbackRef = useRef(onNotificationReceived);

  useEffect(() => {
    callbackRef.current = onNotificationReceived;
  }, [onNotificationReceived]);

  useEffect(() => {
    if (!profile?.id) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "http://localhost:4000";

    if (!socketInstance) {
      socketInstance = io(socketUrl, {
        withCredentials: true,
        transports: ["websocket"],
      });

      socketInstance.on("connect", () => {
        console.log("🔌 Conectado al servidor WebSocket");
        if (profile?.id) {
          socketInstance?.emit("join_room", profile.id);
        }
      });

      socketInstance.on("disconnect", () => {
        console.log("🔌 Desconectado de WebSocket");
      });
    } else {
      if (socketInstance.connected) {
        socketInstance.emit("join_room", profile.id);
      }
    }

    const handleNuevaNotificacion = (notif: any) => {
      console.log("📬 Nueva notificación recibida por socket:", notif);
      if (callbackRef.current) {
        callbackRef.current(notif);
      }
    };

    const handleChatNotificacion = (data: any) => {
      console.log("💬 Notificación de chat recibida:", data);
      // Disparar un evento custom para que otros componentes puedan escucharlo
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat_notification", { detail: data }),
        );
      }
    };

    const handleTorneoActualizado = (data: any) => {
      console.log("🏆 Notificación de torneo en curso recibida por WebSocket:", data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("torneo_actualizado", { detail: data }));
      }
    };

    const handlePartidoActualizado = (data: any) => {
      console.log("⚡ Notificación de marcador actualizado por WebSocket:", data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("partido_actualizado", { detail: data }));
      }
    };

    const handleBracketActualizado = (data: any) => {
      console.log("🔀 Notificación de avance de cuadro por WebSocket:", data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("bracket_actualizado", { detail: data }));
      }
    };

    socketInstance.on("nueva_notificacion", handleNuevaNotificacion);
    socketInstance.on("chat_notification", handleChatNotificacion);
    socketInstance.on("torneo_actualizado", handleTorneoActualizado);
    socketInstance.on("partido_actualizado", handlePartidoActualizado);
    socketInstance.on("bracket_actualizado", handleBracketActualizado);

    return () => {
      if (socketInstance) {
        socketInstance.off("nueva_notificacion", handleNuevaNotificacion);
        socketInstance.off("chat_notification", handleChatNotificacion);
        socketInstance.off("torneo_actualizado", handleTorneoActualizado);
        socketInstance.off("partido_actualizado", handlePartidoActualizado);
        socketInstance.off("bracket_actualizado", handleBracketActualizado);
      }
    };
  }, [profile?.id]);

  return socketInstance;
};
