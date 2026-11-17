import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useProfileStore } from "@/store/useProfileStore";
import { obtenerTokenSocketCliente } from "@/utils/auth/sesionBff";

let socketInstance: Socket | null = null;

/**
 * Obtiene la instancia singleton del socket (sin crear un hook).
 * Usado por useChat para acceder a la misma conexión.
 */
export const getSocketInstance = (): Socket | null => socketInstance;

const socketBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:4000";

export const useSocket = (onNotificationReceived?: (notif: unknown) => void) => {
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

    let cancelled = false;

    const handleNuevaNotificacion = (notif: unknown) => {
      callbackRef.current?.(notif);
    };

    const handleChatNotificacion = (data: unknown) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat_notification", { detail: data }),
        );
      }
    };

    const handleTorneoActualizado = (data: unknown) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("torneo_actualizado", { detail: data }));
      }
    };

    const handlePartidoActualizado = (data: unknown) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("partido_actualizado", { detail: data }));
      }
    };

    const handleBracketActualizado = (data: unknown) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("bracket_actualizado", { detail: data }));
      }
    };

    const attachHandlers = (socket: Socket) => {
      socket.on("nueva_notificacion", handleNuevaNotificacion);
      socket.on("chat_notification", handleChatNotificacion);
      socket.on("torneo_actualizado", handleTorneoActualizado);
      socket.on("partido_actualizado", handlePartidoActualizado);
      socket.on("bracket_actualizado", handleBracketActualizado);
    };

    const detachHandlers = (socket: Socket) => {
      socket.off("nueva_notificacion", handleNuevaNotificacion);
      socket.off("chat_notification", handleChatNotificacion);
      socket.off("torneo_actualizado", handleTorneoActualizado);
      socket.off("partido_actualizado", handlePartidoActualizado);
      socket.off("bracket_actualizado", handleBracketActualizado);
    };

    void (async () => {
      const token = await obtenerTokenSocketCliente();
      if (cancelled || !token) {
        return;
      }

      if (!socketInstance) {
        socketInstance = io(socketBaseUrl(), {
          withCredentials: true,
          transports: ["websocket"],
          auth: { token },
        });

        socketInstance.on("connect", () => {
          socketInstance?.emit("join_room");
        });

        socketInstance.on("connect_error", () => {
          if (socketInstance) {
            socketInstance.disconnect();
            socketInstance = null;
          }
        });
      } else {
        socketInstance.auth = { token };
        if (socketInstance.connected) {
          socketInstance.emit("join_room");
        } else {
          socketInstance.connect();
        }
      }

      attachHandlers(socketInstance);
    })();

    return () => {
      cancelled = true;
      if (socketInstance) {
        detachHandlers(socketInstance);
      }
    };
  }, [profile?.id]);

  return socketInstance;
};