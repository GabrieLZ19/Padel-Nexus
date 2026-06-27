import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useProfileStore } from "@/store/useProfileStore";

let socketInstance: Socket | null = null;

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

    socketInstance.on("nueva_notificacion", handleNuevaNotificacion);

    return () => {
      if (socketInstance) {
        socketInstance.off("nueva_notificacion", handleNuevaNotificacion);
      }
    };
  }, [profile?.id]);

  return socketInstance;
};
