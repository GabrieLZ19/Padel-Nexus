import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_PAGO } from "../constants/fap";
import {
  PerfilService,
  type DatosAltaJugadorManual,
} from "./perfil.service";
import { categoriaRequeridaDelTorneo } from "../utils/categoriaTorneo";
import { assertCategoria } from "../utils/inscripcionElegibilidad";

export type ParejaExternaLlave = {
  inscripcion_origen_id: string;
  torneo_origen_id: string;
  torneo_origen_nombre: string;
  categoria_origen: string | null;
  etiqueta: string;
  jugador1_nombre: string;
  jugador2_nombre: string | null;
  /** TOR-22: jugadores ya inscriptos en el torneo destino. */
  bloqueada_en_torneo?: boolean;
  motivo_bloqueo?: string;
};

function formatNombreCompleto(
  apellido?: string | null,
  nombre?: string | null,
): string {
  const ap = (apellido || "").trim();
  const nom = (nombre || "").trim();
  if (ap && nom) return `${ap.toUpperCase()}, ${nom}`;
  if (ap) return ap.toUpperCase();
  if (nom) return nom;
  return "Desconocido";
}

function pareceDni(q: string): boolean {
  return /^\d{7,11}$/.test(q.trim());
}

async function cargarTorneosBusqueda(torneoDestinoId: string): Promise<{
  clubId: string | null;
  grupoId: string | null;
  torneoIds: string[];
}> {
  const { data: torneo, error } = await supabaseAdmin
    .from("torneos")
    .select("id, club_id, grupo_id")
    .eq("id", torneoDestinoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!torneo) throw new Error("Torneo no encontrado");

  let q = supabaseAdmin
    .from("torneos")
    .select("id")
    .neq("id", torneoDestinoId);

  if (torneo.grupo_id) {
    q = q.eq("grupo_id", torneo.grupo_id);
  } else if (torneo.club_id) {
    q = q.eq("club_id", torneo.club_id);
  } else {
    return {
      clubId: torneo.club_id,
      grupoId: torneo.grupo_id,
      torneoIds: [],
    };
  }

  const { data: torneos, error: errTorneos } = await q;
  if (errTorneos) throw new Error(errTorneos.message);

  return {
    clubId: torneo.club_id,
    grupoId: torneo.grupo_id,
    torneoIds: (torneos || []).map((t) => String(t.id)),
  };
}

async function assertOrigenPermitido(
  torneoDestinoId: string,
  torneoOrigenId: string,
): Promise<void> {
  if (torneoOrigenId === torneoDestinoId) {
    throw new Error("La pareja ya pertenece a este torneo.");
  }
  const { torneoIds } = await cargarTorneosBusqueda(torneoDestinoId);
  if (!torneoIds.includes(torneoOrigenId)) {
    throw new Error(
      "El torneo de origen no está en el mismo club o grupo que este torneo.",
    );
  }
}

async function jugadoresYaEnTorneo(
  torneoId: string,
  usuario1: string,
  usuario2: string | null,
): Promise<boolean> {
  const idsAValidar = usuario2
    ? `usuario_id.in.("${usuario1}","${usuario2}"),usuario2_id.in.("${usuario1}","${usuario2}")`
    : `usuario_id.eq."${usuario1}",usuario2_id.eq."${usuario1}"`;
  const { count } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId)
    .or(idsAValidar);
  return Boolean(count && count > 0);
}

