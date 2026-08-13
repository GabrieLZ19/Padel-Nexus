import { supabaseAdmin } from "../config/supabase";
import {
  FAP_ESTADOS_LICENCIA,
  FAP_ESTADOS_PAGO,
} from "../constants/fap";
import { NotificacionService } from "./notificacion.service";
import {
  assertCategoria,
  assertEdad,
  assertInscripcionAbierta,
  assertRama,
  torneoExigeCarnet,
  type PerfilElegibilidad,
} from "../utils/inscripcionElegibilidad";

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

function formatNombreCompleto(
  apellido?: string | null,
  nombre?: string | null,
): string {
  const ap = (apellido || "").trim();
  const nom = (nombre || "").trim();
  if (ap && nom) {
    return `${ap.toUpperCase()}, ${nom}`;
  }
  if (ap) {
    return ap.toUpperCase();
  }
  if (nom) {
    return nom;
  }
  return "Desconocido";
}

export class InscripcionService {
  /** Licencia FAP en estado Activa (al menos una). */
  private static async assertLicenciaFapActiva(
    usuarioId: string,
    etiqueta: string,
  ): Promise<void> {
    const { data: licencias, error: licError } = await supabaseAdmin
      .from("licencias")
      .select("id, estado")
      .eq("usuario_id", usuarioId)
      .eq("estado", FAP_ESTADOS_LICENCIA.ACTIVA)
      .limit(1);

    if (licError || !licencias || licencias.length === 0) {
      throw new Error(
        `${etiqueta}: se requiere licencia FAP vigente y activa para este torneo.`,
      );
    }
  }

