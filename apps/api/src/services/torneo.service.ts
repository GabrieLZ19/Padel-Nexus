import { supabaseAdmin } from "../config/supabase";
import {
  FAP_ESTADOS_PAGO,
  FAP_ESTADOS_TORNEO,
  FAP_REGLAS,
} from "../constants/fap";

export interface FiltrosTorneo {
  search?: string;
  estado?: string;
}

export interface TorneoPayload {
  nombre: string;
  subtitulo?: string;
  club_id: string;
  fecha: string;
  estado: string;
  cupos_maximos: number;
  nivel: string;
  categoria: string;
  modalidad: string;
  precio_inscripcion: number;
  formato: string;
  premios?: { uno?: string; dos?: string; tres?: string };
}

export class TorneoService {
  static async listarTorneos(
    page?: number,
    limit: number = 10,
    filtros?: FiltrosTorneo,
  ) {
    let query = supabaseAdmin
      .from("torneos")
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`, {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (filtros?.search) query = query.ilike("nombre", `%${filtros.search}%`);

    if (filtros?.estado) {
      const estados = filtros.estado
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (estados.length === 1) query = query.eq("estado", estados[0]);
      else if (estados.length > 1) query = query.in("estado", estados);
    }

    type DbTorneo = Record<string, any> & {
      cupos_actuales?: number;
      cupos_maximos?: number;
    };

    if (page !== undefined) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const formatted = ((data as DbTorneo[]) || []).map((t) => ({
        ...t,
        cupos_actuales: t.cupos_actuales || 0,
        cupos_maximos: t.cupos_maximos || 0,
      }));
      return { data: formatted, total: count || 0, paginated: true };
    }

    const { data, error } = await query.limit(limit);
    if (error) throw new Error(error.message);

    const formatted = ((data as DbTorneo[]) || []).map((t) => ({
      ...t,
      cupos_actuales: t.cupos_actuales || 0,
      cupos_maximos: t.cupos_maximos || 0,
    }));
    return { data: formatted, paginated: false };
  }

  static async obtenerPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("torneos")
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`)
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("Torneo no encontrado.");
    return data;
  }

  static async crearTorneo(datos: TorneoPayload) {
    const { data: torneo, error: torneoError } = await supabaseAdmin
      .from("torneos")
      .insert([
        {
          nombre: datos.nombre,
          subtitulo: datos.subtitulo,
          club_id: datos.club_id,
          fecha: datos.fecha,
          estado: datos.estado,
          cupos_maximos: datos.cupos_maximos,
          cupos_actuales: 0,
          nivel: datos.nivel,
          categoria: datos.categoria,
          modalidad: datos.modalidad,
          precio_inscripcion: datos.precio_inscripcion,
          formato: datos.formato,
          premio_1: datos.premios?.uno,
          premio_2: datos.premios?.dos,
          premio_3: datos.premios?.tres,
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

  static async actualizarTorneo(id: string, datos: any) {
    const updateData: Record<string, any> = { ...datos };
    if (datos.premios) {
      updateData.premio_1 = datos.premios.uno;
      updateData.premio_2 = datos.premios.dos;
      updateData.premio_3 = datos.premios.tres;
      delete updateData.premios;
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
      .select("*")
      .eq("torneo_id", id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async obtenerPartidosFormateados(id: string) {
    const { data: partidos, error: partidosError } = await supabaseAdmin
      .from("partidos")
      .select("*")
      .eq("torneo_id", id)
      .order("orden", { ascending: true });

    if (partidosError) throw new Error(partidosError.message);

    const { data: inscripciones, error: insError } = await supabaseAdmin
      .from("inscripciones")
      .select("id, jugador1_nombre, jugador2_nombre")
      .eq("torneo_id", id);

    if (insError) throw new Error(insError.message);

    const insMap = new Map<
      string,
      { jugador1_nombre: string | null; jugador2_nombre: string | null }
    >();
    (inscripciones || []).forEach((ins) => insMap.set(ins.id, ins));

    return (partidos || []).map((p) => {
      const equipoA = p.equipo_a_id ? insMap.get(p.equipo_a_id) : null;
      const equipoB = p.equipo_b_id ? insMap.get(p.equipo_b_id) : null;

      return {
        ...p,
        equipo_a_j1: equipoA ? equipoA.jugador1_nombre : null,
        equipo_a_j2: equipoA ? equipoA.jugador2_nombre : null,
        equipo_b_j1: equipoB ? equipoB.jugador1_nombre : null,
        equipo_b_j2: equipoB ? equipoB.jugador2_nombre : null,
      };
    });
  }

  static async generarCuadroEliminatoria(id: string) {
    const { data: torneo, error: torneoError } = await supabaseAdmin
      .from("torneos")
      .select("formato, cupos_maximos")
      .eq("id", id)
      .single();

    if (torneoError || !torneo) throw new Error("Torneo no encontrado");

    const { data: inscripciones, error: inscError } = await supabaseAdmin
      .from("inscripciones")
      .select("id, usuario_id")
      .eq("torneo_id", id)
      .eq("estado_pago", FAP_ESTADOS_PAGO.CONFIRMADO);

    if (
      inscError ||
      !inscripciones ||
      inscripciones.length < FAP_REGLAS.CUPOS_MINIMOS_LLUAVES
    ) {
      throw new Error("Se necesitan al menos 4 inscritos confirmados.");
    }

    await supabaseAdmin.from("partidos").delete().eq("torneo_id", id);

    const shuffled = [...inscripciones].sort(() => 0.5 - Math.random());
    const partidos: Record<string, any>[] = [];
    let orden = 1;

    if (torneo.formato === "Eliminatoria Directa") {
      const cupos = torneo.cupos_maximos || 16;
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

      for (let i = startIndex; i < roundsConfig.length; i++) {
        const round = roundsConfig[i];
        for (let j = 0; j < round.matches; j++) {
          let equipo_a_id = null;
          let equipo_b_id = null;

          if (i === startIndex) {
            equipo_a_id = shuffled[j * 2]?.id || null;
            equipo_b_id = shuffled[j * 2 + 1]?.id || null;
          }

          partidos.push({
            torneo_id: id,
            equipo_a_id,
            equipo_b_id,
            ronda: round.name,
            orden: orden++,
            estado_partido: "Programado",
          });
        }
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("partidos")
      .insert(partidos);
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin
      .from("torneos")
      .update({ estado: FAP_ESTADOS_TORNEO.EN_CURSO })
      .eq("id", id);
    return partidos.length;
  }

  static async procesarResultadoYAvance(
    partidoId: string,
    ganadorId: string,
    set1A: number,
    set1B: number,
  ) {
    const { data: partido, error: updateError } = await supabaseAdmin
      .from("partidos")
      .update({
        ganador: ganadorId,
        set1_a: set1A,
        set1_b: set1B,
        estado_partido: FAP_ESTADOS_TORNEO.FINALIZADO,
      })
      .eq("id", partidoId)
      .select("id, torneo_id, ronda, orden, equipo_a_id, equipo_b_id")
      .single();

    if (updateError || !partido)
      throw new Error("Error al cargar el marcador.");

    const perdedorId =
      ganadorId === partido.equipo_a_id
        ? partido.equipo_b_id
        : partido.equipo_a_id;

    const { data: torneoInfo } = await supabaseAdmin
      .from("torneos")
      .select("nivel, categoria, modalidad")
      .eq("id", partido.torneo_id)
      .single();

    if (torneoInfo) {
      const TABLA_PUNTOS: Record<
        string,
        { ganador: number; perdedor: number }
      > = {
        "16AVOS": { ganador: 45, perdedor: 10 },
        OCTAVOS: { ganador: 90, perdedor: 45 },
        CUARTOS: { ganador: 180, perdedor: 90 },
        SEMIS: { ganador: 360, perdedor: 180 },
        FINAL: { ganador: 1000, perdedor: 600 },
      };

      const rondaNormalizada = partido.ronda.toUpperCase().trim();
      const puntosRonda = TABLA_PUNTOS[rondaNormalizada];

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
            .select("puntos, pj, pg")
            .eq("usuario_id", uid)
            .eq("categoria", torneoInfo.nivel)
            .maybeSingle();

          const pAnt = rank?.puntos || 0;
          const pjAnt = rank?.pj || 0;
          const pgAnt = rank?.pg || 0;

          await supabaseAdmin.from("rankings").upsert(
            {
              usuario_id: uid,
              categoria: torneoInfo.nivel,
              rama: torneoInfo.categoria,
              puntos: pAnt + puntos,
              pj: pjAnt + 1,
              pg: esGanador ? pgAnt + 1 : pgAnt,
            },
            { onConflict: "id" }, // Ajustado a id por consistencia estructural
          );

          if (puntos > 0) {
            await supabaseAdmin.from("historial_ranking").insert([
              {
                usuario_id: uid,
                torneo_id: partido.torneo_id,
                puntos_anteriores: pAnt,
                puntos_nuevos: pAnt + puntos,
              },
            ]);
          }
        }
      };

      await otorgarPuntosAInscripcion(
        perdedorId,
        puntosRonda?.perdedor || 0,
        false,
      );
      await otorgarPuntosAInscripcion(
        ganadorId,
        puntosRonda?.ganador || 0,
        true,
      );
    }

    if (partido.ronda.toUpperCase() === "FINAL") {
      await supabaseAdmin
        .from("torneos")
        .update({ estado: FAP_ESTADOS_TORNEO.FINALIZADO })
        .eq("id", partido.torneo_id);
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
          }
        }
      }
    }
  }
}
