import { useEffect, useRef, useCallback } from "react";
import { getSocketInstance } from "./useSocket";
import type { ChatMensaje } from "@/utils/types";

/**
 * Hook de chat que encapsula la lógica de Socket.io para conversaciones.
 * Reutiliza la conexión singleton de useSocket.
 */
export const useChat = () => {
  const activeConvRef = useRef<string | null>(null);

  const joinConversation = useCallback((conversacionId: string) => {
    const socket = getSocketInstance();
    if (!socket) return;

    // Abandonar conversación previa si existe
    if (activeConvRef.current && activeConvRef.current !== conversacionId) {
      socket.emit("leave_conversation", activeConvRef.current);
    }

    socket.emit("join_conversation", conversacionId);
    activeConvRef.current = conversacionId;
  }, []);

  const leaveConversation = useCallback((conversacionId: string) => {
    const socket = getSocketInstance();
    if (!socket) return;

    socket.emit("leave_conversation", conversacionId);
    if (activeConvRef.current === conversacionId) {
      activeConvRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    (conversacionId: string, contenido: string) => {
      const socket = getSocketInstance();
      if (!socket || !contenido.trim()) return;

      socket.emit("send_message", {
        conversacion_id: conversacionId,
        contenido: contenido.trim(),
      });
    },
    [],
  );

  const onNewMessage = useCallback(
    (callback: (mensaje: ChatMensaje) => void) => {
      const socket = getSocketInstance();
      if (!socket) return () => {};

      socket.on("new_message", callback);
      return () => {
        socket.off("new_message", callback);
      };
    },
    [],
  );

  const emitTyping = useCallback((conversacionId: string) => {
    const socket = getSocketInstance();
    if (!socket) return;
    socket.emit("typing", { conversacion_id: conversacionId });
  }, []);

  const emitStopTyping = useCallback((conversacionId: string) => {
    const socket = getSocketInstance();
    if (!socket) return;
    socket.emit("stop_typing", { conversacion_id: conversacionId });
  }, []);

  const onUserTyping = useCallback(
    (
      callback: (data: {
        conversacion_id: string;
        usuario_id: string;
      }) => void,
    ) => {
      const socket = getSocketInstance();
      if (!socket) return () => {};

      socket.on("user_typing", callback);
      return () => {
        socket.off("user_typing", callback);
      };
    },
    [],
  );

  const onUserStopTyping = useCallback(
    (
      callback: (data: {
        conversacion_id: string;
        usuario_id: string;
      }) => void,
    ) => {
      const socket = getSocketInstance();
      if (!socket) return () => {};

      socket.on("user_stop_typing", callback);
      return () => {
        socket.off("user_stop_typing", callback);
      };
    },
    [],
  );

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (activeConvRef.current) {
        const socket = getSocketInstance();
        if (socket) {
          socket.emit("leave_conversation", activeConvRef.current);
        }
        activeConvRef.current = null;
      }
    };
  }, []);

  return {
    joinConversation,
    leaveConversation,
    sendMessage,
    onNewMessage,
    emitTyping,
    emitStopTyping,
    onUserTyping,
    onUserStopTyping,
  };
};
