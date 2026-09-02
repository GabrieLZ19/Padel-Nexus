import { supabaseAdmin } from "../config/supabase";
import { SocketService } from "./socket.service";
import { ROLES_ADMINISTRATIVOS } from "../constants/roles";
import { PushNotificationService } from "./push-notification.service";

export class NotificacionService {
  static async crearNotificacion(params: {
    usuario_id: string;
    titulo: string;
    mensaje: string;
    tipo?: "info" | "success" | "warning" | "error";
    metadata?: Record<string, any>;
  }) {
    const { usuario_id, titulo, mensaje, tipo = "info", metadata = {} } = params;

    const { data: perfilPrefs } = await supabaseAdmin
      .from("perfiles")
      .select("preferencias_notificacion")
      .eq("id", usuario_id)
      .maybeSingle();

    const prefs = (perfilPrefs?.preferencias_notificacion || {}) as {
      push?: boolean;
      expo_push_token?: string;
    };

    // Si el jugador desactivó push/in-app, no creamos ni emitimos la notificación.
    if (prefs.push === false) {
      return null;
    }

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

    if (prefs.expo_push_token && prefs.push !== false) {
      void PushNotificationService.enviarExpoPush({
        expoPushToken: prefs.expo_push_token,
        titulo,
        mensaje,
        data: {
          notificacion_id: data.id,
          tipo,
          ...metadata,
        },
      });
    }

    return data;
  }

  static async notificarAdmins(params: {
    titulo: string;
    mensaje: string;
    tipo?: "info" | "success" | "warning" | "error";
    metadata?: Record<string, any>;
  }) {
    // 1. Obtener todos los usuarios con rol administrativo
    const { data: admins, error } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .in("rol", ROLES_ADMINISTRATIVOS);

    if (error || !admins) {
      console.error("🚨 Error al obtener admins para notificar:", error);
      return;
    }

    // 2. Crear una notificación para cada admin
    const promesas = admins.map((admin) =>
      this.crearNotificacion({
        usuario_id: admin.id,
        titulo: params.titulo,
        mensaje: params.mensaje,
        tipo: params.tipo,
        metadata: params.metadata,
      })
    );

    await Promise.allSettled(promesas);
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
