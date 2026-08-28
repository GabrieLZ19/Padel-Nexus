import { supabaseAdmin } from "../config/supabase";
import { SocketService } from "./socket.service";
import {
  FAP_ESTADOS_PAGO,
  FAP_ESTADOS_TORNEO,
  FAP_REGLAS,
} from "../constants/fap";
import { enrichInscripcionDenominacion } from "../utils/denominacionNacional";

function mapInscripcionPartido(ins: Record<string, unknown>) {
  const perfiles = ins.perfiles as
    | {
        avatar_url?: string | null;
        lugar_residencia?: string | null;
        clubes?: { nombre?: string } | null;
      }
    | null
    | undefined;
  const perfilesJ2 = ins.perfiles_jugador2 as
    | {
        avatar_url?: string | null;
        lugar_residencia?: string | null;
        clubes?: { nombre?: string } | null;
      }
    | null
    | undefined;

  const club1 = perfiles?.clubes?.nombre;
  const club2 = perfilesJ2?.clubes?.nombre;
  let clubName: string | null = null;
  if (club1 && club2) clubName = `${club1} / ${club2}`;
  else if (club1) clubName = club1;
  else if (club2) clubName = club2;

  const enriched = enrichInscripcionDenominacion({
    letra_prioridad: ins.letra_prioridad as string | null | undefined,
    usuario_id: ins.usuario_id as string | null | undefined,
    usuario2_id: ins.usuario2_id as string | null | undefined,
    perfiles: perfiles ?? null,
    perfiles_jugador2: perfilesJ2 ?? null,
  });

  return {
    jugador1_nombre: (ins.jugador1_nombre as string | null) ?? null,
    jugador2_nombre: (ins.jugador2_nombre as string | null) ?? null,
    clubName: clubName || "Sin club asignado",
    club1: club1 || null,
    club2: club2 || null,
    avatar_j1: perfiles?.avatar_url || null,
    avatar_j2: perfilesJ2?.avatar_url || null,
    ...enriched,
  };
}

export interface FiltrosTorneo {
  search?: string;
  estado?: string;
}

export interface TorneoPayload {
  nombre: string;
  subtitulo?: string;
  club_id?: string | null;
  fecha: string;
  estado: string;
  cupos_maximos: number;
  nivel: string;
  categoria: string;
  modalidad: string;
  precio_inscripcion: number;
  formato: string;
  alcance?: "Nacional" | "Provincial" | "Regional" | "Local" | null;
  premios?: { uno?: string; dos?: string; tres?: string };
  canchas_disponibles?: number;
  duracion_partido_minutos?: number;
  hora_inicio_jornada?: string;
}

export class TorneoService {
  // Helper para calcular estado dinámico (Cierre automático)
  private static evaluateDynamicState(torneo: any) {
    if (
      (torneo.estado === FAP_ESTADOS_TORNEO.INSCRIPCION ||
        torneo.estado === FAP_ESTADOS_TORNEO.CERRADO) &&
      torneo.fecha
    ) {
      const fechaTorneo = new Date(torneo.fecha);
      fechaTorneo.setHours(0, 0, 0, 0);
      const fechaActual = new Date();
      fechaActual.setHours(0, 0, 0, 0);

      const diasFaltantes = Math.ceil(
        (fechaTorneo.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diasFaltantes < FAP_REGLAS.DIAS_CIERRE_INSCRIPCION) {
        torneo.estado = FAP_ESTADOS_TORNEO.CERRADO;
      } else {
        torneo.estado = FAP_ESTADOS_TORNEO.INSCRIPCION;
      }
    }

    return torneo;
  }

  static async listarTorneos(
    page?: number,
    limit: number = 10,
    filtros?: FiltrosTorneo,
  ) {
    let query = supabaseAdmin
      .from("torneos")
      .select(
        `*, clubes!club_id(nombre, provincia), inscripciones(usuario_id)`,
        {
          count: "exact",
        },
      )
      .order("created_at", { ascending: false });

    if (filtros?.search) query = query.ilike("nombre", `%${filtros.search}%`);

    if (filtros?.estado) {
      const estados = filtros.estado
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      // Si piden "Cerrado", buscamos también los de "Inscripción" para poder aplicarles la regla dinámica
      const dbEstados =
        estados.includes(FAP_ESTADOS_TORNEO.CERRADO) &&
        !estados.includes(FAP_ESTADOS_TORNEO.INSCRIPCION)
          ? [...estados, FAP_ESTADOS_TORNEO.INSCRIPCION]
          : estados;

      if (dbEstados.length === 1) query = query.eq("estado", dbEstados[0]);
      else if (dbEstados.length > 1) query = query.in("estado", dbEstados);
    }

    type DbTorneo = Record<string, any> & {
      cupos_actuales?: number;
      cupos_maximos?: number;
    };

    let data;
    let count = 0;

    if (page !== undefined) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const result = await query.range(from, to);
      data = result.data;
      count = result.count || 0;
      if (result.error) throw new Error(result.error.message);
    } else {
      const result = await query.limit(limit);
      data = result.data;
      if (result.error) throw new Error(result.error.message);
    }

    let formatted = ((data as DbTorneo[]) || []).map((t) => {
      const realInscriptos = Array.isArray(t.inscripciones)
        ? t.inscripciones.length
        : t.cupos_actuales || 0;
      return TorneoService.evaluateDynamicState({
        ...t,
        cupos_actuales: realInscriptos,
        cupos_maximos: t.cupos_maximos || 0,
      });
    });

    // Si filtraron específicamente por estado en el query string, volver a filtrar en memoria por si el estado dinámico lo cambió
    if (filtros?.estado) {
      const requestedStates = filtros.estado.split(",").map((s) => s.trim());
      formatted = formatted.filter((t) => requestedStates.includes(t.estado));
    }

    return { data: formatted, total: count, paginated: page !== undefined };
  }