async function insertarInscripcionLlave(datos: {
  torneoId: string;
  adminId: string;
  motivo: string;
  usuario1Id: string;
  usuario2Id: string | null;
  jugador1Nombre: string;
  jugador2Nombre: string;
  letraPrioridad?: string | null;
  metodoPago?: string;
  detallesAuditoria: Record<string, unknown>;
}): Promise<{ id: string; jugador1_nombre: string; jugador2_nombre: string }> {
  const motivoLimpio = datos.motivo.trim();
  if (motivoLimpio.length < 10) {
    throw new Error(
      "Indicá un motivo de al menos 10 caracteres para dar de alta la pareja.",
    );
  }

  if (
    await jugadoresYaEnTorneo(
      datos.torneoId,
      datos.usuario1Id,
      datos.usuario2Id,
    )
  ) {
    throw new Error(
      "Uno de los jugadores ya está inscripto en este torneo. Elegila desde la lista del torneo.",
    );
  }

  const { data: torneoRow } = await supabaseAdmin
    .from("torneos")
    .select("cupos_actuales")
    .eq("id", datos.torneoId)
    .maybeSingle();

  const estadoPago = datos.metodoPago
    ? FAP_ESTADOS_PAGO.CONFIRMADO
    : FAP_ESTADOS_PAGO.CONFIRMADO;

  const { data: inscripcion, error: errInsert } = await supabaseAdmin
    .from("inscripciones")
    .insert([
      {
        torneo_id: datos.torneoId,
        usuario_id: datos.usuario1Id,
        usuario2_id: datos.usuario2Id,
        jugador1_nombre: datos.jugador1Nombre,
        jugador2_nombre: datos.jugador2Nombre,
        monto: 0,
        estado_pago: estadoPago,
        tipo: "Inscripción torneo",
        letra_prioridad: datos.letraPrioridad?.trim().toUpperCase() || null,
      },
    ])
    .select("id, jugador1_nombre, jugador2_nombre")
    .single();

  if (errInsert || !inscripcion) {
    throw new Error(
      `No se pudo registrar la inscripción: ${errInsert?.message || "error"}`,
    );
  }

  await supabaseAdmin
    .from("torneos")
    .update({ cupos_actuales: (torneoRow?.cupos_actuales || 0) + 1 })
    .eq("id", datos.torneoId);

  await supabaseAdmin.from("logs_auditoria").insert({
    usuario_id_admin: datos.adminId,
    accion: "ALTA_PAREJA_EDICION_LLAVE",
    entidad_afectada: `torneo_id: ${datos.torneoId}`,
    detalles: {
      inscripcion_id: inscripcion.id,
      motivo: motivoLimpio,
      jugador1_nombre: datos.jugador1Nombre,
      jugador2_nombre: datos.jugador2Nombre,
      ...datos.detallesAuditoria,
    },
  });

  return inscripcion;
}

export class LlaveAltaParejaService {
  static async ejecutarAltaDesdePayload(datos: {
    torneoDestinoId: string;
    adminId: string;
    motivo: string;
    payload:
      | {
          modo: "externa";
          inscripcion_origen_id: string;
          letra_prioridad?: string;
        }
      | {
          modo: "manual";
          jugador1_identificador: string;
          jugador2_identificador?: string;
          jugador1_datos?: DatosAltaJugadorManual;
          jugador2_datos?: DatosAltaJugadorManual;
          letra_prioridad?: string;
        };
  }): Promise<{ id: string }> {
    const { motivo, adminId, torneoDestinoId, payload } = datos;
    if (payload.modo === "externa") {
      const row = await LlaveAltaParejaService.importarParejaDesdeOtroTorneo({
        torneoDestinoId,
        inscripcionOrigenId: payload.inscripcion_origen_id,
        motivo,
        adminId,
        letraPrioridad: payload.letra_prioridad,
      });
      return { id: row.id };
    }
    const row = await LlaveAltaParejaService.altaParejaPorIdentificadores({
      torneoDestinoId,
      jugador1Identificador: payload.jugador1_identificador,
      jugador2Identificador: payload.jugador2_identificador,
      jugador1Datos: payload.jugador1_datos,
      jugador2Datos: payload.jugador2_datos,
      motivo,
      adminId,
      letraPrioridad: payload.letra_prioridad,
    });
    return { id: row.id };
  }

