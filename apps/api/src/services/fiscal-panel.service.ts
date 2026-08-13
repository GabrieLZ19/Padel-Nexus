import { supabaseAdmin } from "../config/supabase";
import { TorneoService } from "./torneo.service";
import { NotificacionService } from "./notificacion.service";
import type { FiscalSesion } from "./fiscal-sesion.service";

export type TipoIncidenciaFiscal =
  | "incidencia"
  | "sancion"
  | "descalificacion"
  | "cambio_categoria"
  | "informe_preliminar";

export type MotivoInformeFiscal =
  | "falta_reglamentaria"
  | "codigo_conducta"
  | "categorizacion"
  | "otro";

export type PosicionJuegoFiscal = "drive" | "reves";

export type EstadoIncidenciaFiscal = "registrada" | "aplicada" | "anulada";
export type GravedadIncidencia = "leve" | "grave" | "muy_grave";

export interface CrearIncidenciaDTO {
  tipo?: TipoIncidenciaFiscal;
  descripcion: string;
  motivo: string;
  motivo_informe?: MotivoInformeFiscal;
  posicion_juego?: PosicionJuegoFiscal | null;
  asociacion_jugador?: string | null;
  gravedad?: GravedadIncidencia | null;
  partido_id?: string | null;
  jugador_id?: string | null;
  inscripcion_id?: string | null;
  categoria_nueva?: string | null;
}

export interface RevisarInformeDTO {
  estado: "aplicada" | "anulada";
  decision_general?: string | null;
}

interface LicenciaResumen {
  id: string;
  nro_licencia: string;
  estado: string;
  fecha_vencimiento: string | null;
}

interface JugadorFicha {
  id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  categoria_padel: string | null;
  licencia: LicenciaResumen | null;
}

function nombreInscripcionValido(nombre?: string | null): boolean {
  const n = String(nombre || "").trim();
  if (!n || n === "-") return false;
  return n.toLowerCase() !== "libre";
}

function unwrapRelacion<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] as T) || null;
  }
  return value as T;
}

function licenciaVigente(licencias: LicenciaResumen[] | null | undefined): LicenciaResumen | null {
  if (!licencias || licencias.length === 0) return null;
  const activa = licencias.find((l) => l.estado === "Activa");
  return activa || licencias[0];
}

const MOTIVOS_INFORME: MotivoInformeFiscal[] = [
  "falta_reglamentaria",
  "codigo_conducta",
  "categorizacion",
  "otro",
];

export class FiscalPanelService {
  static async obtenerContexto(fiscal: FiscalSesion) {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .select(
        "id, nombre, apellido, dni, rango, correo, activo, asociacion_id, asociaciones:asociacion_id(id, nombre, sigla)",
      )
      .eq("id", fiscal.id)
      .single();

    if (error || !data) {
      throw new Error("No se encontró la ficha del fiscal.");
    }

    return data;
  }

  static async listarTorneosAsignados(fiscalId: string, alcance?: string) {
    const { data: asignaciones, error } = await supabaseAdmin
      .from("torneo_fiscales")
      .select("rol, torneo_id, torneos(*, clubes!club_id(id, nombre, provincia, localidad))")
      .eq("fiscal_id", fiscalId);

    if (error) throw new Error(error.message);

    const filas: Array<Record<string, unknown> & { rol_torneo: string }> = [];
    for (const row of asignaciones || []) {
      const torneo = unwrapRelacion<Record<string, unknown>>(row.torneos);
      if (!torneo) continue;
      filas.push({
        ...(await this.resolverSede(torneo)),
        rol_torneo: row.rol || "auxiliar",
      });
    }

    if (alcance && alcance !== "Todos") {
      return filas.filter(
        (t) => String(t.alcance || "").toLowerCase() === alcance.toLowerCase(),
      );
    }

    return filas;
  }

