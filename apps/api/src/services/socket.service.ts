import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { ChatService } from "./chat.service";

// Mapa de socketId → userId para evitar suplantación
const socketUserMap = new Map<string, string>();

export class SocketService {
  private static io: Server | null = null;

  static init(server: HttpServer, frontendUrl: string) {
    this.io = new Server(server, {
      cors: {
        origin: frontendUrl,
        credentials: true,
      },
    });

    this.io.on("connection", (socket: Socket) => {
      console.log(`🔌 Cliente conectado a Socket.io: ${socket.id}`);

      // El cliente se une a una sala específica de su usuario_id para notificaciones personales
      socket.on("join_room", (usuarioId: string) => {
        if (usuarioId) {
          socket.join(usuarioId);
          socketUserMap.set(socket.id, usuarioId);
          console.log(`👤 Usuario ${usuarioId} se unió a su sala de notificaciones`);
        }
      });

      // ── Chat: Unirse a sala de conversación ──────────────────────────
      socket.on("join_conversation", async (conversacionId: string) => {
        const userId = socketUserMap.get(socket.id);
        if (!userId || !conversacionId) return;

        const sala = `chat:${conversacionId}`;
        socket.join(sala);
        console.log(`💬 Usuario ${userId} se unió a la sala ${sala}`);
      });

      // ── Chat: Abandonar sala de conversación ────────────────────────
      socket.on("leave_conversation", (conversacionId: string) => {
        const sala = `chat:${conversacionId}`;
        socket.leave(sala);
        console.log(`💬 Socket ${socket.id} abandonó la sala ${sala}`);
      });

      // ── Chat: Enviar mensaje ────────────────────────────────────────
      socket.on(
        "send_message",
        async (data: { conversacion_id: string; contenido: string }) => {
          const userId = socketUserMap.get(socket.id);
          if (!userId || !data.conversacion_id || !data.contenido?.trim()) return;

          try {
            // 1. Persistir el mensaje
            const mensaje = await ChatService.enviarMensaje(
              data.conversacion_id,
              userId,
              data.contenido,
            );

            const sala = `chat:${data.conversacion_id}`;

            // 2. Emitir a la sala de la conversación
            this.emitirASala(sala, "new_message", mensaje);

            // 3. Notificar al destinatario si no está en la sala activa
            const destinatarios = await ChatService.obtenerDestinatarios(
              data.conversacion_id,
              userId,
            );

            for (const destId of destinatarios) {
              const socketsEnSala = await this.obtenerSocketsEnSala(sala);
              const destSockets = await this.obtenerSocketsEnSala(destId);

              // Si el destinatario NO tiene sockets en la sala del chat
              const destEstaEnSala = socketsEnSala.some((sid) =>
                destSockets.includes(sid),
              );

              if (!destEstaEnSala) {
                this.emitirAPersona(destId, "chat_notification", {
                  conversacion_id: data.conversacion_id,
                  mensaje,
                });
              }
            }
          } catch (err) {
            console.error("🚨 Error al enviar mensaje por socket:", err);
            socket.emit("chat_error", {
              error: "No se pudo enviar el mensaje.",
            });
          }
        },
      );

      // ── Chat: Typing indicators ─────────────────────────────────────
      socket.on("typing", (data: { conversacion_id: string }) => {
        const userId = socketUserMap.get(socket.id);
        if (!userId || !data.conversacion_id) return;

        const sala = `chat:${data.conversacion_id}`;
        socket.to(sala).emit("user_typing", {
          conversacion_id: data.conversacion_id,
          usuario_id: userId,
        });
      });

      socket.on("stop_typing", (data: { conversacion_id: string }) => {
        const userId = socketUserMap.get(socket.id);
        if (!userId || !data.conversacion_id) return;

        const sala = `chat:${data.conversacion_id}`;
        socket.to(sala).emit("user_stop_typing", {
          conversacion_id: data.conversacion_id,
          usuario_id: userId,
        });
      });

      socket.on("disconnect", () => {
        socketUserMap.delete(socket.id);
        console.log(`🔌 Cliente desconectado de Socket.io: ${socket.id}`);
      });
    });

    return this.io;
  }

  static getIO(): Server {
    if (!this.io) {
      throw new Error("Socket.io no ha sido inicializado.");
    }
    return this.io;
  }

  static emitirAPersona(usuarioId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(usuarioId).emit(event, data);
      console.log(`📡 Emitido evento "${event}" a la sala del usuario: ${usuarioId}`);
    }
  }

  static emitirATodos(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
      console.log(`📡 Emitido evento "${event}" a todos los usuarios`);
    }
  }

  static emitirASala(sala: string, event: string, data: any) {
    if (this.io) {
      this.io.to(sala).emit(event, data);
    }
  }

  static async obtenerSocketsEnSala(sala: string): Promise<string[]> {
    if (!this.io) return [];
    const sockets = await this.io.in(sala).fetchSockets();
    return sockets.map((s) => s.id);
  }
}
