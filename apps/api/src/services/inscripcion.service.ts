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
  runSyncCheck,
  torneoExigeAfiliacionOrganizadora,
  torneoExigeCarnet,
  torneoValidaCategoria,
  type CheckResult,
  type PerfilElegibilidad,
  type TorneoElegibilidad,
  esTorneoNacional,
} from "../utils/inscripcionElegibilidad";
import { AFILIACION_ESTADOS } from "../constants/afiliacion";
import { PerfilService } from "./perfil.service";
import {
  agruparFilasEnParejas,
  type FilaPlanillaInscripcion,
} from "../utils/inscripcionPlanilla";
import { esModalidadIndividual } from "../utils/modalidad";

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

  /** Afiliación activa al club u asociación organizadora del torneo. */
  private static async assertAfiliacionOrganizadora(
    usuarioId: string,
    torneo: TorneoElegibilidad,
    etiqueta: string,
  ): Promise<void> {
    if (!torneoExigeAfiliacionOrganizadora(torneo)) return;

    if (!torneo.club_id && !torneo.asociacion_id) {
      throw new Error(
        "El torneo exige afiliación organizadora pero no tiene club ni asociación configurados.",
      );
    }

    let query = supabaseAdmin
      .from("afiliaciones")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("estado", AFILIACION_ESTADOS.ACTIVO)
      .limit(1);

    if (torneo.club_id && torneo.asociacion_id) {
      query = query.or(
        `club_id.eq.${torneo.club_id},asociacion_id.eq.${torneo.asociacion_id}`,
      );
    } else if (torneo.club_id) {
      query = query.eq("club_id", torneo.club_id);
    } else if (torneo.asociacion_id) {
      query = query.eq("asociacion_id", torneo.asociacion_id);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      throw new Error(
        `${etiqueta}: se requiere afiliación activa al club o asociación organizadora del torneo.`,
      );
    }
  }

  private static async cargarTorneoElegibilidad(
    torneoId: string,
  ): Promise<TorneoElegibilidad> {
    const { data: torneo, error } = await supabaseAdmin
      .from("torneos")
      .select(
        "id, fecha, fecha_cierre_inscripcion, nivel, alcance, categoria, rama, validar_edad, cupos_maximos, cupos_actuales, estado, reglas_arbitraje, club_id, asociacion_id",
      )
      .eq("id", torneoId)
      .single();

    if (error || !torneo) throw new Error("Torneo no encontrado.");
    return torneo;
  }

  private static async aplicarReglasJugador(
    perfil: PerfilElegibilidad,
    torneo: TorneoElegibilidad,
    etiqueta: string,
  ): Promise<void> {
    assertCategoria(perfil, torneo, etiqueta);
    assertRama(perfil, torneo.rama, etiqueta);
    assertEdad(perfil, torneo, etiqueta);
    if (torneoExigeCarnet(torneo)) {
      await InscripcionService.assertLicenciaFapActiva(perfil.id, etiqueta);
    }
    await InscripcionService.assertAfiliacionOrganizadora(
      perfil.id,
      torneo,
      etiqueta,
    );
  }

  private static async construirChecksJugador(
    perfil: PerfilElegibilidad,
    torneo: TorneoElegibilidad,
    etiqueta: string,
  ): Promise<CheckResult[]> {
    const validarCategoria = torneoValidaCategoria(torneo);
    const validarEdad = Boolean(torneo.validar_edad);

    const checks: CheckResult[] = [];

    if (validarCategoria || validarEdad) {
      checks.push(
        runSyncCheck("categoria", `${etiqueta} · categoría`, () =>
          assertCategoria(perfil, torneo, etiqueta),
        ),
      );
    } else {
      checks.push({
        code: "categoria",
        label: `${etiqueta} · categoría`,
        passed: true,
        message: "No requerida para este torneo",
      });
    }

    checks.push(
      runSyncCheck("rama", `${etiqueta} · rama`, () =>
        assertRama(perfil, torneo.rama, etiqueta),
      ),
    );

    if (validarEdad) {
      checks.push(
        runSyncCheck("edad", `${etiqueta} · edad`, () =>
          assertEdad(perfil, torneo, etiqueta),
        ),
      );
    } else {
      checks.push({
        code: "edad",
        label: `${etiqueta} · edad`,
        passed: true,
        message: "No requerida para este torneo",
      });
    }

    if (torneoExigeCarnet(torneo)) {
      try {
        await InscripcionService.assertLicenciaFapActiva(perfil.id, etiqueta);
        checks.push({
          code: "carnet",
          label: `${etiqueta} · carnet FAP`,
          passed: true,
        });
      } catch (error: unknown) {
        checks.push({
          code: "carnet",
          label: `${etiqueta} · carnet FAP`,
          passed: false,
          message:
            error instanceof Error ? error.message : "Sin carnet activo",
        });
      }
    } else {
      checks.push({
        code: "carnet",
        label: `${etiqueta} · carnet FAP`,
        passed: true,
        message: "No requerido",
      });
    }

    if (torneoExigeAfiliacionOrganizadora(torneo)) {
      try {
        await InscripcionService.assertAfiliacionOrganizadora(
          perfil.id,
          torneo,
          etiqueta,
        );
        checks.push({
          code: "afiliacion",
          label: `${etiqueta} · afiliación`,
          passed: true,
        });
      } catch (error: unknown) {
        checks.push({
          code: "afiliacion",
          label: `${etiqueta} · afiliación`,
          passed: false,
          message:
            error instanceof Error ? error.message : "Sin afiliación válida",
        });
      }
    }

    return checks;
  }

  /** Preflight: elegibilidad J1 (+ J2 por email) sin insertar. */
  static async evaluarElegibilidad(params: {
    torneoId: string;
    usuarioId: string;
    usuario2Email?: string;
  }) {
    const torneo = await InscripcionService.cargarTorneoElegibilidad(
      params.torneoId,
    );

    const { data: perfilJ1, error: errJ1 } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, email, categoria_padel, fecha_nacimiento, sexo, dni",
      )
      .eq("id", params.usuarioId)
      .single();

    if (errJ1 || !perfilJ1) {
      throw new Error("Perfil de jugador no encontrado.");
    }

    const checksTorneo: CheckResult[] = [
      runSyncCheck("cierre", "Inscripción abierta", () =>
        assertInscripcionAbierta(torneo),
      ),
    ];

    const checksJ1 = await InscripcionService.construirChecksJugador(
      perfilJ1,
      torneo,
      "Jugador 1",
    );

    let jugador2: {
      id: string;
      nombre: string;
      email: string | null;
      categoria_padel: string | null;
    } | null = null;
    let checksJ2: CheckResult[] = [];

    const email2 = params.usuario2Email?.trim();
    if (email2) {
      const { data: perfilJ2, error: errJ2 } = await supabaseAdmin
        .from("perfiles")
        .select(
          "id, nombre, apellido, email, categoria_padel, fecha_nacimiento, sexo, dni",
        )
        .eq("email", email2)
        .maybeSingle();

      if (errJ2 || !perfilJ2) {
        checksJ2 = [
          {
            code: "existe",
            label: "Jugador 2 · registrado",
            passed: false,
            message: "El email del compañero no está registrado en la plataforma.",
          },
        ];
      } else {
        jugador2 = {
          id: perfilJ2.id,
          nombre: formatNombreCompleto(perfilJ2.apellido, perfilJ2.nombre),
          email: perfilJ2.email,
          categoria_padel: perfilJ2.categoria_padel,
        };
        checksJ2 = await InscripcionService.construirChecksJugador(
          perfilJ2,
          torneo,
          "Jugador 2",
        );
      }
    }

    const allChecks = [...checksTorneo, ...checksJ1, ...checksJ2];
    return {
      ok: allChecks.every((c) => c.passed),
      torneo: {
        id: torneo.id,
        nivel: torneo.nivel,
        rama: torneo.rama,
        requiere_carnet: torneoExigeCarnet(torneo),
        requiere_afiliacion: torneoExigeAfiliacionOrganizadora(torneo),
      },
      jugador1: {
        id: perfilJ1.id,
        nombre: formatNombreCompleto(perfilJ1.apellido, perfilJ1.nombre),
        categoria_padel: perfilJ1.categoria_padel,
      },
      jugador2,
      checks: allChecks,
      checks_j1: [...checksTorneo, ...checksJ1],
      checks_j2: checksJ2,
    };
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
        .select("id, categoria_padel, fecha_nacimiento, sexo, nombre, dni")
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

    // 2. DATOS DEL TORNEO
    const torneo = await InscripcionService.cargarTorneoElegibilidad(torneoId);

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

    // 5. REGLAS J1 / J2 (categoría, rama, edad, carnet, afiliación)
    await InscripcionService.aplicarReglasJugador(perfilJ1, torneo, "Jugador 1");
    if (perfilJugador2) {
      await InscripcionService.aplicarReglasJugador(
        perfilJugador2,
        torneo,
        "Jugador 2",
      );
    }

    // 6. REGLA NACIONAL (alcance o nivel legacy)
    if (esTorneoNacional(torneo)) {
      if (
        solicitante.rol !== "admin_provincial" &&
        solicitante.rol !== "admin_federacion" &&
        solicitante.rol !== "superadmin" &&
        solicitante.rol !== "admin"
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

    // 7. DUPLICADOS
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

    // 8. CUPOS
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
          letra_prioridad: letraPrioridad
            ? String(letraPrioridad).trim().toUpperCase()
            : null,
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

    // 12. NOTIFICAR ADMINS + JUGADORES
    const isPareja =
      Boolean(jugador2Nombre) &&
      jugador2Nombre!.trim() !== "" &&
      jugador2Nombre !== "-";
    const jugadoresTexto = isPareja
      ? `${jugador1Nombre || solicitante.nombre} y ${jugador2Nombre}`
      : `${jugador1Nombre || solicitante.nombre}`;
    const verbo = isPareja ? "se han inscripto" : "se ha inscripto";

    const { data: torneoNombreRow } = await supabaseAdmin
      .from("torneos")
      .select("nombre")
      .eq("id", torneoId)
      .maybeSingle();
    const nombreTorneo = torneoNombreRow?.nombre || "el torneo";

    NotificacionService.notificarAdmins({
      titulo: "Nueva Inscripción",
      mensaje: `${jugadoresTexto} ${verbo} en ${nombreTorneo}.`,
      tipo: "info",
    }).catch((err) =>
      console.error("Error al notificar admins de nueva inscripcion:", err),
    );

    NotificacionService.crearNotificacion({
      usuario_id: jugador1Id,
      titulo: "Inscripción recibida",
      mensaje: `Tu inscripción a ${nombreTorneo} quedó registrada. Estado de pago: pendiente.`,
      tipo: "info",
      metadata: {
        tipo: "inscripcion",
        inscripcion_id: inscripcionInsertada.id,
        torneo_id: torneoId,
      },
    }).catch((err) =>
      console.error("Error al notificar jugador de inscripción:", err),
    );

    if (jugador2Id) {
      NotificacionService.crearNotificacion({
        usuario_id: jugador2Id,
        titulo: "Inscripción recibida",
        mensaje: `Fuiste inscripto junto a ${jugador1Nombre || "tu pareja"} en ${nombreTorneo}. Estado de pago: pendiente.`,
        tipo: "info",
        metadata: {
          tipo: "inscripcion",
          inscripcion_id: inscripcionInsertada.id,
          torneo_id: torneoId,
        },
      }).catch((err) =>
        console.error("Error al notificar compañero de inscripción:", err),
      );
    }

    return inscripcionInsertada;
  }

  static async actualizarEstadoPago(id: string, estadoPago: string) {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .update({ estado_pago: estadoPago })
      .eq("id", id)
      .select("*, torneos(nombre)")
      .single();

    if (error || !data)
      throw new Error("Error al actualizar el estado de pago.");

    if (estadoPago === FAP_ESTADOS_PAGO.CONFIRMADO && data.usuario_id) {
      const torneoNombre =
        (data as { torneos?: { nombre?: string } | null }).torneos?.nombre ||
        "el torneo";
      NotificacionService.crearNotificacion({
        usuario_id: data.usuario_id,
        titulo: "Inscripción confirmada",
        mensaje: `Tu pago fue verificado. Ya estás habilitado en ${torneoNombre}.`,
        tipo: "success",
        metadata: {
          tipo: "inscripcion",
          inscripcion_id: data.id,
          torneo_id: data.torneo_id,
        },
      }).catch((err) =>
        console.error("Error al notificar confirmación de inscripción:", err),
      );
    }

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

    // Desvincular de partidos: hay FKs restrictivas en equipo_a/equipo_b/ganador.
    await supabaseAdmin
      .from("partidos")
      .update({ equipo_a_id: null })
      .eq("equipo_a_id", id);
    await supabaseAdmin
      .from("partidos")
      .update({ equipo_b_id: null })
      .eq("equipo_b_id", id);
    await supabaseAdmin
      .from("partidos")
      .update({ ganador: null })
      .eq("ganador", id);

    const { error: delError } = await supabaseAdmin
      .from("inscripciones")
      .delete()
      .eq("id", id);

    if (delError) {
      throw new Error(
        delError.message || "Error interno al eliminar la inscripción.",
      );
    }

    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("cupos_actuales")
      .eq("id", inscripcion.torneo_id)
      .single();

    if (torneo) {
      const actuales = Number(torneo.cupos_actuales ?? 0);
      await supabaseAdmin
        .from("torneos")
        .update({ cupos_actuales: Math.max(0, actuales - 1) })
        .eq("id", inscripcion.torneo_id);
    }
  }

  /**
   * Inscripción manual admin.
   * Por defecto aplica las mismas reglas de elegibilidad.
   * `omitirValidaciones` + `motivo` (≥10 chars) permite override auditable.
   */
  static async registrarInscripcionManual(datos: {
    torneoId: string;
    jugador1Identificador: string;
    jugador2Identificador?: string;
    monto: number;
    metodoPago?: string;
    adminId: string;
    omitirValidaciones?: boolean;
    motivo?: string;
    letraPrioridad?: string;
  }) {
    const {
      torneoId,
      jugador1Identificador,
      jugador2Identificador,
      monto,
      metodoPago,
      adminId,
      omitirValidaciones = false,
      motivo,
      letraPrioridad,
    } = datos;

    if (omitirValidaciones) {
      const motivoLimpio = (motivo || "").trim();
      if (motivoLimpio.length < 10) {
        throw new Error(
          "Para omitir validaciones debés indicar un motivo de al menos 10 caracteres.",
        );
      }
    }

    const { data: j1, error: j1Error } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, categoria_padel, fecha_nacimiento, sexo, dni")
      .or(
        `dni.eq."${jugador1Identificador}",email.eq."${jugador1Identificador}"`,
      )
      .maybeSingle();

    if (j1Error || !j1) {
      throw new Error(
        `El jugador 1 (${jugador1Identificador}) no está registrado en la plataforma.`,
      );
    }

    let j2: {
      id: string;
      nombre: string | null;
      apellido: string | null;
      categoria_padel: string | null;
      fecha_nacimiento: string | null;
      sexo: string | null;
    } | null = null;

    if (
      jugador2Identificador &&
      jugador2Identificador.trim() !== "" &&
      jugador2Identificador !== "-"
    ) {
      const { data: resolvedJ2, error: j2Error } = await supabaseAdmin
        .from("perfiles")
        .select("id, nombre, apellido, categoria_padel, fecha_nacimiento, sexo, dni")
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

    const torneo = await InscripcionService.cargarTorneoElegibilidad(torneoId);

    if (esTorneoNacional(torneo) && !letraPrioridad?.trim()) {
      throw new Error(
        "La letra de prioridad es obligatoria en torneos Nacionales.",
      );
    }

    if (!omitirValidaciones) {
      assertInscripcionAbierta(torneo);
      await InscripcionService.aplicarReglasJugador(j1, torneo, "Jugador 1");
      if (j2) {
        await InscripcionService.aplicarReglasJugador(j2, torneo, "Jugador 2");
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
          letra_prioridad: letraPrioridad?.trim().toUpperCase() || null,
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
      accion: omitirValidaciones
        ? "INSCRIPCION_MANUAL_OVERRIDE"
        : "PAGO_MANUAL_INSCRIPCION_MANUAL",
      entidad_afectada: `inscripciones_id: ${inscripcionInsertada.id}`,
      detalles: {
        monto,
        metodo_pago: metodoPago || "No especificado",
        fecha_pago: new Date().toISOString(),
        observaciones: omitirValidaciones
          ? "Inscripción manual con override de validaciones."
          : "Inscripción manual directa desde CRM.",
        omitir_validaciones: omitirValidaciones,
        motivo: omitirValidaciones ? (motivo || "").trim() : null,
        jugador1_id: j1.id,
        jugador2_id: j2?.id || null,
      },
    });

    return inscripcionInsertada;
  }

  /**
   * Importa inscripciones desde filas parseadas de la planilla oficial.
   * Crea fichas de jugador completas para los DNI no registrados.
   */
  static async importarDesdePlanilla(datos: {
    torneoId: string;
    adminId: string;
    filas: FilaPlanillaInscripcion[];
    modalidad?: string | null;
    omitirValidaciones?: boolean;
    motivo?: string;
  }) {
    const {
      torneoId,
      adminId,
      filas,
      modalidad,
      omitirValidaciones = true,
      motivo,
    } = datos;

    if (!filas.length) {
      throw new Error("La planilla no contiene jugadores para importar.");
    }

    const torneo = await InscripcionService.cargarTorneoElegibilidad(torneoId);
    const { data: torneoCompleto } = await supabaseAdmin
      .from("torneos")
      .select("modalidad, precio_inscripcion")
      .eq("id", torneoId)
      .single();

    const modalidadTorneo = modalidad || torneoCompleto?.modalidad;
    const monto = Number(torneoCompleto?.precio_inscripcion || 0);
    const individual = esModalidadIndividual(modalidadTorneo);

    const grupos: Array<{
      j1: FilaPlanillaInscripcion;
      j2?: FilaPlanillaInscripcion;
    }> = individual
      ? filas.map((fila) => ({ j1: fila }))
      : agruparFilasEnParejas(filas);

    let inscripcionesOk = 0;
    let jugadoresCreados = 0;
    const errores: string[] = [];

    for (const grupo of grupos) {
      try {
        const j1 = await PerfilService.resolverJugadorDesdePlanilla(grupo.j1);
        if (j1.creado) jugadoresCreados++;

        let j2: Awaited<
          ReturnType<typeof PerfilService.resolverJugadorDesdePlanilla>
        > | null = null;

        if (!individual && grupo.j2) {
          j2 = await PerfilService.resolverJugadorDesdePlanilla(grupo.j2);
          if (j2.creado) jugadoresCreados++;
        }

        await InscripcionService.registrarInscripcionManual({
          torneoId,
          jugador1Identificador: grupo.j1.dni,
          jugador2Identificador:
            !individual && grupo.j2 ? grupo.j2.dni : undefined,
          monto,
          metodoPago: "Planilla",
          adminId,
          omitirValidaciones,
          motivo:
            motivo ||
            "Importación masiva desde planilla oficial de inscripciones.",
          letraPrioridad: grupo.j1.letraOrden,
        });

        inscripcionesOk++;
      } catch (error: unknown) {
        const filaRef = grupo.j2
          ? `filas ${grupo.j1.fila}/${grupo.j2.fila}`
          : `fila ${grupo.j1.fila}`;
        const msg =
          error instanceof Error ? error.message : "Error desconocido";
        errores.push(`${filaRef}: ${msg}`);
      }
    }

    return {
      inscripcionesOk,
      jugadoresCreados,
      errores,
      totalFilas: filas.length,
      torneoId: torneo.id,
    };
  }
}