  static async obtenerPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("torneos")
      .select(`*, clubes!club_id(nombre, provincia), inscripciones(usuario_id)`)
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("Torneo no encontrado.");
    return TorneoService.evaluateDynamicState(data);
  }

  static async crearTorneo(datos: TorneoPayload) {
    const payload = TorneoService.evaluateDynamicState({ ...datos });
    const alcanceNormalizado = TorneoService.normalizarAlcance(datos.alcance);
    const forzarFap = alcanceNormalizado === "Nacional";

    // Resolver asociacion_id a partir de asociacion sigla o id; fallback FAP
    let resolvedAsociacionId = (datos as any).asociacion_id || null;
    const asociacionNombre = (datos as any).asociacion ?? "FAP";

    if (!resolvedAsociacionId && asociacionNombre && !forzarFap) {
      const { data: asocData } = await supabaseAdmin
        .from("asociaciones")
        .select("id")
        .or(`sigla.eq."${asociacionNombre}",nombre.eq."${asociacionNombre}"`)
        .maybeSingle();
      if (asocData?.id) {
        resolvedAsociacionId = asocData.id;
      }
    }

    if (!resolvedAsociacionId || forzarFap) {
      const fapId = await TorneoService.resolveFapAsociacionId();
      if (fapId) resolvedAsociacionId = fapId;
    }

    let reglamento =
      (datos as any).reglamento ?? (datos as any).asociacion ?? "FAP";
    if (forzarFap) reglamento = "FAP";
    if (reglamento === "Amateur") {
      // Amateur solo aplica fuera del circuito federativo nacional
      if (forzarFap) reglamento = "FAP";
    }

    const { data: torneo, error: torneoError } = await supabaseAdmin
      .from("torneos")
      .insert([
        {
          nombre: payload.nombre,
          subtitulo: payload.subtitulo,
          club_id: payload.club_id || null,
          fecha: payload.fecha,
          estado: payload.estado,
          cupos_maximos: datos.cupos_maximos,
          cupos_actuales: 0,
          nivel: datos.nivel,
          rama: (datos as any).rama || "Masculina",
          categoria: datos.categoria,
          modalidad: datos.modalidad,
          precio_inscripcion: datos.precio_inscripcion,
          formato: datos.formato,
          alcance: alcanceNormalizado,
          reglamento,
          asociacion_id: resolvedAsociacionId,
          premio_1: datos.premios?.uno,
          premio_2: datos.premios?.dos,
          premio_3: datos.premios?.tres,
          canchas_disponibles: datos.canchas_disponibles || 1,
          duracion_partido_minutos: datos.duracion_partido_minutos || 90,
          hora_inicio_jornada: datos.hora_inicio_jornada || "08:00",
        },
      ])
      .select()
      .single();

    if (torneoError || !torneo)
      throw new Error(`Error al crear torneo: ${torneoError?.message}`);

    const { error: cuadroError } = await supabaseAdmin.from("cuadros").insert([
      {
        torneo_id: torneo.id,
        fase: "Fase Inicial",
        configuracion: {
          formato: datos.formato,
          estado: "esperando_inscripciones",
        },
      },
    ]);

    if (cuadroError)
      throw new Error(`Error al inicializar el cuadro: ${cuadroError.message}`);
    return torneo;
  }

  private static ramaCorta(rama?: string | null): string {
    const r = String(rama || "").toLowerCase();
    if (r.startsWith("fem")) return "Fem.";
    if (r.startsWith("mix")) return "Mix.";
    return "Masc.";
  }

  private static nombreReplicado(
    nombreOrigen: string,
    nivelOrigen: string | null | undefined,
    ramaOrigen: string | null | undefined,
    nivelNuevo: string,
    ramaNueva: string,
  ): string {
    let base = (nombreOrigen || "Torneo").trim();
    const sufijos = [
      `${nivelOrigen || ""} ${TorneoService.ramaCorta(ramaOrigen)}`,
      nivelOrigen || "",
      TorneoService.ramaCorta(ramaOrigen),
      ramaOrigen || "",
    ]
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

    for (const s of sufijos) {
      const re = new RegExp(
        `[\\s—\\-–]*${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "i",
      );
      base = base.replace(re, "").trim();
    }

    return `${base} — ${nivelNuevo} ${TorneoService.ramaCorta(ramaNueva)}`;
  }

  /**
   * Clona un torneo base a otras combinaciones nivel/rama.
   * No copia inscripciones, partidos, zonas ni fiscales.
   */
  static async replicarTorneo(
    id: string,
    opciones: {
      niveles: string[];
      ramas?: string[];
      soloMismaRama?: boolean;
    },
    adminId?: string,
  ) {
    const niveles = (opciones.niveles || [])
      .map((n) => String(n || "").trim())
      .filter(Boolean);
    if (niveles.length === 0) {
      throw new Error("Debés seleccionar al menos un nivel para replicar.");
    }

    const { data: origen, error } = await supabaseAdmin
      .from("torneos")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !origen) throw new Error("Torneo origen no encontrado.");

    const ramaOrigen = origen.rama || "Masculina";
    let ramasDestino = (opciones.ramas || [])
      .map((r) => String(r || "").trim())
      .filter(Boolean);

    if (opciones.soloMismaRama || ramasDestino.length === 0) {
      ramasDestino = [ramaOrigen];
    }

    const pares: Array<{ rama: string; nivel: string }> = [];
    for (const rama of ramasDestino) {
      for (const nivel of niveles) {
        if (rama === ramaOrigen && nivel === origen.nivel) continue;
        pares.push({ rama, nivel });
      }
    }

    if (pares.length === 0) {
      throw new Error(
        "No hay combinaciones nuevas para crear (todas coinciden con el torneo origen).",
      );
    }

    const creados: unknown[] = [];
    const omitidos: Array<{ rama: string; nivel: string; motivo: string }> = [];

    for (const par of pares) {
      try {
        const nombre = TorneoService.nombreReplicado(
          origen.nombre,
          origen.nivel,
          ramaOrigen,
          par.nivel,
          par.rama,
        );

        const payload: TorneoPayload & Record<string, unknown> = {
          nombre,
          subtitulo: origen.subtitulo || undefined,
          club_id: origen.club_id,
          fecha: origen.fecha,
          estado: FAP_ESTADOS_TORNEO.BORRADOR,
          cupos_maximos: origen.cupos_maximos || 16,
          nivel: par.nivel,
          categoria: origen.categoria || "Libres",
          modalidad: origen.modalidad || "Parejas",
          precio_inscripcion: Number(origen.precio_inscripcion || 0),
          formato: origen.formato || "Eliminatoria Directa",
          alcance: origen.alcance,
          premios: {
            uno: origen.premio_1 || undefined,
            dos: origen.premio_2 || undefined,
            tres: origen.premio_3 || undefined,
          },
          canchas_disponibles: origen.canchas_disponibles || 1,
          duracion_partido_minutos: origen.duracion_partido_minutos || 90,
          hora_inicio_jornada: origen.hora_inicio_jornada || "08:00",
          rama: par.rama,
          reglamento: origen.reglamento,
          asociacion_id: origen.asociacion_id,
          asociacion: origen.reglamento || "FAP",
        };

        const creado = await TorneoService.crearTorneo(payload as TorneoPayload);

        const extras: Record<string, unknown> = {};
        if (origen.banners) extras.banners = origen.banners;
        if (origen.reglas_arbitraje)
          extras.reglas_arbitraje = origen.reglas_arbitraje;
        if (origen.fecha_cierre_inscripcion)
          extras.fecha_cierre_inscripcion = origen.fecha_cierre_inscripcion;
        if (origen.federacion_id) extras.federacion_id = origen.federacion_id;
        if (origen.validar_edad != null) extras.validar_edad = origen.validar_edad;

        if (Object.keys(extras).length > 0) {
          await supabaseAdmin
            .from("torneos")
            .update(extras)
            .eq("id", (creado as { id: string }).id);
        }

        creados.push({ ...(creado as object), ...extras });
      } catch (err: unknown) {
        omitidos.push({
          rama: par.rama,
          nivel: par.nivel,
          motivo: err instanceof Error ? err.message : "Error al crear",
        });
      }
    }

    if (adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: adminId,
        accion: "TORNEO_REPLICAR",
        entidad_afectada: `torneos_id: ${id}`,
        detalles: {
          origen_id: id,
          creados: creados.length,
          omitidos: omitidos.length,
          niveles,
          ramas: ramasDestino,
        },
      });
    }

    return { creados, omitidos };
  }

  private static async resolveFapAsociacionId(): Promise<string | null> {
    const { data: fapBySigla } = await supabaseAdmin
      .from("asociaciones")
      .select("id")
      .ilike("sigla", "FAP")
      .limit(1)
      .maybeSingle();
    if (fapBySigla?.id) return fapBySigla.id;

    const { data: fapByNombre } = await supabaseAdmin
      .from("asociaciones")
      .select("id")
      .ilike("nombre", "%Federacion Argentina%")
      .limit(1)
      .maybeSingle();
    return fapByNombre?.id ?? null;
  }

  // Columnas OFICIALES Y EXACTAS de la DDL de la tabla `torneos` en Supabase:
  private static readonly COLUMNAS_TORNEOS = new Set([
    "nombre",
    "subtitulo",
    "club_id",
    "fecha",
    "estado",
    "cupos_maximos",
    "cupos_actuales",
    "nivel",
    "categoria",
    "modalidad",
    "precio_inscripcion",
    "formato",
    "premio_1",
    "premio_2",
    "premio_3",
    "canchas_disponibles",
    "duracion_partido_minutos",
    "hora_inicio_jornada",
    "alcance",
    "reglas_arbitraje",
    "configuracion_puntos",
    "logo_url",
    "banners",
    "fecha_cierre_inscripcion",
    "fecha_fin",
    "validar_edad",
    "dias_juego",
    "reglamento",
    "es_gratis",
    "rama",
    "asociacion_id",
    "federacion_id",
  ]);

  public static normalizarAlcance(
    alcance?: string | null,
  ): "Nacional" | "Provincial" | "Regional" | "Local" {
    if (!alcance) return "Provincial";
    const val = String(alcance).trim();
    if (/nacional/i.test(val)) return "Nacional";
    if (/regional/i.test(val)) return "Regional";
    if (/local|privado/i.test(val)) return "Local";
    if (/provincial/i.test(val)) return "Provincial";
    return "Provincial";
  }

  /**
   * Filtra un objeto dejando solo las claves que corresponden a columnas
   * válidas de la tabla `torneos`. Evita que campos relacionales, de UI
   * o calculados (e.g. `clubes`, `inscripciones`, `premios`) lleguen a
   * PostgREST y provoquen un error 400/500.
   */
  private static sanitizeTorneoData(
    datos: Record<string, any>,
  ): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(datos)) {
      if (TorneoService.COLUMNAS_TORNEOS.has(key)) {
        clean[key] = value;
      }
    }
    if (clean.alcance !== undefined) {
      clean.alcance = TorneoService.normalizarAlcance(clean.alcance);
    }
    return clean;
  }

  static async actualizarTorneo(id: string, datos: any) {
    const { data: torneoActual } = await supabaseAdmin
      .from("torneos")
      .select("estado, fecha")
      .eq("id", id)
      .single();

    // Sanitizar: solo columnas válidas de la tabla `torneos`
    const updateData = TorneoService.sanitizeTorneoData(datos);

    if (updateData.asociacion && !updateData.asociacion_id) {
      const { data: asocData } = await supabaseAdmin
        .from("asociaciones")
        .select("id")
        .or(
          `sigla.eq."${updateData.asociacion}",nombre.eq."${updateData.asociacion}"`,
        )
        .maybeSingle();
      if (asocData?.id) {
        updateData.asociacion_id = asocData.id;
      }
    }

    // Alcance Nacional ⇒ organizadora y reglamento FAP
    if (updateData.alcance === "Nacional") {
      updateData.reglamento = "FAP";
      const fapId = await TorneoService.resolveFapAsociacionId();
      if (fapId) updateData.asociacion_id = fapId;
    }

    if (torneoActual) {
      const mergedForEval = { ...torneoActual, ...updateData };
      const evaluated = TorneoService.evaluateDynamicState(mergedForEval);
      if (evaluated.estado) {
        updateData.estado = evaluated.estado;
      }
    }

    if (datos.cupos_maximos !== undefined) {
      const { count: inscritosCount } = await supabaseAdmin
        .from("inscripciones")
        .select("id", { count: "exact", head: true })
        .eq("torneo_id", id);

      const inscritos = inscritosCount || 0;
      if (Number(datos.cupos_maximos) < inscritos) {
        throw new Error(
          `No es posible reducir el cupo máximo a ${datos.cupos_maximos} porque actualmente hay ${inscritos} inscritos en el torneo.`,
        );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("torneos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !data)
      throw new Error(`Error al actualizar: ${error?.message}`);
    return data;
  }

  static async eliminarTorneo(id: string) {
    const { error } = await supabaseAdmin.from("torneos").delete().eq("id", id);
    if (error)
      throw new Error(`No se pudo eliminar el torneo: ${error.message}`);
  }

  static async obtenerInscripciones(id: string) {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select(
        `
        *,
        perfiles:perfiles!fk_inscripciones_usuario (
          lugar_residencia,
          avatar_url,
          pendiente_activacion,
          clubes:clubes!perfiles_club_id_fkey (nombre)
        ),
        perfiles_jugador2:perfiles!fk_inscripciones_usuario2 (
          lugar_residencia,
          avatar_url,
          pendiente_activacion,
          clubes:clubes!perfiles_club_id_fkey (nombre)
        )
      `,
      )
      .eq("torneo_id", id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((ins: Record<string, unknown>) => {
      const enriched = enrichInscripcionDenominacion(ins as Parameters<typeof enrichInscripcionDenominacion>[0]);
      return {
        ...ins,
        provincia: enriched.provincia,
        denominacion_nacional: enriched.denominacion_nacional,
      };
    });
  }

  static async obtenerPartidosFormateados(id: string) {
    const { data: partidos, error: partidosError } = await supabaseAdmin
      .from("partidos")
      .select("*")
      .eq("torneo_id", id)
      .order("ronda", { ascending: true })
      .order("orden", { ascending: true })
      .order("id", { ascending: true });

    if (partidosError) throw new Error(partidosError.message);

    const { data: inscripciones, error: insError } = await supabaseAdmin
      .from("inscripciones")
      .select(
        `
        id, 
        jugador1_nombre, 
        jugador2_nombre,
        usuario_id,
        usuario2_id,
        letra_prioridad,
        perfiles:perfiles!fk_inscripciones_usuario (
          avatar_url,
          lugar_residencia,
          clubes:clubes!perfiles_club_id_fkey (nombre)
        ),
        perfiles_jugador2:perfiles!fk_inscripciones_usuario2 (
          avatar_url,
          lugar_residencia,
          clubes:clubes!perfiles_club_id_fkey (nombre)
        )
      `,
      )
      .eq("torneo_id", id);

    if (insError) throw new Error(insError.message);

    const insMap = new Map<string, ReturnType<typeof mapInscripcionPartido>>();
    (inscripciones || []).forEach((ins: Record<string, unknown>) => {
      insMap.set(String(ins.id), mapInscripcionPartido(ins));
    });

    return (partidos || []).map((p) => {
      const equipoA = p.equipo_a_id ? insMap.get(p.equipo_a_id) : null;
      const equipoB = p.equipo_b_id ? insMap.get(p.equipo_b_id) : null;

      return {
        ...p,
        equipo_a_j1: equipoA ? equipoA.jugador1_nombre : null,
        equipo_a_j2: equipoA ? equipoA.jugador2_nombre : null,
        equipo_a_club: equipoA ? equipoA.clubName : null,
        equipo_a_avatar_j1: equipoA ? equipoA.avatar_j1 : null,
        equipo_a_avatar_j2: equipoA ? equipoA.avatar_j2 : null,
        equipo_a_usuario_id: equipoA ? equipoA.usuario_id : null,
        equipo_a_usuario2_id: equipoA ? equipoA.usuario2_id : null,
        equipo_a_letra_prioridad: equipoA ? equipoA.letra_prioridad : null,
        equipo_a_provincia: equipoA ? equipoA.provincia : null,
        equipo_a_denominacion: equipoA ? equipoA.denominacion_nacional : null,
        equipo_b_j1: equipoB ? equipoB.jugador1_nombre : null,
        equipo_b_j2: equipoB ? equipoB.jugador2_nombre : null,
        equipo_b_club: equipoB ? equipoB.clubName : null,
        equipo_b_avatar_j1: equipoB ? equipoB.avatar_j1 : null,
        equipo_b_avatar_j2: equipoB ? equipoB.avatar_j2 : null,
        equipo_b_usuario_id: equipoB ? equipoB.usuario_id : null,
        equipo_b_usuario2_id: equipoB ? equipoB.usuario2_id : null,
        equipo_b_letra_prioridad: equipoB ? equipoB.letra_prioridad : null,
        equipo_b_provincia: equipoB ? equipoB.provincia : null,
        equipo_b_denominacion: equipoB ? equipoB.denominacion_nacional : null,
      };
    });
  }

  static async generarCuadroEliminatoria(
    id: string,
    ordenSiembra?: string[],
    adminId?: string,
    motivo?: string,
    forzarDestructivo = false,
  ) {
    const { data: torneo, error: torneoError } = await supabaseAdmin
      .from("torneos")
      .select(
        "formato, cupos_maximos, fecha, canchas_disponibles, duracion_partido_minutos, hora_inicio_jornada",
      )
      .eq("id", id)
      .single();

    if (torneoError || !torneo) throw new Error("Torneo no encontrado");

    if (!forzarDestructivo) {
      const { data: conResultados } = await supabaseAdmin
        .from("partidos")
        .select("id")
        .eq("torneo_id", id)
        .not("ganador", "is", null)
        .limit(1);
      if (conResultados && conResultados.length > 0) {
        throw new Error(
          "Hay partidos con resultados cargados. Desactivá 'Modificación no destructiva' y confirmá para regenerar (esto borrará resultados).",
        );
      }
    }

    const { data: todasInscripciones, error: inscError } = await supabaseAdmin
      .from("inscripciones")
      .select("id, usuario_id, estado_pago")
      .eq("torneo_id", id);

    if (
      inscError ||
      !todasInscripciones ||
      todasInscripciones.length < FAP_REGLAS.CUPOS_MINIMOS_LLUAVES
    ) {
      throw new Error("Se necesitan al menos 4 inscripciones confirmadas.");
    }

    const pendientes = todasInscripciones.filter(
      (i) => i.estado_pago !== FAP_ESTADOS_PAGO.CONFIRMADO,
    );
    if (pendientes.length > 0) {
      throw new Error(
        `Hay ${pendientes.length} inscripciones pendientes de pago. Todos los inscritos deben estar confirmados/aprobados para generar el fixture.`,
      );
    }

    const inscripciones = todasInscripciones;
    const cuposValidos = [6, 8, 12, 16, 24, 32, 64];

    if (!cuposValidos.includes(inscripciones.length)) {
      throw new Error(
        `Para generar cuadros o zonas exactas sin libres, la cantidad de confirmados debe ser 6, 8, 12, 16, 24, 32 o 64. Actualmente hay ${inscripciones.length} inscriptos.`,
      );
    }

    await supabaseAdmin.from("partidos").delete().eq("torneo_id", id);

    let shuffled = [...inscripciones];
    if (
      ordenSiembra &&
      Array.isArray(ordenSiembra) &&
      ordenSiembra.length > 0
    ) {
      shuffled = ordenSiembra
        .map((sid) => inscripciones.find((ins) => ins.id === sid))
        .filter(Boolean) as any[];
      const setSiembra = new Set(shuffled.map((s) => s.id));
      const faltantes = inscripciones.filter((ins) => !setSiembra.has(ins.id));
      shuffled.push(...faltantes);
    } else {
      shuffled = shuffled.sort(() => 0.5 - Math.random());
    }

    const partidos: Record<string, any>[] = [];
    let orden = 1;

    const canchasCount = torneo.canchas_disponibles || 1;
    const matchDur = torneo.duracion_partido_minutos || 90;
    const baseDateStr = torneo.fecha
      ? torneo.fecha.split("T")[0]
      : new Date().toISOString().split("T")[0];
    const horaInicio = torneo.hora_inicio_jornada || "08:00";
    const [hours, minutes] = horaInicio.split(":").map(Number);

    let currentRoundStartTime = new Date(baseDateStr + "T00:00:00");
    currentRoundStartTime.setHours(hours, minutes, 0, 0);

    if (torneo.formato === "Eliminatoria Directa") {
      const N = inscripciones.length;
      let cupos = 4;
      while (cupos < N) {
        cupos *= 2;
      }

      const roundsConfig = [
        { name: "32AVOS", matches: 32 },
        { name: "16AVOS", matches: 16 },
        { name: "OCTAVOS", matches: 8 },
        { name: "CUARTOS", matches: 4 },
        { name: "SEMIS", matches: 2 },
        { name: "FINAL", matches: 1 },
      ];

      const startIndex = roundsConfig.findIndex((r) => r.matches === cupos / 2);
      if (startIndex === -1)
        throw new Error("Cantidad de cupos inválida para generar cuadro.");

      const initialRound = roundsConfig[startIndex];
      const partidosPorRonda: Record<string, any[]> = {};
      for (let i = startIndex; i < roundsConfig.length; i++) {
        partidosPorRonda[roundsConfig[i].name] = [];
      }

      // ALGORITMO UNIVERSAL DE SIEMBRAS Y BYES FAP / APA PARA CUALQUIER N INSCRIPTOS
      // 1. Determinar el tamaño de la llave principal (K: 4, 8, 16, 32) y la cantidad de BYEs (B = K - N)
      const K = cupos;
      const B = K - N;
      const numPartidosIniciales = K / 2;

      // Matriz de slots para la ronda inicial (tamaño numPartidosIniciales)
      const slotsIniciales: Array<{
        equipo_a_id: string | null;
        equipo_b_id: string | null;
      }> = [];
      for (let i = 0; i < numPartidosIniciales; i++) {
        slotsIniciales.push({ equipo_a_id: null, equipo_b_id: null });
      }

      // Orden de asignación de BYEs según el reglamento de siembras FAP (Extremo sup, Extremo inf, Centro...)
      const orderByeSlots: number[] = [];
      if (numPartidosIniciales >= 1) orderByeSlots.push(0); // Slot 0 (Cabecera 1)
      if (numPartidosIniciales >= 2)
        orderByeSlots.push(numPartidosIniciales - 1); // Último Slot (Cabecera 2)
      if (numPartidosIniciales >= 4) {
        orderByeSlots.push(Math.floor(numPartidosIniciales / 2) - 1); // Centro superior (Cabecera 3)
        orderByeSlots.push(Math.floor(numPartidosIniciales / 2)); // Centro inferior (Cabecera 4)
      }
      for (let i = 0; i < numPartidosIniciales; i++) {
        if (!orderByeSlots.includes(i)) orderByeSlots.push(i);
      }

      let playerIdx = 0;
      const byeSlotIndices = new Set<number>();
      // 1. Asignar los B BYEs a las primeras posiciones de la lista de siembra
      for (let b = 0; b < B; b++) {
        const slotIdx = orderByeSlots[b];
        if (slotIdx !== undefined && slotsIniciales[slotIdx]) {
          byeSlotIndices.add(slotIdx);
          slotsIniciales[slotIdx].equipo_a_id = shuffled[playerIdx]?.id || null;
          playerIdx++;
        }
      }

      // 2. Asignar los jugadores restantes en los partidos de 2 equipos (omitir slots BYE para que no se llene equipo_b_id)
      for (let i = 0; i < numPartidosIniciales; i++) {
        if (byeSlotIndices.has(i)) {
          continue;
        }
        const slot = slotsIniciales[i];
        if (slot.equipo_a_id === null && playerIdx < N) {
          slot.equipo_a_id = shuffled[playerIdx]?.id || null;
          playerIdx++;
        }
        if (slot.equipo_b_id === null && playerIdx < N) {
          slot.equipo_b_id = shuffled[playerIdx]?.id || null;
          playerIdx++;
        }
      }

      // 3. Construir partidos de la Ronda Inicial y proyectar clasificados directos por BYE a la Siguiente Ronda
      const nextRoundName = roundsConfig[startIndex + 1]?.name || "SEMIS";
      const nextRoundMatchesCount =
        roundsConfig[startIndex + 1]?.matches ||
        Math.floor(numPartidosIniciales / 2);

      const nextRoundSlots: Array<{
        equipo_a_id: string | null;
        equipo_b_id: string | null;
      }> = [];
      for (let nr = 0; nr < nextRoundMatchesCount; nr++) {
        nextRoundSlots.push({ equipo_a_id: null, equipo_b_id: null });
      }

      for (let j = 0; j < numPartidosIniciales; j++) {
        const slot = slotsIniciales[j];
        const slotIndex = Math.floor(j / canchasCount);
        const canchaNo = (j % canchasCount) + 1;
        const matchTime = new Date(
          currentRoundStartTime.getTime() + slotIndex * matchDur * 60 * 1000,
        );

        if (slot.equipo_a_id && slot.equipo_b_id) {
          // Partido real entre 2 contrincantes
          partidosPorRonda[initialRound.name].push({
            torneo_id: id,
            equipo_a_id: slot.equipo_a_id,
            equipo_b_id: slot.equipo_b_id,
            ronda: initialRound.name,
            orden: orden++,
            estado_partido: "Programado",
            cancha_asignada: null,
            fecha_partido: matchTime.toISOString(),
            ganador: null,
          });
        } else if (slot.equipo_a_id && !slot.equipo_b_id) {
          // BYE: Clasifica automáticamente a la ronda siguiente
          const targetNextMatchIdx = Math.floor(j / 2);
          const isPosA = j % 2 === 0;
          if (nextRoundSlots[targetNextMatchIdx]) {
            if (isPosA) {
              nextRoundSlots[targetNextMatchIdx].equipo_a_id = slot.equipo_a_id;
            } else {
              nextRoundSlots[targetNextMatchIdx].equipo_b_id = slot.equipo_a_id;
            }
          }
        }
      }

      // Guardar la ronda siguiente preparada con los clasificados por BYE
      if (nextRoundName && partidosPorRonda[nextRoundName]) {
        const matchTimeNext = new Date(
          currentRoundStartTime.getTime() + matchDur * 60 * 1000,
        );
        for (let nr = 0; nr < nextRoundMatchesCount; nr++) {
          const nrSlot = nextRoundSlots[nr];
          partidosPorRonda[nextRoundName].push({
            torneo_id: id,
            equipo_a_id: nrSlot.equipo_a_id,
            equipo_b_id: nrSlot.equipo_b_id,
            ronda: nextRoundName,
            orden: orden++,
            estado_partido: "Programado",
            cancha_asignada: null,
            fecha_partido: matchTimeNext.toISOString(),
            ganador: null,
          });
        }
      }

      let roundStartTime = new Date(
        currentRoundStartTime.getTime() +
          Math.ceil(initialRound.matches / canchasCount) * matchDur * 60 * 1000,
      );

      for (let i = startIndex + 1; i < roundsConfig.length; i++) {
        const round = roundsConfig[i];
        if (partidosPorRonda[round.name].length === 0) {
          const numMatches = round.matches;
          for (let m = 0; m < numMatches; m++) {
            partidosPorRonda[round.name].push({
              torneo_id: id,
              equipo_a_id: null,
              equipo_b_id: null,
              ronda: round.name,
              orden: orden++,
              estado_partido: "Programado",
              cancha_asignada: null,
              fecha_partido: currentRoundStartTime.toISOString(),
              ganador: null,
            });
          }
        }
      }

      partidos.push(...Object.values(partidosPorRonda).flat());
    } else {
      // ========================================================================
      // FASE DE GRUPOS / ZONAS FAP (Round Robin de 3 o 4 parejas sin libres)
      // ========================================================================
      const N = shuffled.length;
      let tamañoZona = 3;
      if (N % 4 === 0) tamañoZona = 4;
      else if (N % 3 === 0) tamañoZona = 3;

      const numZonas = Math.ceil(N / tamañoZona);

      // Crear zonas vacías
      const zonas: any[][] = Array.from({ length: numZonas }, () => []);
      shuffled.forEach((ins, idx) => {
        const zonaIdx = idx % numZonas;
        zonas[zonaIdx].push(ins);
      });

      let matchGlobalIdx = 0;
      zonas.forEach((grupo, zIdx) => {
        const nombreZona = `ZONA ${String.fromCharCode(65 + zIdx)}`; // ZONA A, ZONA B...

        // Generar todos contra todos dentro del grupo
        for (let i = 0; i < grupo.length; i++) {
          for (let j = i + 1; j < grupo.length; j++) {
            const slotIndex = Math.floor(matchGlobalIdx / canchasCount);
            const canchaNo = (matchGlobalIdx % canchasCount) + 1;
            const matchTime = new Date(
              currentRoundStartTime.getTime() +
                slotIndex * matchDur * 60 * 1000,
            );

            partidos.push({
              torneo_id: id,
              equipo_a_id: grupo[i].id,
              equipo_b_id: grupo[j].id,
              ronda: nombreZona,
              orden: orden++,
              estado_partido: "Programado",
              cancha_asignada: null,
              fecha_partido: matchTime.toISOString(),
              ganador: null,
              set1_a: null,
              set1_b: null,
            });
            matchGlobalIdx++;
          }
        }
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from("partidos")
      .insert(partidos);
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin
      .from("torneos")
      .update({ estado: FAP_ESTADOS_TORNEO.EN_CURSO })
      .eq("id", id);

    // Emitir por WebSocket cambio de estado de torneo en tiempo real
    try {
      SocketService.emitirATodos("torneo_actualizado", {
        torneo_id: id,
        estado: FAP_ESTADOS_TORNEO.EN_CURSO,
        mensaje: "El torneo ha pasado a estado EN CURSO",
      });
    } catch (e) {
      console.warn("Error al emitir evento websocket de torneo:", e);
    }

    if (
      ordenSiembra &&
      Array.isArray(ordenSiembra) &&
      ordenSiembra.length > 0 &&
      adminId
    ) {
      await supabaseAdmin.from("auditoria_llaves").insert({
        torneo_id: id,
        tipo_cambio: "override_rival_partido",
        descripcion: `La siembra del cuadro de eliminatorias fue modificada manualmente. Motivo: ${motivo || "No especificado"}`,
        admin_id: adminId,
      });
    }

    return partidos.length;
  }

  static async procesarResultadoYAvance(
    partidoId: string,
    ganadorId: string,
    set1A: number,
    set1B: number,
    set2A?: number | null,
    set2B?: number | null,
    set3A?: number | null,
    set3B?: number | null,
    esSupertiebreak?: boolean,
    esWo?: boolean,
    esInjustificadoWo?: boolean,
  ) {
    const { data: partido, error: updateError } = await supabaseAdmin
      .from("partidos")
      .update({
        ganador: ganadorId,
        set1_a: set1A,
        set1_b: set1B,
        set2_a: set2A ?? null,
        set2_b: set2B ?? null,
        set3_a: set3A ?? null,
        set3_b: set3B ?? null,
        es_supertiebreak: esSupertiebreak || false,
        es_wo: esWo || false,
        es_injustificado_wo: esInjustificadoWo || false,
        estado_partido: FAP_ESTADOS_TORNEO.FINALIZADO,
      })
      .eq("id", partidoId)
      .select("id, torneo_id, ronda, orden, equipo_a_id, equipo_b_id")
      .single();

    if (updateError || !partido)
      throw new Error("Error al cargar el marcador.");

    // Emitir WebSocket global de partido actualizado
    try {
      SocketService.emitirATodos("partido_actualizado", {
        torneo_id: partido.torneo_id,
        partido_id: partido.id,
        ganador_id: ganadorId,
      });
    } catch (e) {
      console.warn("Error al emitir websocket partido_actualizado:", e);
    }

    const perdedorId =
      ganadorId === partido.equipo_a_id
        ? partido.equipo_b_id
        : partido.equipo_a_id;

    const { data: torneoInfo } = await supabaseAdmin
      .from("torneos")
      .select("nivel, categoria, modalidad, configuracion_puntos")
      .eq("id", partido.torneo_id)
      .single();

    if (torneoInfo) {
      let TABLA_PUNTOS: Record<string, { ganador: number; perdedor: number }> =
        {
          "16AVOS": { ganador: 45, perdedor: 10 },
          OCTAVOS: { ganador: 90, perdedor: 45 },
          CUARTOS: { ganador: 180, perdedor: 90 },
          SEMIS: { ganador: 360, perdedor: 180 },
          FINAL: { ganador: 1000, perdedor: 600 },
        };

      const configP = torneoInfo.configuracion_puntos as any;
      if (configP && configP.puntos_activados) {
        TABLA_PUNTOS = {
          "32AVOS": { ganador: configP.puntos_32avos || 0, perdedor: 0 },
          "16AVOS": {
            ganador: configP.puntos_16avos || 0,
            perdedor: configP.puntos_zona || 0,
          },
          OCTAVOS: {
            ganador: configP.puntos_octavos || 0,
            perdedor: configP.puntos_16avos || 0,
          },
          CUARTOS: {
            ganador: configP.puntos_cuartos || 0,
            perdedor: configP.puntos_octavos || 0,
          },
          SEMIS: {
            ganador: configP.puntos_semis || 0,
            perdedor: configP.puntos_cuartos || 0,
          },
          FINAL: {
            ganador: configP.puntos_campeon || 0,
            perdedor: configP.puntos_final || 0,
          },
        };
      }

      const rondaNormalizada = partido.ronda.toUpperCase().trim();
      const puntosRonda = TABLA_PUNTOS[rondaNormalizada];

      let puntosGanadorNetos = puntosRonda?.ganador || 0;
      let puntosPerdedorNetos = puntosRonda?.perdedor || 0;

      if (puntosRonda) {
        const SECUENCIA_RONDAS = [
          "16AVOS",
          "OCTAVOS",
          "CUARTOS",
          "SEMIS",
          "FINAL",
        ];
        const idxRonda = SECUENCIA_RONDAS.indexOf(rondaNormalizada);
        let rondaAnterior = null;

        if (idxRonda > 0) {
          for (let i = idxRonda - 1; i >= 0; i--) {
            const { data: prevMatches } = await supabaseAdmin
              .from("partidos")
              .select("id")
              .eq("torneo_id", partido.torneo_id)
              .eq("ronda", SECUENCIA_RONDAS[i])
              .limit(1);

            if (prevMatches && prevMatches.length > 0) {
              rondaAnterior = SECUENCIA_RONDAS[i];
              break;
            }
          }
        }

        if (rondaAnterior) {
          const puntosRondaAnterior = TABLA_PUNTOS[rondaAnterior];
          if (puntosRondaAnterior) {
            puntosGanadorNetos = Math.max(
              0,
              puntosRonda.ganador - puntosRondaAnterior.ganador,
            );
            puntosPerdedorNetos = Math.max(
              0,
              puntosRonda.perdedor - puntosRondaAnterior.ganador,
            );
          }
        }
      }

      const otorgarPuntosAInscripcion = async (
        inscripcionId: string | null,
        puntos: number,
        esGanador: boolean,
      ) => {
        if (!inscripcionId) return;
        const { data: ins } = await supabaseAdmin
          .from("inscripciones")
          .select("usuario_id, usuario2_id")
          .eq("id", inscripcionId)
          .single();
        if (!ins) return;

        const ids = [ins.usuario_id, ins.usuario2_id].filter(Boolean);
        for (const uid of ids) {
          const { data: rank } = await supabaseAdmin
            .from("rankings")
            .select("id, puntos, pj, pg")
            .eq("usuario_id", uid)
            .eq("categoria", torneoInfo.nivel)
            .maybeSingle();

          const pAnt = rank?.puntos || 0;
          const pjAnt = rank?.pj || 0;
          const pgAnt = rank?.pg || 0;

          const { error: rankError } = await supabaseAdmin
            .from("rankings")
            .upsert(
              {
                ...(rank?.id ? { id: rank.id } : {}),
                usuario_id: uid,
                categoria: torneoInfo.nivel,
                rama: torneoInfo.categoria,
                puntos: pAnt + puntos,
                pj: pjAnt + 1,
                pg: esGanador ? pgAnt + 1 : pgAnt,
              },
              { onConflict: "id" },
            );

          if (rankError) {
            console.error(
              `Error al actualizar ranking para usuario ${uid}:`,
              rankError,
            );
            throw new Error(
              `Error al actualizar ranking: ${rankError.message}`,
            );
          }

          if (puntos > 0) {
            const { error: histError } = await supabaseAdmin
              .from("historial_ranking")
              .insert([
                {
                  usuario_id: uid,
                  torneo_id: partido.torneo_id,
                  puntos_anteriores: pAnt,
                  puntos_nuevos: pAnt + puntos,
                },
              ]);
            if (histError) {
              console.error(
                `Error al insertar historial de ranking para usuario ${uid}:`,
                histError,
              );
              throw new Error(
                `Error al insertar historial de ranking: ${histError.message}`,
              );
            }
          }
        }
      };

      await otorgarPuntosAInscripcion(perdedorId, puntosPerdedorNetos, false);
      await otorgarPuntosAInscripcion(ganadorId, puntosGanadorNetos, true);
    }

    if (partido.ronda.toUpperCase() === "FINAL") {
      await supabaseAdmin
        .from("torneos")
        .update({ estado: FAP_ESTADOS_TORNEO.FINALIZADO })
        .eq("id", partido.torneo_id);

      // Notificar en tiempo real que el torneo finalizó
      try {
        SocketService.emitirATodos("torneo_actualizado", {
          torneo_id: partido.torneo_id,
          estado: FAP_ESTADOS_TORNEO.FINALIZADO,
        });
        SocketService.emitirATodos("partido_actualizado", {
          torneo_id: partido.torneo_id,
          partido_id: partido.id,
          ronda: partido.ronda,
        });
      } catch (e) {
        console.warn("Error al emitir eventos de torneo finalizado:", e);
      }
    } else {
      const rondasSiguientes: Record<string, string> = {
        "16AVOS": "OCTAVOS",
        OCTAVOS: "CUARTOS",
        CUARTOS: "SEMIS",
        SEMIS: "FINAL",
      };
      const rondaSiguiente =
        rondasSiguientes[partido.ronda.toUpperCase().trim()];

      if (rondaSiguiente) {
        const { data: pact } = await supabaseAdmin
          .from("partidos")
          .select("id")
          .eq("torneo_id", partido.torneo_id)
          .eq("ronda", partido.ronda)
          .order("orden", { ascending: true });
        const { data: psig } = await supabaseAdmin
          .from("partidos")
          .select("id")
          .eq("torneo_id", partido.torneo_id)
          .eq("ronda", rondaSiguiente)
          .order("orden", { ascending: true });

        if (pact && psig) {
          const miIndice = pact.findIndex((p) => p.id === partido.id);
          const idxHijo = Math.floor(miIndice / 2);
          const partidoDestino = psig[idxHijo];

          if (partidoDestino) {
            const ranura = miIndice % 2 === 0 ? "equipo_a_id" : "equipo_b_id";
            await supabaseAdmin
              .from("partidos")
              .update({ [ranura]: ganadorId })
              .eq("id", partidoDestino.id);

            // Emitir avance de cuadro para que el frontend refresque el grid
            try {
              SocketService.emitirATodos("bracket_actualizado", {
                torneo_id: partido.torneo_id,
                ronda_actual: partido.ronda,
                ronda_siguiente: rondaSiguiente,
              });
            } catch (e) {
              console.warn("Error al emitir bracket_actualizado:", e);
            }
          }
        }
      }
    }

    // Si el partido finalizado es de zona (ej. "Zona A"), verificar avance interno y automático
    if (partido.ronda.toUpperCase().startsWith("ZONA")) {
      // 1. Avance interno para Zonas de 4 parejas (regla FAP de 4 partidos)
      const { data: thisGroupMatches } = await supabaseAdmin
        .from("partidos")
        .select(
          "id, ronda, ganador, equipo_a_id, equipo_b_id, orden, estado_partido",
        )
        .eq("torneo_id", partido.torneo_id)
        .eq("ronda", partido.ronda)
        .order("orden", { ascending: true });

      if (thisGroupMatches && thisGroupMatches.length === 4) {
        const p1 = thisGroupMatches.find((m) => m.orden === 1);
        const p2 = thisGroupMatches.find((m) => m.orden === 2);
        const p3 = thisGroupMatches.find((m) => m.orden === 3);
        const p4 = thisGroupMatches.find((m) => m.orden === 4);

        if (p1 && p2 && p3 && p4) {
          // Si los partidos 1 y 2 finalizaron pero los partidos 3 y 4 aún no tienen equipos asignados
          if (p1.ganador && p2.ganador && !p3.equipo_a_id && !p4.equipo_a_id) {
            const g1 = p1.ganador;
            const g2 = p2.ganador;
            const perdedor1 =
              p1.ganador === p1.equipo_a_id ? p1.equipo_b_id : p1.equipo_a_id;
            const perdedor2 =
              p2.ganador === p2.equipo_a_id ? p2.equipo_b_id : p2.equipo_a_id;

            if (g1 && g2 && perdedor1 && perdedor2) {
              // Asignar ganadores al Partido 3
              await supabaseAdmin
                .from("partidos")
                .update({
                  equipo_a_id: g1,
                  equipo_b_id: g2,
                  estado_partido: "Programado",
                })
                .eq("id", p3.id);

              // Asignar perdedores al Partido 4
              await supabaseAdmin
                .from("partidos")
                .update({
                  equipo_a_id: perdedor1,
                  equipo_b_id: perdedor2,
                  estado_partido: "Programado",
                })
                .eq("id", p4.id);
            }
          }
        }
      }

      // 2. Avance general a playoffs (cuando todos los partidos de todas las zonas terminen)
      const { data: allGroupMatches } = await supabaseAdmin
        .from("partidos")
        .select("id, ronda, ganador, equipo_a_id, equipo_b_id, set1_a, set1_b")
        .eq("torneo_id", partido.torneo_id)
        .ilike("ronda", "Zona %");

      const pendingCount =
        allGroupMatches?.filter((p) => p.ganador === null).length || 0;

      if (pendingCount === 0 && allGroupMatches && allGroupMatches.length > 0) {
        await avanzarJugadoresALlaves(partido.torneo_id, allGroupMatches);

        // Todos los partidos de zona terminaron → el cuadro principal ya está generado
        try {
          SocketService.emitirATodos("bracket_actualizado", {
            torneo_id: partido.torneo_id,
            fase: "llaves_principales_generadas",
          });
        } catch (e) {
          console.warn("Error al emitir bracket_actualizado (llaves):", e);
        }
      }
    }
  }

  static async actualizarEquiposPartido(
    partidoId: string,
    equipoAId: string | null,
    equipoBId: string | null,
    motivo: string,
    adminId: string,
  ) {
    // 1. Validar que el partido existe
    const { data: partido, error } = await supabaseAdmin
      .from("partidos")
      .select("id, torneo_id, ronda")
      .eq("id", partidoId)
      .single();

    if (error || !partido) throw new Error("Partido no encontrado");

    // 2. Actualizar los equipos del partido
    const { error: updateError } = await supabaseAdmin
      .from("partidos")
      .update({
        equipo_a_id: equipoAId,
        equipo_b_id: equipoBId,
        ganador: null,
        set1_a: null,
        set1_b: null,
        estado_partido: "Programado",
      })
      .eq("id", partidoId);

    if (updateError) throw new Error(updateError.message);

    // 3. Registrar en auditoría
    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "override_rival_partido",
      entidad_afectada: partido.torneo_id,
      detalles: {
        partido_id: partidoId,
        ronda: partido.ronda,
        equipo_a_id: equipoAId,
        equipo_b_id: equipoBId,
        motivo: motivo,
      },
    });
  }

  /**
   * Agrega o quita una pareja de la llave de campeonato y redistribuye
   * solo slots pendientes (no destructivo respecto a partidos ya jugados).
   * Empareja 1 vs último entre los equipos libres.
   */
  static async gestionarParejaLlave(
    torneoId: string,
    accion: "agregar" | "quitar",
    inscripcionId: string,
    motivo: string,
    adminId: string,
  ) {
    if (!motivo?.trim()) {
      throw new Error("El motivo es obligatorio para editar la llave.");
    }

    const { data: insc } = await supabaseAdmin
      .from("inscripciones")
      .select("id, estado_pago")
      .eq("id", inscripcionId)
      .eq("torneo_id", torneoId)
      .maybeSingle();

    if (!insc) {
      throw new Error("La inscripción no pertenece a este torneo.");
    }

    const PLAYOFF_ROUNDS = [
      "32AVOS",
      "16AVOS",
      "OCTAVOS",
      "CUARTOS",
      "SEMIS",
      "FINAL",
    ];

    const { data: playoffMatches, error } = await supabaseAdmin
      .from("partidos")
      .select("id, ronda, orden, equipo_a_id, equipo_b_id, ganador")
      .eq("torneo_id", torneoId)
      .in("ronda", PLAYOFF_ROUNDS)
      .order("orden", { ascending: true });

    if (error) throw new Error(error.message);
    if (!playoffMatches || playoffMatches.length === 0) {
      throw new Error(
        "No hay partidos de llave de campeonato. Generá el cuadro primero.",
      );
    }

    const counts: Record<string, number> = {};
    playoffMatches.forEach((m) => {
      counts[m.ronda] = (counts[m.ronda] || 0) + 1;
    });
    const primeraRonda = PLAYOFF_ROUNDS.find((r) => (counts[r] || 0) > 0);
    if (!primeraRonda) {
      throw new Error("No se pudo determinar la primera ronda de la llave.");
    }

    const firstRound = playoffMatches
      .filter((m) => m.ronda === primeraRonda)
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    const lockedTeamIds = new Set<string>();
    firstRound.forEach((m) => {
      if (m.ganador) {
        if (m.equipo_a_id) lockedTeamIds.add(m.equipo_a_id);
        if (m.equipo_b_id) lockedTeamIds.add(m.equipo_b_id);
      }
    });

    let freeTeamIds: string[] = [];
    firstRound.forEach((m) => {
      if (m.ganador) return;
      if (m.equipo_a_id && !lockedTeamIds.has(m.equipo_a_id)) {
        freeTeamIds.push(m.equipo_a_id);
      }
      if (m.equipo_b_id && !lockedTeamIds.has(m.equipo_b_id)) {
        freeTeamIds.push(m.equipo_b_id);
      }
    });
    freeTeamIds = [...new Set(freeTeamIds)];

    if (accion === "agregar") {
      if (
        lockedTeamIds.has(inscripcionId) ||
        freeTeamIds.includes(inscripcionId)
      ) {
        throw new Error("La pareja ya está en la llave de campeonato.");
      }
      const maxSlots = firstRound.length * 2;
      const ocupados = lockedTeamIds.size + freeTeamIds.length;
      if (ocupados >= maxSlots) {
        throw new Error(
          "La llave no tiene slots libres. Liberá un slot o ampliá el cuadro.",
        );
      }
      freeTeamIds.push(inscripcionId);
    } else {
      if (lockedTeamIds.has(inscripcionId)) {
        throw new Error(
          "No se puede quitar: la pareja ya disputó un partido con resultado en la llave.",
        );
      }
      if (!freeTeamIds.includes(inscripcionId)) {
        throw new Error("La pareja no está en un slot editable de la llave.");
      }
      freeTeamIds = freeTeamIds.filter((id) => id !== inscripcionId);
    }

    // Redistribuir solo partidos pendientes: pairing 1 vs último
    const pendingMatches = firstRound.filter((m) => !m.ganador);
    const slotsNeeded = pendingMatches.length;
    const cleanPaired: { a: string | null; b: string | null }[] = [];
    const used = new Set<string>();
    const ordered = [...freeTeamIds];
    let left = 0;
    let right = ordered.length - 1;
    while (left <= right && cleanPaired.length < slotsNeeded) {
      const a = ordered[left];
      const b = left === right ? null : ordered[right];
      if (a && !used.has(a)) {
        used.add(a);
        if (b && !used.has(b)) {
          used.add(b);
          cleanPaired.push({ a, b });
        } else {
          cleanPaired.push({ a, b: null });
        }
      }
      left += 1;
      right -= 1;
    }
    while (cleanPaired.length < slotsNeeded) {
      cleanPaired.push({ a: null, b: null });
    }

    for (let i = 0; i < pendingMatches.length; i++) {
      const match = pendingMatches[i];
      const slot = cleanPaired[i] || { a: null, b: null };
      const isBye = Boolean(slot.a) !== Boolean(slot.b);
      const ganadorBye = isBye ? slot.a || slot.b : null;

      const { error: updErr } = await supabaseAdmin
        .from("partidos")
        .update({
          equipo_a_id: slot.a,
          equipo_b_id: slot.b,
          ganador: ganadorBye,
          set1_a: ganadorBye ? 0 : null,
          set1_b: ganadorBye ? 0 : null,
          estado_partido: ganadorBye ? "Finalizado" : "Programado",
        })
        .eq("id", match.id);

      if (updErr) throw new Error(updErr.message);
    }

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion:
        accion === "agregar"
          ? "agregar_pareja_llave"
          : "quitar_pareja_llave",
      entidad_afectada: torneoId,
      detalles: {
        inscripcion_id: inscripcionId,
        primera_ronda: primeraRonda,
        equipos_libres: freeTeamIds,
        motivo,
      },
    });

    return {
      exito: true,
      mensaje:
        accion === "agregar"
          ? "Pareja agregada y llave redistribuida"
          : "Pareja quitada y llave redistribuida",
    };
  }

  static async guardarSiembraCustom(
    torneoId: string,
    matches: {
      id: string;
      equipo_a_id: string | null;
      equipo_b_id: string | null;
    }[],
    motivo: string,
    adminId: string,
  ) {
    // 1. Obtener todos los partidos de eliminatoria de este torneo
    const { data: allMatches, error: fetchErr } = await supabaseAdmin
      .from("partidos")
      .select("id, ronda, orden, ganador")
      .eq("torneo_id", torneoId)
      .not("ronda", "ilike", "Zona %"); // excluir fase de grupos

    if (fetchErr)
      throw new Error(`Error al obtener partidos: ${fetchErr.message}`);
    if (!allMatches || allMatches.length === 0) {
      throw new Error(
        "No hay partidos de eliminatorias cargados para este torneo.",
      );
    }

    // Determinar la primera ronda (la que tiene más partidos)
    const counts: Record<string, number> = {};
    allMatches.forEach((m) => {
      counts[m.ronda] = (counts[m.ronda] || 0) + 1;
    });

    const ROUNDS_ORDER = [
      "32AVOS",
      "16AVOS",
      "OCTAVOS",
      "CUARTOS",
      "SEMIS",
      "FINAL",
    ];
    const primeraRonda = ROUNDS_ORDER.find((r) => (counts[r] || 0) > 0);
    if (!primeraRonda) {
      throw new Error("No se pudo determinar la primera ronda del cuadro.");
    }

    // 2. Actualizar los partidos de la primera ronda
    for (const m of matches) {
      const dbMatch = allMatches.find((x) => x.id === m.id);
      if (!dbMatch) continue;

      const isBye = !m.equipo_a_id || !m.equipo_b_id;
      let ganador = null;
      let estado = "Programado";
      if (isBye) {
        ganador = m.equipo_a_id || m.equipo_b_id || null;
        if (ganador) {
          estado = FAP_ESTADOS_TORNEO.FINALIZADO;
        }
      }

      const { error: updateErr } = await supabaseAdmin
        .from("partidos")
        .update({
          equipo_a_id: m.equipo_a_id,
          equipo_b_id: m.equipo_b_id,
          ganador,
          estado_partido: estado,
          set1_a: isBye && ganador ? 0 : null,
          set1_b: isBye && ganador ? 0 : null,
        })
        .eq("id", m.id);

      if (updateErr)
        throw new Error(`Error al actualizar partido: ${updateErr.message}`);
    }

    // 3. Resetear todos los partidos de las rondas siguientes
    const subsequentRondas = ROUNDS_ORDER.filter(
      (r) => ROUNDS_ORDER.indexOf(r) > ROUNDS_ORDER.indexOf(primeraRonda),
    );

    if (subsequentRondas.length > 0) {
      const { error: resetErr } = await supabaseAdmin
        .from("partidos")
        .update({
          equipo_a_id: null,
          equipo_b_id: null,
          ganador: null,
          estado_partido: "Programado",
          set1_a: null,
          set1_b: null,
        })
        .eq("torneo_id", torneoId)
        .in("ronda", subsequentRondas);

      if (resetErr)
        throw new Error(
          `Error al resetear rondas siguientes: ${resetErr.message}`,
        );
    }

    // 4. Volver a propagar los ganadores de los BYEs a la siguiente ronda
    const { data: updatedFirstRoundMatches } = await supabaseAdmin
      .from("partidos")
      .select("id, ronda, orden, ganador")
      .eq("torneo_id", torneoId)
      .eq("ronda", primeraRonda)
      .order("orden", { ascending: true });

    if (updatedFirstRoundMatches) {
      const rondasSiguientes: Record<string, string> = {
        "32AVOS": "16AVOS",
        "16AVOS": "OCTAVOS",
        OCTAVOS: "CUARTOS",
        CUARTOS: "SEMIS",
        SEMIS: "FINAL",
      };

      const rondaSiguiente =
        rondasSiguientes[primeraRonda.toUpperCase().trim()];
      if (rondaSiguiente) {
        const { data: psig } = await supabaseAdmin
          .from("partidos")
          .select("id")
          .eq("torneo_id", torneoId)
          .eq("ronda", rondaSiguiente)
          .order("orden", { ascending: true });

        if (psig) {
          for (const match of updatedFirstRoundMatches) {
            if (match.ganador) {
              const miIndice = updatedFirstRoundMatches.findIndex(
                (p) => p.id === match.id,
              );
              const idxHijo = Math.floor(miIndice / 2);
              const partidoDestino = psig[idxHijo];

              if (partidoDestino) {
                const ranura =
                  miIndice % 2 === 0 ? "equipo_a_id" : "equipo_b_id";
                await supabaseAdmin
                  .from("partidos")
                  .update({ [ranura]: match.ganador })
                  .eq("id", partidoDestino.id);
              }
            }
          }
        }
      }
    }

    // 5. Registrar en auditoría
    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "guardar_siembra_custom",
      entidad_afectada: torneoId,
      detalles: {
        motivo: motivo,
      },
    });
  }

  static async obtenerSedes(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("torneo_sedes")
      .select("club_id, clubes(*)")
      .eq("torneo_id", torneoId);
    if (error) throw new Error(error.message);
    return (data || []).map((ts: any) => ts.clubes).filter(Boolean);
  }

  static async guardarSedes(torneoId: string, clubIds: string[]) {
    await supabaseAdmin.from("torneo_sedes").delete().eq("torneo_id", torneoId);

    if (clubIds && clubIds.length > 0) {
      const inserts = clubIds.map((cid) => ({
        torneo_id: torneoId,
        club_id: cid,
      }));
      const { error } = await supabaseAdmin
        .from("torneo_sedes")
        .insert(inserts);
      if (error) throw new Error(error.message);
    }
    return true;
  }

  static async obtenerCanchasDisponibilidad(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("torneo_canchas_disponibilidad")
      .select("*, canchas(*), clubes(*)")
      .eq("torneo_id", torneoId)
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  static async guardarCanchasDisponibilidad(
    torneoId: string,
    disponibilidad: any[],
  ) {
    await supabaseAdmin
      .from("torneo_canchas_disponibilidad")
      .delete()
      .eq("torneo_id", torneoId);

    if (disponibilidad && disponibilidad.length > 0) {
      const inserts = disponibilidad.map((d) => ({
        torneo_id: torneoId,
        club_id: d.club_id,
        cancha_id: d.cancha_id,
        fecha: d.fecha,
        hora_inicio: d.hora_inicio,
        hora_fin: d.hora_fin || null,
        categoria: d.categoria?.trim() ? d.categoria.trim() : null,
      }));
      const { error } = await supabaseAdmin
        .from("torneo_canchas_disponibilidad")
        .insert(inserts);
      if (error) throw new Error(error.message);
    }
    return true;
  }

  static async actualizarPartido(
    partidoId: string,
    payload: Record<string, any>,
  ) {
    const { error } = await supabaseAdmin
      .from("partidos")
      .update(payload)
      .eq("id", partidoId);

    if (error) throw new Error(error.message);
    return true;
  }
}

async function avanzarJugadoresALlaves(torneoId: string, groupMatches: any[]) {
  // 1. Obtener grupos y sus integrantes
  const { data: grupos } = await supabaseAdmin
    .from("grupos")
    .select("id, nombre_grupo, grupo_parejas(inscripcion_id)")
    .eq("torneo_id", torneoId)
    .order("nombre_grupo");

  if (!grupos) return;

  // 2. Calcular tabla de posiciones de cada grupo
  const standingsByGroup: Record<
    string,
    { id: string; points: number; diffSets: number }[]
  > = {};

  for (const g of grupos) {
    const parejas = g.grupo_parejas || [];
    const stats = parejas.map((p: any) => {
      let points = 0;
      let diffSets = 0;
      let diffGames = 0;
      let gamesAFavor = 0;
      let gamesEnContra = 0;

      groupMatches.forEach((m) => {
        if (m.ronda === g.nombre_grupo && m.ganador) {
          if (m.equipo_a_id === p.inscripcion_id) {
            const setsWon = Number(m.set1_a || 0);
            const setsLost = Number(m.set1_b || 0);
            diffSets += setsWon - setsLost;
            diffGames += setsWon - setsLost;
            gamesAFavor += setsWon;
            gamesEnContra += setsLost;
            if (m.ganador === p.inscripcion_id) {
              points += 2;
            } else {
              points += 1;
            }
          } else if (m.equipo_b_id === p.inscripcion_id) {
            const setsWon = Number(m.set1_b || 0);
            const setsLost = Number(m.set1_a || 0);
            diffSets += setsWon - setsLost;
            diffGames += setsWon - setsLost;
            gamesAFavor += setsWon;
            gamesEnContra += setsLost;
            if (m.ganador === p.inscripcion_id) {
              points += 2;
            } else {
              points += 1;
            }
          }
        }
      });
      return {
        id: p.inscripcion_id,
        points,
        diffSets,
        diffGames,
        gamesAFavor,
        gamesEnContra,
      };
    });

    // Group and sort using FAP tie-breaker rules
    const groupsMap: Record<number, any[]> = {};
    stats.forEach((team) => {
      const pts = team.points;
      if (!groupsMap[pts]) groupsMap[pts] = [];
      groupsMap[pts].push(team);
    });

    const sortedPoints = Object.keys(groupsMap)
      .map(Number)
      .sort((a, b) => b - a);

    const sortedStats: any[] = [];

    for (const pts of sortedPoints) {
      const tiedTeams = groupsMap[pts];
      if (tiedTeams.length === 2) {
        // Desempate Directo
        const a = tiedTeams[0];
        const b = tiedTeams[1];
        const partidoDirecto = groupMatches.find(
          (m) =>
            m.ronda === g.nombre_grupo &&
            m.ganador &&
            ((m.equipo_a_id === a.id && m.equipo_b_id === b.id) ||
              (m.equipo_a_id === b.id && m.equipo_b_id === a.id)),
        );
        if (partidoDirecto && partidoDirecto.ganador) {
          if (partidoDirecto.ganador === a.id) {
            sortedStats.push(a, b);
          } else {
            sortedStats.push(b, a);
          }
        } else {
          sortedStats.push(a, b);
        }
      } else if (tiedTeams.length >= 3) {
        // Triple Empate
        tiedTeams.sort((a, b) => {
          if (a.diffSets !== b.diffSets) return b.diffSets - a.diffSets;
          if (a.diffGames !== b.diffGames) return b.diffGames - a.diffGames;
          if (a.gamesAFavor !== b.gamesAFavor)
            return b.gamesAFavor - a.gamesAFavor;
          if (a.gamesEnContra !== b.gamesEnContra)
            return a.gamesEnContra - b.gamesEnContra;
          return 0;
        });
        sortedStats.push(...tiedTeams);
      } else {
        sortedStats.push(...tiedTeams);
      }
    }
    standingsByGroup[g.nombre_grupo] = sortedStats;
  }

  // 3. Obtener nombres de zonas ordenadas (Zona A, Zona B...)
  const groupNames = Object.keys(standingsByGroup).sort();
  const n = groupNames.length;

  if (n < 1) return;

  // Determinar la cantidad total de parejas clasificadas a playoffs
  const getPlayoffSize = (zonasCount: number): number => {
    if (zonasCount <= 1) return 2;
    if (zonasCount === 2 || zonasCount === 3) return 4;
    if (zonasCount >= 4 && zonasCount <= 6) return 8;
    if (zonasCount >= 7 && zonasCount <= 12) return 16;
    return 32;
  };

  const playoffSize = getPlayoffSize(n);
  const roundName =
    playoffSize === 4
      ? "SEMIS"
      : playoffSize === 8
        ? "CUARTOS"
        : playoffSize === 16
          ? "OCTAVOS"
          : "FINAL";

  // 4. Recopilar y ordenar clasificados
  const ganadores = groupNames
    .map((name) => standingsByGroup[name]?.[0])
    .filter(Boolean);
  const segundos = groupNames
    .map((name) => standingsByGroup[name]?.[1])
    .filter(Boolean);

  const compararEquipos = (a: any, b: any) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.diffSets !== b.diffSets) return b.diffSets - a.diffSets;
    if (a.diffGames !== b.diffGames) return b.diffGames - a.diffGames;
    if (a.gamesAFavor !== b.gamesAFavor) return b.gamesAFavor - a.gamesAFavor;
    return a.gamesEnContra - b.gamesEnContra;
  };

  ganadores.sort(compararEquipos);
  segundos.sort(compararEquipos);

  const clasificados = [...ganadores];
  const spotsRestantes = playoffSize - clasificados.length;
  if (spotsRestantes > 0) {
    clasificados.push(...segundos.slice(0, spotsRestantes));
  }

  // 5. Asignar los clasificados a los partidos de playoffs correspondientes
  const { data: playoffMatches } = await supabaseAdmin
    .from("partidos")
    .select("id")
    .eq("torneo_id", torneoId)
    .eq("ronda", roundName)
    .order("orden", { ascending: true });

  if (playoffMatches && playoffMatches.length >= playoffSize / 2) {
    for (let k = 0; k < playoffSize / 2; k++) {
      const teamA = clasificados[k]?.id;
      const teamB = clasificados[clasificados.length - 1 - k]?.id;

      if (teamA && teamB) {
        await supabaseAdmin
          .from("partidos")
          .update({
            equipo_a_id: teamA,
            equipo_b_id: teamB,
            estado_partido: "Programado",
          })
          .eq("id", playoffMatches[k].id);
      }
    }
  }
}
