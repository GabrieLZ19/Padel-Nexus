import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { ChatService } from "./chat.service";
import {
  extraerTokenSocket,
  usuarioIdVerificadoSocket,
  verificarUsuarioDesdeToken,
} from "../utils/socketAuth";

export class SocketService {
  private static io: Server | null = null;

  static init(server: HttpServer, allowedOrigins: string | string[]) {
    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
    });

    this.io.use(async (socket, next) => {
      const token = extraerTokenSocket(socket);
      if (!token) {
        return next(new Error("auth_required"));
      }
      const usuarioId = await verificarUsuarioDesdeToken(token);
      if (!usuarioId) {
        return next(new Error("auth_invalid"));
      }
      socket.data.usuarioId = usuarioId;
      next();
    });

    this.io.on("connection", (socket: Socket) => {
      const userId = usuarioIdVerificadoSocket(socket);
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      console.log(`Socket.io: cliente conectado ${socket.id} (usuario ${userId})`);
      socket.join(userId);

      // Re-join idempotente; el userId del cliente se ignora (PUB-25).
      socket.on("join_room", () => {
        const verifiedId = usuarioIdVerificadoSocket(socket);
        if (!verifiedId) return;
        socket.join(verifiedId);
        console.log(`Socket.io: usuario ${verifiedId} en sala de notificaciones`);
      });

      socket.on("join_conversation", async (conversacionId: string) => {
        const verifiedId = usuarioIdVerificadoSocket(socket);
        if (!verifiedId || !conversacionId) return;

        const sala = `chat:${conversacionId}`;
        socket.join(sala);
        console.log(`Socket.io: usuario ${verifiedId} en sala ${sala}`);
      });

      socket.on("leave_conversation", (conversacionId: string) => {
        const sala = `chat:${conversacionId}`;
        socket.leave(sala);
        console.log(`Socket.io: socket ${socket.id} salió de ${sala}`);
      });

      socket.on(
        "send_message",
        async (data: { conversacion_id: string; contenido: string }) => {
          const verifiedId = usuarioIdVerificadoSocket(socket);
          if (!verifiedId || !data.conversacion_id || !data.contenido?.trim()) {
            return;
          }

          try {
            const mensaje = await ChatService.enviarMensaje(
              data.conversacion_id,
              verifiedId,
              data.contenido,
            );

            const sala = `chat:${data.conversacion_id}`;

            this.emitirASala(sala, "new_message", mensaje);

            const destinatarios = await ChatService.obtenerDestinatarios(
              data.conversacion_id,
              verifiedId,
            );

            for (const destId of destinatarios) {
              const socketsEnSala = await this.obtenerSocketsEnSala(sala);
              const destSockets = await this.obtenerSocketsEnSala(destId);

              const destEstaEnSala = socketsEnSala.some((sid) =>
                destSockets.includes(sid),
              );

              if (!destEstaEnSala) {
                const tipo = await ChatService.obtenerTipoConversacion(
                  data.conversacion_id,
                );
                this.emitirAPersona(destId, "chat_notification", {
                  conversacion_id: data.conversacion_id,
                  tipo,
                  mensaje,
                });
              }
            }
          } catch (err) {
            console.error("Socket.io: error al enviar mensaje", err);
            socket.emit("chat_error", {
              error: "No se pudo enviar el mensaje.",
            });
          }
        },
      );

      socket.on("typing", (data: { conversacion_id: string }) => {
        const verifiedId = usuarioIdVerificadoSocket(socket);
        if (!verifiedId || !data.conversacion_id) return;

        const sala = `chat:${data.conversacion_id}`;
        socket.to(sala).emit("user_typing", {
          conversacion_id: data.conversacion_id,
          usuario_id: verifiedId,
        });
      });

      socket.on("stop_typing", (data: { conversacion_id: string }) => {
        const verifiedId = usuarioIdVerificadoSocket(socket);
        if (!verifiedId || !data.conversacion_id) return;

        const sala = `chat:${data.conversacion_id}`;
        socket.to(sala).emit("user_stop_typing", {
          conversacion_id: data.conversacion_id,
          usuario_id: verifiedId,
        });
      });

      socket.on("disconnect", () => {
        console.log(`Socket.io: cliente desconectado ${socket.id}`);
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

  static emitirAPersona(usuarioId: string, event: string, data: unknown) {
    if (this.io) {
      this.io.to(usuarioId).emit(event, data);
      console.log(`Socket.io: evento "${event}" a usuario ${usuarioId}`);
    }
  }

  static emitirATodos(event: string, data: unknown) {
    if (this.io) {
      this.io.emit(event, data);
      console.log(`Socket.io: evento "${event}" broadcast`);
    }
  }

  static emitirASala(sala: string, event: string, data: unknown) {
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