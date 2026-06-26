import { supabase } from "../config/supabase";
import {
  FAP_ESTADOS_LICENCIA,
  FAP_ESTADOS_PAGO,
  FAP_REGLAS,
} from "../constants/fap";

interface RegistroInscripcionDTO {
  torneoId: string;
  usuarioSolicitanteId: string;
  jugador1Id: string;
  jugador2Email?: string;
  jugador1Nombre?: string;
  jugador2Nombre?: string;
  monto: number;
  letraPrioridad?: string;
}

export class InscripcionService {
  static async obtenerInscripcionesPaginadas(
    torneoId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("inscripciones")
      .select(
        `*, perfiles!fk_inscripciones_usuario(nombre_completo), torneos!fk_inscripciones_torneo(nombre, categoria)`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (torneoId) {
      query = query.eq("torneo_id", torneoId);
    }

    const { data, error, count } = await query;
    if (error)
      throw new Error(
        "Error interno al obtener inscripciones en la base de datos.",
      );

    // Evitamos el 'any' tipando temporalmente la respuesta de Supabase
    type SupabaseInscripcion = Record<string, unknown> & {
      jugador1_nombre?: string;
      perfiles?: { nombre_completo?: string };
      torneos?: { nombre?: string };
    };

    const formattedData = ((data as SupabaseInscripcion[]) || []).map(
      (ins) => ({
        ...ins,
        jugador1_nombre:
          ins.jugador1_nombre?.trim() ||
          ins.perfiles?.nombre_completo ||
          "Usuario Desconocido",
        torneo_nombre: ins.torneos?.nombre || "Torneo no asignado",
      }),
    );

    return { data: formattedData, total: count };
  }

  static async registrarInscripcion(datos: RegistroInscripcionDTO) {
    const {
      torneoId,
      usuarioSolicitanteId,
      jugador1Id,
      jugador2Email,
      jugador1Nombre,
      jugador2Nombre,
      monto,
      letraPrioridad,
    } = datos;

    // 1. RESOLVER JUGADOR 2
    let jugador2Id = null;
    let perfilJugador2 = null;

    if (jugador2Email) {
      const { data: user2, error: user2Error } = await supabase
        .from("perfiles")
        .select("id, categoria_padel")
        .eq("email", jugador2Email)
        .single();

      if (user2Error || !user2) {
        throw new Error(
          "El email del compañero no está registrado en la plataforma.",
        );
      }
      jugador2Id = user2.id;
      perfilJugador2 = user2;
    }

    // 2. VALIDAR LICENCIA (Fase 2 de Padel Nexus)
    const { data: licencia, error: licError } = await supabase
      .from("licencias")
      .select("estado")
      .eq("usuario_id", jugador1Id)
      .single();

    if (
      licError ||
      !licencia ||
      licencia.estado !== FAP_ESTADOS_LICENCIA.ACTIVA
    ) {
      throw new Error(
        "Para inscribirte, debes tener una licencia FAP vigente y activa.",
      );
    }

    // 3. OBTENER DATOS DEL TORNEO
    const { data: torneo, error: errTorneo } = await supabase
      .from("torneos")
      .select("id, fecha, nivel, cupos_maximos, cupos_actuales, estado")
      .eq("id", torneoId)
      .single();

    if (errTorneo || !torneo) throw new Error("Torneo no encontrado.");

    // 4. REGLA FAP: CIERRE 7 DÍAS ANTES
    if (!torneo.fecha)
      throw new Error("El torneo no tiene una fecha definida.");
    const fechaTorneo = new Date(torneo.fecha);
    fechaTorneo.setHours(0, 0, 0, 0);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    if (
      Math.ceil(
        (fechaTorneo.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24),
      ) <= FAP_REGLAS.DIAS_CIERRE_INSCRIPCION
    ) {
      throw new Error(
        "Las inscripciones cerraron automáticamente (7 días antes del inicio).",
      );
    }

    // 5. REGLAS ARQUITECTURA NACIONAL
    const { data: solicitante } = await supabase
      .from("perfiles")
      .select("rol, categoria_padel")
      .eq("id", usuarioSolicitanteId)
      .single();

    if (!solicitante) throw new Error("Perfil de jugador no encontrado.");

    if (torneo.nivel?.toLowerCase() === "nacional") {
      if (
        solicitante.rol !== "admin_provincial" &&
        solicitante.rol !== "admin_federacion"
      ) {
        throw new Error(
          "Seguridad: Las inscripciones nacionales solo pueden ser gestionadas por un Administrador.",
        );
      }
      if (!letraPrioridad)
        throw new Error(
          "La letra de prioridad es obligatoria en torneos Nacionales.",
        );
    }

    // 6. VALIDACIÓN CATEGORÍAS (Jugador 1 y Jugador 2)
    // Nota: El torneo requiere un "nivel" o "categoria" (ej: '7ma'). Lo validamos contra perfil.categoria_padel
    if (solicitante.categoria_padel !== torneo.nivel) {
      throw new Error(
        `Tu categoría (${solicitante.categoria_padel}) no coincide con la requerida (${torneo.nivel}).`,
      );
    }

    if (perfilJugador2 && perfilJugador2.categoria_padel !== torneo.nivel) {
      throw new Error(
        `El Jugador 2 tiene categoría (${perfilJugador2.categoria_padel}) y no coincide con el torneo (${torneo.nivel}).`,
      );
    }

    // 7. BLOQUEO POR DUPLICIDAD
    const idsAValidar = jugador2Id
      ? `usuario_id.in.("${jugador1Id}","${jugador2Id}"),usuario2_id.in.("${jugador1Id}","${jugador2Id}")`
      : `usuario_id.eq."${jugador1Id}",usuario2_id.eq."${jugador1Id}"`;
    const { count: inscripcionesPrevias } = await supabase
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("torneo_id", torneoId)
      .or(idsAValidar);

    if (inscripcionesPrevias && inscripcionesPrevias > 0) {
      throw new Error(
        "Uno de los jugadores ya se encuentra inscripto en este torneo.",
      );
    }

    // 8. CUPOS
    if ((torneo.cupos_actuales || 0) >= (torneo.cupos_maximos || 32)) {
      throw new Error("El torneo ha alcanzado el límite máximo de cupos.");
    }

    // 9. INSERCIÓN
    const { data: inscripcionInsertada, error: errInsert } = await supabase
      .from("inscripciones")
      .insert([
        {
          torneo_id: torneoId,
          usuario_id: jugador1Id,
          usuario2_id: jugador2Id,
          jugador1_nombre: jugador1Nombre,
          jugador2_nombre: jugador2Nombre,
          monto,
          estado_pago: FAP_ESTADOS_PAGO.PENDIENTE,
          tipo: "Inscripción torneo",
          letra_prioridad: letraPrioridad || null,
        },
      ])
      .select()
      .single();

    if (errInsert)
      throw new Error(
        `Error al registrar la inscripción: ${errInsert.message}`,
      );

    // 10. ATOMICIDAD CUPOS
    await supabase
      .from("torneos")
      .update({ cupos_actuales: (torneo.cupos_actuales || 0) + 1 })
      .eq("id", torneoId);

    return inscripcionInsertada;
  }

  static async actualizarEstadoPago(id: string, estadoPago: string) {
    const { data, error } = await supabase
      .from("inscripciones")
      .update({ estado_pago: estadoPago })
      .eq("id", id)
      .select()
      .single();

    if (error || !data)
      throw new Error("Error al actualizar el estado de pago.");
    return data;
  }

  static async cancelarInscripcion(id: string) {
    // 1. Obtener ID del torneo
    const { data: inscripcion, error: fetchError } = await supabase
      .from("inscripciones")
      .select("torneo_id")
      .eq("id", id)
      .single();

    if (fetchError || !inscripcion)
      throw new Error("Inscripción no encontrada.");

    // 2. Borrar inscripción
    const { error: delError } = await supabase
      .from("inscripciones")
      .delete()
      .eq("id", id);

    if (delError) throw new Error("Error interno al eliminar la inscripción.");

    // 3. Liberar cupo
    const { data: torneo } = await supabase
      .from("torneos")
      .select("cupos_actuales")
      .eq("id", inscripcion.torneo_id)
      .single();

    if (torneo) {
      await supabase
        .from("torneos")
        .update({ cupos_actuales: Math.max(0, torneo.cupos_actuales - 1) })
        .eq("id", inscripcion.torneo_id);
    }
  }
}