  static async obtenerTorneoAsignado(torneoId: string, fiscalId: string) {
    const { data, error } = await supabaseAdmin
      .from("torneo_fiscales")
      .select("rol, torneos(*, clubes!club_id(id, nombre, provincia, localidad))")
      .eq("torneo_id", torneoId)
      .eq("fiscal_id", fiscalId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const torneo = unwrapRelacion<Record<string, unknown>>(data?.torneos);
    if (!torneo) {
      throw new Error("No estás asignado a este torneo.");
    }

    return {
      ...(await this.resolverSede(torneo)),
      rol_torneo: data?.rol || "auxiliar",
    };
  }

  static async obtenerPartidos(torneoId: string) {
    return TorneoService.obtenerPartidosFormateados(torneoId);
  }

  static async obtenerJugadores(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select(
        `
        id,
        torneo_id,
        usuario_id,
        usuario2_id,
        jugador1_nombre,
        jugador2_nombre,
        estado_pago,
        j1:perfiles!fk_inscripciones_usuario (
          id, nombre, apellido, dni, categoria_padel, lugar_residencia,
          licencias:licencias!fk_licencias_usuario (id, nro_licencia, estado, fecha_vencimiento)
        ),
        j2:perfiles!fk_inscripciones_usuario2 (
          id, nombre, apellido, dni, categoria_padel, lugar_residencia,
          licencias:licencias!fk_licencias_usuario (id, nro_licencia, estado, fecha_vencimiento)
        )
      `,
      )
      .eq("torneo_id", torneoId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((ins) => {
      const j1Raw = ins.j1 as
        | (JugadorFicha & { licencias?: LicenciaResumen[]; lugar_residencia?: string | null })
        | (JugadorFicha & { licencias?: LicenciaResumen[]; lugar_residencia?: string | null })[]
        | null;
      const j2Raw = ins.j2 as
        | (JugadorFicha & { licencias?: LicenciaResumen[]; lugar_residencia?: string | null })
        | (JugadorFicha & { licencias?: LicenciaResumen[]; lugar_residencia?: string | null })[]
        | null;

      const j1 = Array.isArray(j1Raw) ? j1Raw[0] : j1Raw;
      const j2 = Array.isArray(j2Raw) ? j2Raw[0] : j2Raw;

      const j2NombreValido = nombreInscripcionValido(ins.jugador2_nombre);

      return {
        inscripcion_id: ins.id,
        torneo_id: ins.torneo_id,
        estado_pago: ins.estado_pago,
        jugador1: j1
          ? {
              id: j1.id,
              nombre: j1.nombre,
              apellido: j1.apellido,
              dni: j1.dni,
              categoria_padel: j1.categoria_padel,
              lugar_residencia: j1.lugar_residencia || null,
              nombre_completo:
                [j1.apellido, j1.nombre].filter(Boolean).join(", ") || ins.jugador1_nombre,
              licencia: licenciaVigente(j1.licencias),
            }
          : {
              id: ins.usuario_id,
              nombre: ins.jugador1_nombre,
              apellido: null,
              dni: null,
              categoria_padel: null,
              lugar_residencia: null,
              nombre_completo: ins.jugador1_nombre,
              licencia: null,
            },
        jugador2: j2
          ? {
              id: j2.id,
              nombre: j2.nombre,
              apellido: j2.apellido,
              dni: j2.dni,
              categoria_padel: j2.categoria_padel,
              lugar_residencia: j2.lugar_residencia || null,
              nombre_completo:
                [j2.apellido, j2.nombre].filter(Boolean).join(", ") || ins.jugador2_nombre,
              licencia: licenciaVigente(j2.licencias),
            }
          : ins.usuario2_id || j2NombreValido
            ? {
                id: ins.usuario2_id,
                nombre: ins.jugador2_nombre,
                apellido: null,
                dni: null,
                categoria_padel: null,
                lugar_residencia: null,
                nombre_completo: ins.jugador2_nombre,
                licencia: null,
              }
            : null,
      };
    });
  }

  static async obtenerFichaJugador(jugadorId: string, fiscalId: string) {
    const permitido = await this.jugadorEstaEnTorneoAsignado(jugadorId, fiscalId);
    if (!permitido) {
      throw new Error("El jugador no participa en un torneo asignado a este fiscal.");
    }

    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, dni, categoria_padel, email, telefono, lugar_residencia, fecha_nacimiento, sexo, club_id, licencias:licencias!fk_licencias_usuario(id, nro_licencia, estado, fecha_emision, fecha_vencimiento)",
      )
      .eq("id", jugadorId)
      .single();

    if (error || !data) {
      throw new Error("Jugador no encontrado.");
    }

    let clubNombre: string | null = null;
    if (data.club_id) {
      const { data: club } = await supabaseAdmin
        .from("clubes")
        .select("nombre")
        .eq("id", data.club_id)
        .maybeSingle();
      clubNombre = club?.nombre || null;
    }

    const { data: historial } = await supabaseAdmin
      .from("fiscal_incidencias")
      .select("*")
      .eq("jugador_id", jugadorId)
      .order("created_at", { ascending: false });

    return {
      ...data,
      asociacion_o_club: clubNombre || data.lugar_residencia || null,
      incidencias: historial || [],
    };
  }

  static async listarIncidencias(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("fiscal_incidencias")
      .select(
        `
        *,
        fiscales!fiscal_incidencias_fiscal_id_fkey (id, nombre, apellido, rango),
        perfiles:jugador_id (id, nombre, apellido, dni)
      `,
      )
      .eq("torneo_id", torneoId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Emite informe preliminar interno. Nunca muta perfiles públicos.
   */
  static async registrarIncidencia(
    torneoId: string,
    fiscal: FiscalSesion,
    usuarioId: string,
    payload: CrearIncidenciaDTO,
  ) {
    const descripcion = String(payload.descripcion || "").trim();
    const motivo = String(payload.motivo || "").trim();

    if (!descripcion) throw new Error("La descripción / cuerpo del informe es obligatorio.");
    if (!motivo) throw new Error("El motivo es obligatorio para dejar traza.");

    const motivoInforme = (payload.motivo_informe ||
      (payload.tipo === "cambio_categoria" ? "categorizacion" : "otro")) as MotivoInformeFiscal;

    if (!MOTIVOS_INFORME.includes(motivoInforme)) {
      throw new Error("Motivo de informe inválido.");
    }

    if (!payload.jugador_id) {
      throw new Error("El informe preliminar requiere un jugador.");
    }

    const enTorneo = await this.jugadorEstaEnTorneo(torneoId, payload.jugador_id);
    if (!enTorneo) {
      throw new Error("El jugador no está inscripto en este torneo.");
    }

    const { data: jugador, error: errJ } = await supabaseAdmin
      .from("perfiles")
      .select("id, categoria_padel, lugar_residencia, club_id, nombre, apellido, dni")
      .eq("id", payload.jugador_id)
      .single();

    if (errJ || !jugador) throw new Error("Jugador no encontrado.");

    let asociacionJugador =
      String(payload.asociacion_jugador || "").trim() || jugador.lugar_residencia || null;
    if (!asociacionJugador && jugador.club_id) {
      const { data: club } = await supabaseAdmin
        .from("clubes")
        .select("nombre")
        .eq("id", jugador.club_id)
        .maybeSingle();
      asociacionJugador = club?.nombre || null;
    }

    const posicion =
      payload.posicion_juego === "drive" || payload.posicion_juego === "reves"
        ? payload.posicion_juego
        : null;

    const categoriaAnterior = jugador.categoria_padel || null;
    const categoriaNueva =
      motivoInforme === "categorizacion"
        ? payload.categoria_nueva?.trim() || null
        : null;

    const { data: incidencia, error } = await supabaseAdmin
      .from("fiscal_incidencias")
      .insert([
        {
          torneo_id: torneoId,
          partido_id: payload.partido_id || null,
          jugador_id: payload.jugador_id,
          inscripcion_id: payload.inscripcion_id || null,
          fiscal_id: fiscal.id,
          tipo: "informe_preliminar",
          gravedad: payload.gravedad || null,
          descripcion,
          motivo,
          motivo_informe: motivoInforme,
          posicion_juego: posicion,
          asociacion_jugador: asociacionJugador,
          categoria_anterior: categoriaAnterior,
          categoria_nueva: categoriaNueva,
          estado: "registrada",
        },
      ])
      .select()
      .single();

    if (error || !incidencia) {
      throw new Error(error?.message || "No se pudo registrar el informe preliminar.");
    }

    await supabaseAdmin.from("logs_auditoria").insert([
      {
        usuario_id_admin: usuarioId,
        accion: "FISCAL_INFORME_PRELIMINAR",
        entidad_afectada: `torneo_id: ${torneoId}`,
        detalles: {
          incidencia_id: incidencia.id,
          fiscal_id: fiscal.id,
          motivo_informe: motivoInforme,
          jugador_id: payload.jugador_id,
          nota: "Informe interno. No afecta el perfil público del jugador.",
        },
      },
    ]);

    await this.notificarFiscalGeneral(torneoId, fiscal, incidencia.id, jugador);

    return incidencia;
  }

  static async revisarInforme(
    torneoId: string,
    incidenciaId: string,
    fiscal: FiscalSesion,
    usuarioId: string,
    payload: RevisarInformeDTO,
  ) {
    if (payload.estado !== "aplicada" && payload.estado !== "anulada") {
      throw new Error("La decisión debe ser aplicada o anulada.");
    }

    const { data: incidencia, error } = await supabaseAdmin
      .from("fiscal_incidencias")
      .select("*")
      .eq("id", incidenciaId)
      .eq("torneo_id", torneoId)
      .maybeSingle();

    if (error || !incidencia) {
      throw new Error("Informe no encontrado en este torneo.");
    }

    if (incidencia.estado !== "registrada") {
      throw new Error("Este informe ya fue revisado.");
    }

    const decision = String(payload.decision_general || "").trim();
    if (!decision) {
      throw new Error("Indicá la decisión del Fiscal General.");
    }

    const { data: actualizada, error: errUpd } = await supabaseAdmin
      .from("fiscal_incidencias")
      .update({
        estado: payload.estado,
        decision_general: decision,
        revisado_por_fiscal_id: fiscal.id,
        revisado_en: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", incidenciaId)
      .select()
      .single();

    if (errUpd || !actualizada) {
      throw new Error(errUpd?.message || "No se pudo actualizar el informe.");
    }

    await supabaseAdmin.from("logs_auditoria").insert([
      {
        usuario_id_admin: usuarioId,
        accion: `FISCAL_INFORME_${payload.estado.toUpperCase()}`,
        entidad_afectada: `torneo_id: ${torneoId}`,
        detalles: {
          incidencia_id: incidenciaId,
          fiscal_general_id: fiscal.id,
          decision_general: decision,
          nota: "Decisión interna. No muta el perfil público del jugador.",
        },
      },
    ]);

    return actualizada;
  }

  static async obtenerReporte(torneoId: string, fiscalId: string) {
    const [torneo, partidos, jugadores, incidencias, fiscal] = await Promise.all([
      this.obtenerTorneoAsignado(torneoId, fiscalId),
      this.obtenerPartidos(torneoId),
      this.obtenerJugadores(torneoId),
      this.listarIncidencias(torneoId),
      supabaseAdmin
        .from("fiscales")
        .select("id, nombre, apellido, dni, rango")
        .eq("id", fiscalId)
        .single(),
    ]);

    return {
      generado_en: new Date().toISOString(),
      fiscal: fiscal.data,
      torneo,
      partidos,
      jugadores,
      incidencias,
    };
  }

  private static async notificarFiscalGeneral(
    torneoId: string,
    emisor: FiscalSesion,
    incidenciaId: string,
    jugador: { nombre?: string | null; apellido?: string | null; dni?: string | null },
  ) {
    const { data: generales } = await supabaseAdmin
      .from("torneo_fiscales")
      .select("fiscal_id, fiscales(id, usuario_id, nombre, apellido)")
      .eq("torneo_id", torneoId)
      .eq("rol", "general");

    const jugadorLabel =
      [jugador.apellido, jugador.nombre].filter(Boolean).join(", ") ||
      jugador.dni ||
      "jugador";

    for (const row of generales || []) {
      const f = unwrapRelacion<{ id?: string; usuario_id?: string | null }>(row.fiscales);
      if (!f?.usuario_id || f.id === emisor.id) continue;

      await NotificacionService.crearNotificacion({
        usuario_id: f.usuario_id,
        titulo: "Nuevo informe preliminar",
        mensaje: `${emisor.apellido}, ${emisor.nombre} emitió un informe sobre ${jugadorLabel}.`,
        tipo: "warning",
        metadata: {
          tipo: "informe_preliminar",
          torneo_id: torneoId,
          incidencia_id: incidenciaId,
          deep_link: `/dashboard/fiscal/torneos/${torneoId}?tab=informes`,
        },
      });
    }
  }

  private static async resolverSede(torneo: Record<string, unknown>) {
    const clubJoin = unwrapRelacion<{
      id?: string;
      nombre?: string;
      provincia?: string;
      localidad?: string;
    }>(torneo.clubes);
    if (clubJoin?.nombre) {
      return { ...torneo, clubes: clubJoin, sede_nombre: clubJoin.nombre };
    }

    const clubId = typeof torneo.club_id === "string" ? torneo.club_id : null;
    if (clubId) {
      const { data: club } = await supabaseAdmin
        .from("clubes")
        .select("id, nombre, provincia, localidad")
        .eq("id", clubId)
        .maybeSingle();
      if (club?.nombre) {
        return { ...torneo, clubes: club, sede_nombre: club.nombre };
      }
    }

    const torneoId = String(torneo.id || "");
    if (torneoId) {
      const { data: sedes } = await supabaseAdmin
        .from("torneo_sedes")
        .select("clubes(id, nombre, provincia, localidad)")
        .eq("torneo_id", torneoId)
        .limit(1);
      const sede = unwrapRelacion<{ nombre?: string }>(sedes?.[0]?.clubes);
      if (sede?.nombre) {
        return { ...torneo, clubes: sede, sede_nombre: sede.nombre };
      }
    }

    const lugar = typeof torneo.lugar === "string" ? torneo.lugar.trim() : "";
    return { ...torneo, clubes: clubJoin, sede_nombre: lugar || null };
  }

  private static async jugadorEstaEnTorneo(
    torneoId: string,
    jugadorId: string,
  ): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select("id")
      .eq("torneo_id", torneoId)
      .or(`usuario_id.eq.${jugadorId},usuario2_id.eq.${jugadorId}`)
      .limit(1);
    if (error) return false;
    return Boolean(data && data.length > 0);
  }

  private static async jugadorEstaEnTorneoAsignado(
    jugadorId: string,
    fiscalId: string,
  ): Promise<boolean> {
    const { data: asignados, error } = await supabaseAdmin
      .from("torneo_fiscales")
      .select("torneo_id")
      .eq("fiscal_id", fiscalId);

    if (error || !asignados || asignados.length === 0) return false;

    const torneoIds = asignados.map((a) => a.torneo_id);
    const { data: ins, error: errIns } = await supabaseAdmin
      .from("inscripciones")
      .select("id")
      .in("torneo_id", torneoIds)
      .or(`usuario_id.eq.${jugadorId},usuario2_id.eq.${jugadorId}`)
      .limit(1);

    if (errIns) return false;
    return Boolean(ins && ins.length > 0);
  }
}
