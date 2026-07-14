import { supabaseAdmin } from "../config/supabase";
import { ROLES_ADMINISTRATIVOS } from "../constants/roles";

export class ChatService {
  /**
   * Lista las conversaciones del usuario con último mensaje, perfil del otro participante y no leídos.
   */
  static async obtenerConversaciones(usuarioId: string) {
    // 1. Obtener todas las conversaciones donde el usuario participa
    const { data: participaciones, error: partError } = await supabaseAdmin
      .from("chat_participantes")
      .select("conversacion_id")
      .eq("perfil_id", usuarioId);

    if (partError) throw new Error("Error al obtener conversaciones.");
    if (!participaciones || participaciones.length === 0) return [];

    const convIds = participaciones.map((p) => p.conversacion_id);

    // 2. Obtener datos de cada conversación
    const { data: conversaciones, error: convError } = await supabaseAdmin
      .from("chat_conversaciones")
      .select("id, creado_por, tipo, created_at")
      .in("id", convIds)
      .order("created_at", { ascending: false });

    if (convError) throw new Error("Error al obtener datos de conversaciones.");
    if (!conversaciones) return [];

    // 3. Para cada conversación, obtener el otro participante + último mensaje + no leídos
    const resultado = await Promise.all(
      conversaciones.map(async (conv) => {
        // Otro participante
        const { data: participantes } = await supabaseAdmin
          .from("chat_participantes")
          .select("perfil_id")
          .eq("conversacion_id", conv.id)
          .neq("perfil_id", usuarioId);

        const otroPerfilId = participantes?.[0]?.perfil_id;

        let otroParticipante = {
          id: "",
          nombre: null as string | null,
          apellido: null as string | null,
          avatar_url: null as string | null,
          rol: "usuario",
        };

        if (otroPerfilId) {
          const { data: perfil } = await supabaseAdmin
            .from("perfiles")
            .select("id, nombre, apellido, avatar_url, rol")
            .eq("id", otroPerfilId)
            .single();

          if (perfil) {
            otroParticipante = perfil;
          }
        }

        // Último mensaje
        const { data: ultimoMensaje } = await supabaseAdmin
          .from("chat_mensajes")
          .select("contenido, created_at, remitente_id")
          .eq("conversacion_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // No leídos (mensajes que no son míos y no están leídos)
        const { count: noLeidos } = await supabaseAdmin
          .from("chat_mensajes")
          .select("id", { count: "exact", head: true })
          .eq("conversacion_id", conv.id)
          .neq("remitente_id", usuarioId)
          .eq("leido", false);

        return {
          ...conv,
          otro_participante: otroParticipante,
          ultimo_mensaje: ultimoMensaje || null,
          no_leidos: noLeidos || 0,
        };
      }),
    );

    // Ordenar por último mensaje más reciente
    resultado.sort((a, b) => {
      const fechaA = a.ultimo_mensaje?.created_at || a.created_at;
      const fechaB = b.ultimo_mensaje?.created_at || b.created_at;
      return new Date(fechaB).getTime() - new Date(fechaA).getTime();
    });

    return resultado;
  }

  /**
   * Obtiene mensajes paginados de una conversación y marca como leídos los recibidos.
   */
  static async obtenerMensajes(
    conversacionId: string,
    usuarioId: string,
    cursor?: string,
  ) {
    // Verificar que el usuario es participante
    const { data: esParticipante } = await supabaseAdmin
      .from("chat_participantes")
      .select("perfil_id")
      .eq("conversacion_id", conversacionId)
      .eq("perfil_id", usuarioId)
      .single();

    if (!esParticipante) {
      throw new Error("No tiene acceso a esta conversación.");
    }

    // Consulta paginada por cursor (created_at)
    let query = supabaseAdmin
      .from("chat_mensajes")
      .select("id, conversacion_id, remitente_id, contenido, leido, created_at")
      .eq("conversacion_id", conversacionId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: mensajes, error } = await query;
    if (error) throw new Error("Error al obtener mensajes.");

    // Marcar como leídos los mensajes recibidos (no míos)
    await supabaseAdmin
      .from("chat_mensajes")
      .update({ leido: true })
      .eq("conversacion_id", conversacionId)
      .neq("remitente_id", usuarioId)
      .eq("leido", false);

    return {
      mensajes: (mensajes || []).reverse(), // Devolver en orden cronológico
      hay_mas: (mensajes || []).length === 50,
    };
  }

  /**
   * Inicia una conversación directa. Si ya existe una entre ambos, la reutiliza.
   */
  static async iniciarConversacion(
    creadorId: string,
    destinatarioId: string,
    tipo: "directo" | "soporte" = "directo",
  ) {
    // Verificar que el destinatario existe
    const { data: destinatario } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .eq("id", destinatarioId)
      .single();

    if (!destinatario) {
      throw new Error("El usuario destinatario no existe.");
    }

    // Buscar conversación existente del mismo tipo entre ambos
    const { data: convExistente } = await supabaseAdmin.rpc(
      "buscar_conversacion_existente",
      {
        usuario_a: creadorId,
        usuario_b: destinatarioId,
        tipo_conv: tipo,
      },
    );

    // Si existe, retornar la existente
    if (convExistente && convExistente.length > 0) {
      return { id: convExistente[0].conversacion_id, nueva: false };
    }

    // Crear nueva conversación
    const { data: nuevaConv, error: convError } = await supabaseAdmin
      .from("chat_conversaciones")
      .insert({ creado_por: creadorId, tipo })
      .select("id")
      .single();

    if (convError || !nuevaConv) {
      throw new Error("Error al crear la conversación.");
    }

    // Agregar ambos participantes
    const { error: partError } = await supabaseAdmin
      .from("chat_participantes")
      .insert([
        { conversacion_id: nuevaConv.id, perfil_id: creadorId },
        { conversacion_id: nuevaConv.id, perfil_id: destinatarioId },
      ]);

    if (partError) {
      throw new Error("Error al agregar participantes.");
    }

    return { id: nuevaConv.id, nueva: true };
  }

  /**
   * Inicia una conversación de soporte. Auto-asigna un admin disponible.
   * Si ya existe una abierta del usuario, la reutiliza.
   */
  static async iniciarConversacionSoporte(usuarioId: string) {
    // Buscar si ya tiene una conversación de soporte abierta
    const { data: convsSoporte } = await supabaseAdmin
      .from("chat_participantes")
      .select("conversacion_id")
      .eq("perfil_id", usuarioId);

    if (convsSoporte && convsSoporte.length > 0) {
      const convIds = convsSoporte.map((c) => c.conversacion_id);

      const { data: soporteExistente } = await supabaseAdmin
        .from("chat_conversaciones")
        .select("id")
        .in("id", convIds)
        .eq("tipo", "soporte")
        .limit(1)
        .single();

      if (soporteExistente) {
        return { id: soporteExistente.id, nueva: false };
      }
    }

    // Buscar un admin/superadmin disponible
    const { data: admins } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .in("rol", ROLES_ADMINISTRATIVOS)
      .limit(1);

    if (!admins || admins.length === 0) {
      throw new Error("No hay administradores disponibles en este momento.");
    }

    const adminId = admins[0].id;

    return this.iniciarConversacion(usuarioId, adminId, "soporte");
  }

  /**
   * Persiste un mensaje en la base de datos.
   */
  static async enviarMensaje(
    conversacionId: string,
    remitenteId: string,
    contenido: string,
  ) {
    // Verificar participación
    const { data: esParticipante } = await supabaseAdmin
      .from("chat_participantes")
      .select("perfil_id")
      .eq("conversacion_id", conversacionId)
      .eq("perfil_id", remitenteId)
      .single();

    if (!esParticipante) {
      throw new Error("No tiene acceso a esta conversación.");
    }

    const { data: mensaje, error } = await supabaseAdmin
      .from("chat_mensajes")
      .insert({
        conversacion_id: conversacionId,
        remitente_id: remitenteId,
        contenido: contenido.trim(),
      })
      .select("id, conversacion_id, remitente_id, contenido, leido, created_at")
      .single();

    if (error || !mensaje) {
      throw new Error("Error al enviar el mensaje.");
    }

    return mensaje;
  }

  /**
   * Cuenta el total de mensajes no leídos del usuario en todas sus conversaciones.
   */
  static async contarNoLeidos(usuarioId: string) {
    // Obtener las conversaciones del usuario
    const { data: participaciones } = await supabaseAdmin
      .from("chat_participantes")
      .select("conversacion_id")
      .eq("perfil_id", usuarioId);

    if (!participaciones || participaciones.length === 0) return 0;

    const convIds = participaciones.map((p) => p.conversacion_id);

    const { count } = await supabaseAdmin
      .from("chat_mensajes")
      .select("id", { count: "exact", head: true })
      .in("conversacion_id", convIds)
      .neq("remitente_id", usuarioId)
      .eq("leido", false);

    return count || 0;
  }

  /**
   * Obtiene los IDs de los otros participantes de una conversación (excluyendo al remitente).
   */
  static async obtenerDestinatarios(
    conversacionId: string,
    remitenteId: string,
  ) {
    const { data } = await supabaseAdmin
      .from("chat_participantes")
      .select("perfil_id")
      .eq("conversacion_id", conversacionId)
      .neq("perfil_id", remitenteId);

    return (data || []).map((p) => p.perfil_id);
  }
}