  static async buscarParejasExternas(
    torneoDestinoId: string,
    query: string,
  ): Promise<{
    resultados: ParejaExternaLlave[];
    excluidas_en_torneo: number;
  }> {
    const vacio = { resultados: [] as ParejaExternaLlave[], excluidas_en_torneo: 0 };
    const q = query.trim();
    if (q.length < 2) return vacio;

    const { torneoIds } = await cargarTorneosBusqueda(torneoDestinoId);
    if (torneoIds.length === 0) return vacio;

    type FilaIns = {
      id: string;
      torneo_id: string;
      usuario_id: string;
      usuario2_id: string | null;
      jugador1_nombre: string | null;
      jugador2_nombre: string | null;
      torneos:
        | {
            nombre: string | null;
            categoria: string | null;
            nivel: string | null;
          }
        | {
            nombre: string | null;
            categoria: string | null;
            nivel: string | null;
          }[]
        | null;
    };

    const torneoDeFila = (
      fila: FilaIns,
    ): {
      nombre: string | null;
      categoria: string | null;
      nivel: string | null;
    } | null => {
      const rel = fila.torneos;
      if (!rel) return null;
      if (Array.isArray(rel)) return rel[0] || null;
      return rel;
    };

    let filas: FilaIns[] = [];

    if (pareceDni(q)) {
      const { data: perfiles } = await supabaseAdmin
        .from("perfiles")
        .select("id")
        .eq("dni", q)
        .limit(30);
      const userIds = (perfiles || []).map((p) => String(p.id));
      if (userIds.length > 0) {
        const orUsuarios = userIds
          .map((id) => `usuario_id.eq.${id},usuario2_id.eq.${id}`)
          .join(",");
        const { data, error } = await supabaseAdmin
          .from("inscripciones")
          .select(
            "id, torneo_id, usuario_id, usuario2_id, jugador1_nombre, jugador2_nombre, torneos ( nombre, categoria, nivel )",
          )
          .in("torneo_id", torneoIds)
          .or(orUsuarios)
          .limit(30);
        if (error) throw new Error(error.message);
        filas = (data || []) as unknown as FilaIns[];
      }
    } else {
      const like = `%${q.replace(/%/g, "")}%`;
      const { data, error } = await supabaseAdmin
        .from("inscripciones")
        .select(
          "id, torneo_id, usuario_id, usuario2_id, jugador1_nombre, jugador2_nombre, torneos ( nombre, categoria, nivel )",
        )
        .in("torneo_id", torneoIds)
        .or(
          `jugador1_nombre.ilike.${like},jugador2_nombre.ilike.${like}`,
        )
        .limit(30);
      if (error) throw new Error(error.message);
      filas = (data || []) as unknown as FilaIns[];
    }

    const filasMapeadas: ParejaExternaLlave[] = [];
    for (const fila of filas) {
      const j1 = (fila.jugador1_nombre || "Jugador 1").trim();
      const j2 = (fila.jugador2_nombre || "").trim();
      const etiquetaPareja = j2 && j2 !== "-" ? `${j1} / ${j2}` : j1;
      const torneoMeta = torneoDeFila(fila);
      const torneoNombre = torneoMeta?.nombre || "Otro torneo";
      const cat = categoriaRequeridaDelTorneo({
        nivel: torneoMeta?.nivel,
        categoria: torneoMeta?.categoria,
      });

      const yaEnTorneo = await jugadoresYaEnTorneo(
        torneoDestinoId,
        String(fila.usuario_id),
        fila.usuario2_id ? String(fila.usuario2_id) : null,
      );

      filasMapeadas.push({
        inscripcion_origen_id: fila.id,
        torneo_origen_id: fila.torneo_id,
        torneo_origen_nombre: torneoNombre,
        categoria_origen: cat,
        etiqueta: `${etiquetaPareja} · ${torneoNombre}${
          cat ? ` (${cat})` : ""
        }`,
        jugador1_nombre: j1,
        jugador2_nombre: j2 && j2 !== "-" ? j2 : null,
        bloqueada_en_torneo: yaEnTorneo,
        motivo_bloqueo: yaEnTorneo
          ? "Esos jugadores ya están inscriptos en este torneo."
          : undefined,
      });
    }

    const excluidasEnTorneo = filasMapeadas.filter(
      (f) => f.bloqueada_en_torneo,
    ).length;
  const visibles = filasMapeadas.filter((f) => !f.bloqueada_en_torneo);

    return { resultados: visibles, excluidas_en_torneo: excluidasEnTorneo };
  }

  static async importarParejaDesdeOtroTorneo(datos: {
    torneoDestinoId: string;
    inscripcionOrigenId: string;
    motivo: string;
    adminId: string;
    letraPrioridad?: string;
  }) {
    const { data: origen, error } = await supabaseAdmin
      .from("inscripciones")
      .select(
        "id, torneo_id, usuario_id, usuario2_id, jugador1_nombre, jugador2_nombre, letra_prioridad",
      )
      .eq("id", datos.inscripcionOrigenId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!origen?.torneo_id || !origen.usuario_id) {
      throw new Error("Inscripción de origen no encontrada.");
    }

    await assertOrigenPermitido(datos.torneoDestinoId, String(origen.torneo_id));

    const j2Nombre =
      (origen.jugador2_nombre || "-").trim() || "-";

    return insertarInscripcionLlave({
      torneoId: datos.torneoDestinoId,
      adminId: datos.adminId,
      motivo: datos.motivo,
      usuario1Id: String(origen.usuario_id),
      usuario2Id: origen.usuario2_id ? String(origen.usuario2_id) : null,
      jugador1Nombre: (origen.jugador1_nombre || "Jugador 1").trim(),
      jugador2Nombre: j2Nombre,
      letraPrioridad:
        datos.letraPrioridad?.trim() || origen.letra_prioridad || null,
      metodoPago: "Confirmado",
      detallesAuditoria: {
        origen: "otro_torneo",
        inscripcion_origen_id: origen.id,
        torneo_origen_id: origen.torneo_id,
      },
    });
  }

