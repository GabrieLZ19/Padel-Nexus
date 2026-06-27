import { supabaseAdmin } from "../config/supabase";
import { SocketService } from "./socket.service";

export class NotificacionService {
  static async crearNotificacion(params: {
    usuario_id: string;
    titulo: string;
    mensaje: string;
    tipo?: "info" | "success" | "warning" | "error";
    metadata?: Record<string, any>;
  }) {
    const { usuario_id, titulo, mensaje, tipo = "info", metadata = {} } = params;

    const { data, error } = await supabaseAdmin
      .from("notificaciones")
      .insert([
        {
          usuario_id,
          titulo,
          mensaje,
          tipo,
          leido: false,
          metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("🚨 Error al guardar notificación en DB:", error);
      return null;
    }

    // Emitir en tiempo real a la sala del usuario
    try {
      SocketService.emitirAPersona(usuario_id, "nueva_notificacion", data);
    } catch (socketErr) {
      console.warn("⚠️ No se pudo emitir notificación por websocket:", socketErr);
    }

    return data;
  }

  static async obtenerNotificaciones(usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("notificaciones")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("🚨 Error al obtener notificaciones de la DB:", error);
      throw new Error("Error al obtener notificaciones.");
    }
    return data || [];
  }

  static async marcarComoLeida(id: string, usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("notificaciones")
      .update({ leido: true })
      .eq("id", id)
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error) {
      console.error("🚨 Error al marcar notificación como leída:", error);
      throw new Error("Error al marcar como leída la notificación.");
    }
    return data;
  }

  static async marcarTodasLeidas(usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("notificaciones")
      .update({ leido: true })
      .eq("usuario_id", usuarioId)
      .select();

    if (error) {
      console.error("🚨 Error al marcar todas las notificaciones como leídas:", error);
      throw new Error("Error al marcar todas las notificaciones como leídas.");
    }
    return data || [];
  }

  static async eliminar(id: string, usuarioId: string) {
    const { error } = await supabaseAdmin
      .from("notificaciones")
      .delete()
      .eq("id", id)
      .eq("usuario_id", usuarioId);

    if (error) {
      console.error("🚨 Error al eliminar notificación de la DB:", error);
      throw new Error("Error al eliminar la notificación.");
    }
    return true;
  }
}
