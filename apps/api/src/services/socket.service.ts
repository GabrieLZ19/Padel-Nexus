import { Server } from "socket.io";
import { Server as HttpServer } from "http";

export class SocketService {
  private static io: Server | null = null;

  static init(server: HttpServer, frontendUrl: string) {
    this.io = new Server(server, {
      cors: {
        origin: frontendUrl,
        credentials: true,
      },
    });

    this.io.on("connection", (socket) => {
      console.log(`🔌 Cliente conectado a Socket.io: ${socket.id}`);

      // El cliente se une a una sala específica de su usuario_id para notificaciones personales
      socket.on("join_room", (usuarioId: string) => {
        if (usuarioId) {
          socket.join(usuarioId);
          console.log(`👤 Usuario ${usuarioId} se unió a su sala de notificaciones`);
        }
      });

      socket.on("disconnect", () => {
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
}