  static async altaParejaPorIdentificadores(datos: {
    torneoDestinoId: string;
    jugador1Identificador: string;
    jugador2Identificador?: string;
    jugador1Datos?: DatosAltaJugadorManual;
    jugador2Datos?: DatosAltaJugadorManual;
    motivo: string;
    adminId: string;
    letraPrioridad?: string;
  }) {
    const { data: torneoMeta, error: errTorneo } = await supabaseAdmin
      .from("torneos")
      .select(
        "id, fecha, nivel, categoria, validar_edad, reglas_arbitraje",
      )
      .eq("id", datos.torneoDestinoId)
      .maybeSingle();
    if (errTorneo) throw new Error(errTorneo.message);
    if (!torneoMeta) throw new Error("Torneo no encontrado.");
    const categoriaTorneo = categoriaRequeridaDelTorneo(torneoMeta);

    const optsPlanilla = {
      categoriaFallback: categoriaTorneo,
      usarFallbackPlanilla5: false as const,
    };

    const completarDatos = (
      base?: DatosAltaJugadorManual,
    ): DatosAltaJugadorManual | undefined => {
      const out: DatosAltaJugadorManual = { ...(base || {}) };
      if (!out.categoria_padel?.trim() && categoriaTorneo) {
        out.categoria_padel = categoriaTorneo;
      }
      return Object.keys(out).length > 0 ? out : base;
    };

    const fichasCreadas: string[] = [];

    try {
      const resJ1 = await PerfilService.resolverJugadorParaInscripcionManual(
        datos.jugador1Identificador,
        completarDatos(datos.jugador1Datos),
        "Jugador 1",
        optsPlanilla,
      );
      if (resJ1.creado) fichasCreadas.push(resJ1.id);

      let j2: typeof resJ1 | null = null;
      let j2Creado = false;
      if (
        datos.jugador2Identificador &&
        datos.jugador2Identificador.trim() !== "" &&
        datos.jugador2Identificador !== "-"
      ) {
        const resJ2 = await PerfilService.resolverJugadorParaInscripcionManual(
          datos.jugador2Identificador,
          completarDatos(datos.jugador2Datos),
          "Jugador 2",
          optsPlanilla,
        );
        if (resJ2.creado) fichasCreadas.push(resJ2.id);
        j2 = resJ2;
        j2Creado = resJ2.creado;
      }

      assertCategoria(
        { id: resJ1.id, ...resJ1 },
        torneoMeta,
        "Jugador 1",
      );
      if (j2) {
        assertCategoria({ id: j2.id, ...j2 }, torneoMeta, "Jugador 2");
      }

      const j1Nombre = formatNombreCompleto(resJ1.apellido, resJ1.nombre);
      const j2Nombre = j2 ? formatNombreCompleto(j2.apellido, j2.nombre) : "-";

      return await insertarInscripcionLlave({
        torneoId: datos.torneoDestinoId,
        adminId: datos.adminId,
        motivo: datos.motivo,
        usuario1Id: resJ1.id,
        usuario2Id: j2?.id || null,
        jugador1Nombre: j1Nombre,
        jugador2Nombre: j2Nombre,
        letraPrioridad: datos.letraPrioridad || null,
        metodoPago: "Confirmado",
        detallesAuditoria: {
          origen: "alta_dni_manual",
          jugador1_ficha_creada: resJ1.creado,
          jugador2_ficha_creada: j2 ? j2Creado : false,
        },
      });
    } catch (error) {
      for (const id of fichasCreadas) {
        try {
          await PerfilService.revertirFichaProvisionalInscripcion(id);
        } catch {
          /* mejor esfuerzo */
        }
      }
      throw error;
    }
  }
}