  static async obtenerInscripcionesPaginadas(
    torneoId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("inscripciones")
      .select(
        `*, perfiles!fk_inscripciones_usuario(nombre, apellido), torneos!fk_inscripciones_torneo(nombre, categoria)`,
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

    type SupabaseInscripcion = Record<string, unknown> & {
      jugador1_nombre?: string;
      perfiles?: { nombre?: string; apellido?: string };
      torneos?: { nombre?: string };
    };

    const formattedData = ((data as SupabaseInscripcion[]) || []).map(
      (ins) => ({
        ...ins,
        jugador1_nombre:
          ins.jugador1_nombre?.trim() ||
          formatNombreCompleto(ins.perfiles?.apellido, ins.perfiles?.nombre) ||
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

    // 1. RESOLVER JUGADOR 2 (perfil completo para elegibilidad)
    let jugador2Id: string | null = null;
    let perfilJugador2: PerfilElegibilidad | null = null;

    if (jugador2Email) {
      const { data: user2, error: user2Error } = await supabaseAdmin
        .from("perfiles")
        .select("id, categoria_padel, fecha_nacimiento, sexo, nombre")
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

    // 2. DATOS DEL TORNEO (restricciones en una sola query)
    const { data: torneo, error: errTorneo } = await supabaseAdmin
      .from("torneos")
      .select(
        "id, fecha, fecha_cierre_inscripcion, nivel, categoria, rama, validar_edad, cupos_maximos, cupos_actuales, estado, reglas_arbitraje",
      )
      .eq("id", torneoId)
      .single();

    if (errTorneo || !torneo) throw new Error("Torneo no encontrado.");

    // 3. INSCRIPCIÓN ABIERTA
    assertInscripcionAbierta(torneo);

    // 4. PERFILES
    const { data: perfilJ1, error: errJ1 } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, categoria_padel, nombre, fecha_nacimiento, sexo")
      .eq("id", jugador1Id)
      .single();

    if (errJ1 || !perfilJ1) {
      throw new Error("Perfil del Jugador 1 no encontrado.");
    }

    const { data: solicitante } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, categoria_padel, nombre, fecha_nacimiento, sexo")
      .eq("id", usuarioSolicitanteId)
      .single();

    if (!solicitante) throw new Error("Perfil de jugador no encontrado.");

    // 5. CARNET FAP — solo si el torneo lo exige
    if (torneoExigeCarnet(torneo)) {
      await InscripcionService.assertLicenciaFapActiva(jugador1Id, "Jugador 1");
      if (jugador2Id) {
        await InscripcionService.assertLicenciaFapActiva(
          jugador2Id,
          "Jugador 2",
        );
      }
    }

    // 6. CATEGORÍA / RAMA / EDAD — J1 y J2
    assertCategoria(perfilJ1, torneo.nivel, "Jugador 1");
    assertRama(perfilJ1, torneo.rama, "Jugador 1");
    assertEdad(perfilJ1, torneo, "Jugador 1");

    if (perfilJugador2) {
      assertCategoria(perfilJugador2, torneo.nivel, "Jugador 2");
      assertRama(perfilJugador2, torneo.rama, "Jugador 2");
      assertEdad(perfilJugador2, torneo, "Jugador 2");
    }

    // 7. REGLA NACIONAL (legacy sobre nivel)
    if (torneo.nivel?.toLowerCase() === "nacional") {
      if (
        solicitante.rol !== "admin_provincial" &&
        solicitante.rol !== "admin_federacion"
      ) {
        throw new Error(
          "Seguridad: Las inscripciones nacionales solo pueden ser gestionadas por un Administrador.",
        );
      }
      if (!letraPrioridad) {
        throw new Error(
          "La letra de prioridad es obligatoria en torneos Nacionales.",
        );
      }
    }

    // 8. DUPLICADOS
    const idsAValidar = jugador2Id
      ? `usuario_id.in.("${jugador1Id}","${jugador2Id}"),usuario2_id.in.("${jugador1Id}","${jugador2Id}")`
      : `usuario_id.eq."${jugador1Id}",usuario2_id.eq."${jugador1Id}"`;
    const { count: inscripcionesPrevias } = await supabaseAdmin
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("torneo_id", torneoId)
      .or(idsAValidar);

    if (inscripcionesPrevias && inscripcionesPrevias > 0) {
      throw new Error(
        "Uno de los jugadores ya se encuentra inscripto en este torneo.",
      );
    }

    // 9. CUPOS
    if ((torneo.cupos_actuales || 0) >= (torneo.cupos_maximos || 32)) {
      throw new Error("El torneo ha alcanzado el límite máximo de cupos.");
    }

    // 10. INSERCIÓN
    const { data: inscripcionInsertada, error: errInsert } = await supabaseAdmin
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

    if (errInsert) {
      throw new Error(
        `Error al registrar la inscripción: ${errInsert.message}`,
      );
    }

    // 11. CUPOS
    await supabaseAdmin
      .from("torneos")
      .update({ cupos_actuales: (torneo.cupos_actuales || 0) + 1 })
      .eq("id", torneoId);

    // 12. NOTIFICAR ADMINS
    const isPareja =
      Boolean(jugador2Nombre) &&
      jugador2Nombre!.trim() !== "" &&
      jugador2Nombre !== "-";
    const jugadoresTexto = isPareja
      ? `${jugador1Nombre || solicitante.nombre} y ${jugador2Nombre}`
      : `${jugador1Nombre || solicitante.nombre}`;
    const verbo = isPareja ? "se han inscripto" : "se ha inscripto";

    NotificacionService.notificarAdmins({
      titulo: "Nueva Inscripción",
      mensaje: `${jugadoresTexto} ${verbo} en el torneo.`,
      tipo: "info",
    }).catch((err) =>
      console.error("Error al notificar admins de nueva inscripcion:", err),
    );

    return inscripcionInsertada;
  }

  static async actualizarEstadoPago(id: string, estadoPago: string) {
    const { data, error } = await supabaseAdmin
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
    const { data: inscripcion, error: fetchError } = await supabaseAdmin
      .from("inscripciones")
      .select("torneo_id")
      .eq("id", id)
      .single();

    if (fetchError || !inscripcion)
      throw new Error("Inscripción no encontrada.");

    const { error: delError } = await supabaseAdmin
      .from("inscripciones")
      .delete()
      .eq("id", id);

    if (delError) throw new Error("Error interno al eliminar la inscripción.");

    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("cupos_actuales")
      .eq("id", inscripcion.torneo_id)
      .single();

    if (torneo) {
      await supabaseAdmin
        .from("torneos")
        .update({ cupos_actuales: Math.max(0, torneo.cupos_actuales - 1) })
        .eq("id", inscripcion.torneo_id);
    }
  }

  /**
   * Inscripción manual admin.
   * A.1: mantiene skips de categoría/edad/rama/cierre (solo carnet + cupos + duplicados).
   * TODO A.2: aplicar mismas reglas por defecto + override con motivo auditable.
   */
  static async registrarInscripcionManual(datos: {
    torneoId: string;
    jugador1Identificador: string;
    jugador2Identificador?: string;
    monto: number;
    metodoPago?: string;
    adminId: string;
  }) {
    const {
      torneoId,
      jugador1Identificador,
      jugador2Identificador,
      monto,
      metodoPago,
      adminId,
    } = datos;

    const { data: j1, error: j1Error } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido")
      .or(
        `dni.eq."${jugador1Identificador}",email.eq."${jugador1Identificador}"`,
      )
      .maybeSingle();

    if (j1Error || !j1) {
      throw new Error(
        `El jugador 1 (${jugador1Identificador}) no está registrado en la plataforma.`,
      );
    }

    let j2: { id: string; nombre: string | null; apellido: string | null } | null =
      null;
    if (
      jugador2Identificador &&
      jugador2Identificador.trim() !== "" &&
      jugador2Identificador !== "-"
    ) {
      const { data: resolvedJ2, error: j2Error } = await supabaseAdmin
        .from("perfiles")
        .select("id, nombre, apellido")
        .or(
          `dni.eq."${jugador2Identificador}",email.eq."${jugador2Identificador}"`,
        )
        .maybeSingle();

      if (j2Error || !resolvedJ2) {
        throw new Error(
          `El jugador 2 (${jugador2Identificador}) no está registrado en la plataforma.`,
        );
      }
      j2 = resolvedJ2;
    }

    const { data: torneo, error: errTorneo } = await supabaseAdmin
      .from("torneos")
      .select("id, cupos_maximos, cupos_actuales, estado, reglas_arbitraje")
      .eq("id", torneoId)
      .single();

    if (errTorneo || !torneo) throw new Error("Torneo no encontrado.");

    if (torneoExigeCarnet(torneo)) {
      await InscripcionService.assertLicenciaFapActiva(j1.id, "Jugador 1");
      if (j2) {
        await InscripcionService.assertLicenciaFapActiva(j2.id, "Jugador 2");
      }
    }

    const idsAValidar = j2
      ? `usuario_id.in.("${j1.id}","${j2.id}"),usuario2_id.in.("${j1.id}","${j2.id}")`
      : `usuario_id.eq."${j1.id}",usuario2_id.eq."${j1.id}"`;
    const { count: inscripcionesPrevias } = await supabaseAdmin
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("torneo_id", torneoId)
      .or(idsAValidar);

    if (inscripcionesPrevias && inscripcionesPrevias > 0) {
      throw new Error(
        "Uno de los jugadores ya se encuentra inscripto en este torneo.",
      );
    }

    if ((torneo.cupos_actuales || 0) >= (torneo.cupos_maximos || 32)) {
      throw new Error("El torneo ha alcanzado el límite máximo de cupos.");
    }

    const estadoPago = metodoPago
      ? FAP_ESTADOS_PAGO.CONFIRMADO
      : FAP_ESTADOS_PAGO.PENDIENTE;
    const j1Nombre = formatNombreCompleto(j1.apellido, j1.nombre);
    const j2Nombre = j2 ? formatNombreCompleto(j2.apellido, j2.nombre) : "-";

    const { data: inscripcionInsertada, error: errInsert } = await supabaseAdmin
      .from("inscripciones")
      .insert([
        {
          torneo_id: torneoId,
          usuario_id: j1.id,
          usuario2_id: j2 ? j2.id : null,
          jugador1_nombre: j1Nombre,
          jugador2_nombre: j2Nombre,
          monto,
          estado_pago: estadoPago,
          tipo: "Inscripción torneo",
        },
      ])
      .select()
      .single();

    if (errInsert || !inscripcionInsertada) {
      throw new Error(
        `Error al registrar la inscripción manual: ${errInsert?.message}`,
      );
    }

    await supabaseAdmin
      .from("torneos")
      .update({ cupos_actuales: (torneo.cupos_actuales || 0) + 1 })
      .eq("id", torneoId);

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "PAGO_MANUAL_INSCRIPCION_MANUAL",
      entidad_afectada: `inscripciones_id: ${inscripcionInsertada.id}`,
      detalles: {
        monto,
        metodo_pago: metodoPago || "No especificado",
        fecha_pago: new Date().toISOString(),
        observaciones: "Inscripción manual directa desde CRM.",
      },
    });

    return inscripcionInsertada;
  }
}
