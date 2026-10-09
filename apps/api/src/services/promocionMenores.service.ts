import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_PAGO, FAP_ESTADOS_TORNEO } from "../constants/fap";
import { getFapBracketForPairCount } from "../utils/fapBracketMatrices";
import type { FapBracketMatch } from "../utils/fapBracketTypes";
import {
  byesDeRonda,
  esCategoriaMenoresSuperior,
  estadoTrasAsignar,
  indiceDestinoAvance,
  insercionEnBye,
  limpiarSlot,
  normalizarRonda,
  ORDEN_RONDAS_LLAVE,
  partidoConResultadoReal,
  puedeOcuparSlot,
  primeraRondaDe,
  rangoMenores,
  retiroConBye,
  type LadoLlave,
  type ParchePartido,
  type PartidoEditable,
} from "../utils/edicionLlaveMenores";

type FilaPartido = {
  id: string;
  ronda: string;
  orden: number;
  equipo_a_id: string | null;
  equipo_b_id: string | null;
  ganador: string | null;
  set1_a: number | null;
  set1_b: number | null;
};

type TorneoBreve = {
  id: string;
  nombre: string;
  categoria: string | null;
  estado: string | null;
  grupo_id: string | null;
};

function aEditable(fila: FilaPartido): PartidoEditable {
  return {
    id: fila.id,
    ronda: fila.ronda,
    orden: fila.orden,
    equipoAId: fila.equipo_a_id,
    equipoBId: fila.equipo_b_id,
    ganador: fila.ganador,
    set1A: fila.set1_a,
    set1B: fila.set1_b,
  };
}

function nombrePareja(
  j1: string | null | undefined,
  j2: string | null | undefined,
): string {
  const a = (j1 || "").trim();
  const b = (j2 || "").trim();
  if (a && b && b !== "-") return `${a} / ${b}`;
  return a || "Pareja";
}

async function partidosDeLlave(torneoId: string): Promise<FilaPartido[]> {
  const { data, error } = await supabaseAdmin
    .from("partidos")
    .select("id, ronda, orden, equipo_a_id, equipo_b_id, ganador, set1_a, set1_b")
    .eq("torneo_id", torneoId);
  if (error) throw new Error(error.message);
  return ((data || []) as FilaPartido[]).filter((partido) =>
    (ORDEN_RONDAS_LLAVE as readonly string[]).includes(
      normalizarRonda(partido.ronda),
    ),
  );
}

async function aplicarParche(partidoId: string, parche: ParchePartido) {
  const { error } = await supabaseAdmin
    .from("partidos")
    .update({
      equipo_a_id: parche.equipoAId,
      equipo_b_id: parche.equipoBId,
      ganador: parche.ganador,
      set1_a: parche.set1A,
      set1_b: parche.set1B,
      estado_partido: parche.estado,
    })
    .eq("id", partidoId);
  if (error) throw new Error(error.message);
}

function ladoEnMatriz(
  matrix: readonly FapBracketMatch[] | null,
  matchNo: number,
): { ordenDestino: number; lado: LadoLlave } | null {
  const spec = matrix?.find((match) => match.matchNo === matchNo);
  if (!spec?.winnerTo) return null;
  const destino = matrix?.find((match) => match.matchNo === spec.winnerTo);
  const ref = `W${matchNo}`;
  const lado: LadoLlave = destino?.b === ref ? "b" : "a";
  return { ordenDestino: spec.winnerTo, lado };
}

async function destinoDeAvance(
  torneoId: string,
  partido: PartidoEditable,
  mismaRonda: PartidoEditable[],
): Promise<{ id: string; lado: LadoLlave } | null> {
  const { count } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId)
    .eq("estado_pago", FAP_ESTADOS_PAGO.CONFIRMADO);
  const matrix = getFapBracketForPairCount(count ?? 0);
  const porMatriz = ladoEnMatriz(matrix, partido.orden);
  if (porMatriz) {
    const { data } = await supabaseAdmin
      .from("partidos")
      .select("id")
      .eq("torneo_id", torneoId)
      .eq("orden", porMatriz.ordenDestino)
      .maybeSingle();
    if (!data?.id) return null;
    return { id: data.id, lado: porMatriz.lado };
  }

  const ordenados = [...mismaRonda].sort((a, b) => a.orden - b.orden);
  const indice = ordenados.findIndex((item) => item.id === partido.id);
  if (indice < 0) return null;
  const { indiceHijo, lado } = indiceDestinoAvance(indice);
  const rondaNormalizada = normalizarRonda(partido.ronda);
  const indiceActual = ORDEN_RONDAS_LLAVE.findIndex(
    (ronda) => ronda === rondaNormalizada,
  );
  if (indiceActual < 0) return null;
  const rondaSiguiente = ORDEN_RONDAS_LLAVE[indiceActual + 1];
  if (!rondaSiguiente) return null;
  const { data: siguientes } = await supabaseAdmin
    .from("partidos")
    .select("id, orden")
    .eq("torneo_id", torneoId)
    .eq("ronda", rondaSiguiente)
    .order("orden", { ascending: true });
  const destino = (siguientes || [])[indiceHijo];
  if (!destino) return null;
  return { id: destino.id, lado };
}

async function escribirLadoSiLibre(
  partidoId: string,
  lado: LadoLlave,
  inscripcionId: string | null,
  reemplazable: string | null,
) {
  const { data, error } = await supabaseAdmin
    .from("partidos")
    .select("id, equipo_a_id, equipo_b_id, ganador, set1_a, set1_b, ronda, orden")
    .eq("id", partidoId)
    .single();
  if (error || !data) return;
  const fila = data as FilaPartido;
  const actual = lado === "a" ? fila.equipo_a_id : fila.equipo_b_id;
  if (!puedeOcuparSlot(actual, reemplazable) && inscripcionId !== actual) return;
  const equipoAId = lado === "a" ? inscripcionId : fila.equipo_a_id;
  const equipoBId = lado === "b" ? inscripcionId : fila.equipo_b_id;
  const ganador =
    fila.ganador && fila.ganador === reemplazable ? null : fila.ganador;
  await supabaseAdmin
    .from("partidos")
    .update({
      equipo_a_id: equipoAId,
      equipo_b_id: equipoBId,
      ganador,
      set1_a: ganador ? fila.set1_a : null,
      set1_b: ganador ? fila.set1_b : null,
      estado_partido: ganador ? "Finalizado" : "Programado",
    })
    .eq("id", partidoId);
}

export class PromocionMenoresService {
  /** Cambia los lados de un partido sin borrar un resultado ya jugado. Un solo lado queda como bye. */
  static async editarLados(
    torneoId: string,
    partido: PartidoEditable,
    equipoAId: string | null,
    equipoBId: string | null,
  ): Promise<ParchePartido> {
    const parche = estadoTrasAsignar(partido, equipoAId, equipoBId);
    const llave = (await partidosDeLlave(torneoId)).map(aEditable);
    const misma = llave.filter(
      (item) => normalizarRonda(item.ronda) === normalizarRonda(partido.ronda),
    );
    const avance = await destinoDeAvance(torneoId, partido, misma);
    if (avance) {
      if (parche.ganador) {
        const saliente =
          partido.equipoAId !== parche.equipoAId
            ? partido.equipoAId
            : partido.equipoBId !== parche.equipoBId
              ? partido.equipoBId
              : partido.ganador;
        await escribirLadoSiLibre(
          avance.id,
          avance.lado,
          parche.ganador,
          saliente,
        );
      } else if (partido.ganador) {
        await escribirLadoSiLibre(avance.id, avance.lado, null, partido.ganador);
      }
    }
    return parche;
  }

  static async opciones(torneoId: string) {
    const { data: torneo, error } = await supabaseAdmin
      .from("torneos")
      .select("id, nombre, categoria, estado, grupo_id")
      .eq("id", torneoId)
      .single();
    if (error || !torneo) throw new Error("Torneo no encontrado");
    const origen = torneo as TorneoBreve;
    const categoria = origen.categoria || "";
    if (rangoMenores(categoria) == null) {
      return {
        habilitado: false,
        motivo: "El pase entre categorías es solo para menores.",
        parejas: [],
        destinos: [],
      };
    }
    if (!origen.grupo_id) {
      return {
        habilitado: false,
        motivo:
          "Agrupá las categorías del evento para pasar una pareja a la superior.",
        parejas: [],
        destinos: [],
      };
    }

    const llave = await partidosDeLlave(torneoId);
    const primera = primeraRondaDe(llave.map((partido) => partido.ronda));
    const editables = llave.map(aEditable);
    const dePrimera = primera
      ? editables.filter(
          (partido) =>
            normalizarRonda(partido.ronda) === primera &&
            !partidoConResultadoReal(partido),
        )
      : [];

    const ids = [
      ...new Set(
        dePrimera.flatMap((partido) =>
          [partido.equipoAId, partido.equipoBId].filter(Boolean),
        ),
      ),
    ] as string[];
    const nombres = new Map<string, string>();
    if (ids.length > 0) {
      const { data: inscritas } = await supabaseAdmin
        .from("inscripciones")
        .select("id, jugador1_nombre, jugador2_nombre")
        .in("id", ids);
      for (const row of inscritas || []) {
        nombres.set(
          row.id,
          nombrePareja(row.jugador1_nombre, row.jugador2_nombre),
        );
      }
    }

    const parejas = dePrimera.flatMap((partido) => {
      const lados: { id: string; lado: LadoLlave }[] = [];
      if (partido.equipoAId) lados.push({ id: partido.equipoAId, lado: "a" });
      if (partido.equipoBId) lados.push({ id: partido.equipoBId, lado: "b" });
      return lados.map((lado) => ({
        inscripcionId: lado.id,
        nombre: nombres.get(lado.id) || "Pareja",
        partidoId: partido.id,
        lado: lado.lado,
        ronda: normalizarRonda(partido.ronda),
      }));
    });

    const { data: hermanos } = await supabaseAdmin
      .from("torneos")
      .select("id, nombre, categoria, estado, grupo_id")
      .eq("grupo_id", origen.grupo_id)
      .neq("id", torneoId);
    const destinos = [];
    for (const hermano of (hermanos || []) as TorneoBreve[]) {
      if (hermano.estado === FAP_ESTADOS_TORNEO.FINALIZADO) continue;
      if (!esCategoriaMenoresSuperior(categoria, hermano.categoria || "")) {
        continue;
      }
      const llaveDestino = (await partidosDeLlave(hermano.id)).map(aEditable);
      const primeraDestino = primeraRondaDe(
        llaveDestino.map((partido) => partido.ronda),
      );
      const byes = primeraDestino
        ? byesDeRonda(llaveDestino, primeraDestino)
        : [];
      const rivalIds = byes.map((bye) => bye.rivalId);
      const nombresRival = new Map<string, string>();
      if (rivalIds.length > 0) {
        const { data: rivales } = await supabaseAdmin
          .from("inscripciones")
          .select("id, jugador1_nombre, jugador2_nombre")
          .in("id", rivalIds);
        for (const row of rivales || []) {
          nombresRival.set(
            row.id,
            nombrePareja(row.jugador1_nombre, row.jugador2_nombre),
          );
        }
      }
      destinos.push({
        id: hermano.id,
        nombre: hermano.nombre,
        categoria: hermano.categoria,
        byes: byes.map((bye) => ({
          partidoId: bye.partidoId,
          lado: bye.lado,
          rival: nombresRival.get(bye.rivalId) || "Rival",
          ronda: primeraDestino,
        })),
      });
    }

    return {
      habilitado: destinos.length > 0 && parejas.length > 0,
      motivo:
        destinos.length === 0
          ? "No hay una categoría superior de menores en este grupo."
          : parejas.length === 0
            ? "No hay parejas en la primera ronda de la llave para pasar."
            : null,
      parejas,
      destinos,
    };
  }

  static async promover(input: {
    torneoOrigenId: string;
    inscripcionId: string;
    torneoDestinoId: string;
    partidoDestinoId: string | null;
    ladoDestino: LadoLlave | null;
    motivo: string;
    adminId: string;
  }) {
    const motivo = input.motivo.trim();
    if (!motivo) throw new Error("El motivo es obligatorio.");

    const opciones = await this.opciones(input.torneoOrigenId);
    const pareja = opciones.parejas.find(
      (item) => item.inscripcionId === input.inscripcionId,
    );
    if (!pareja) {
      throw new Error(
        "Esa pareja no está en un partido editable de la primera ronda.",
      );
    }
    const destino = opciones.destinos.find(
      (item) => item.id === input.torneoDestinoId,
    );
    if (!destino) {
      throw new Error("La categoría destino no es superior de este grupo.");
    }

    const { data: origenIns, error: insError } = await supabaseAdmin
      .from("inscripciones")
      .select(
        "id, torneo_id, usuario_id, usuario2_id, jugador1_nombre, jugador2_nombre, monto, letra_prioridad",
      )
      .eq("id", input.inscripcionId)
      .eq("torneo_id", input.torneoOrigenId)
      .single();
    if (insError || !origenIns) {
      throw new Error("La inscripción no pertenece a esta categoría.");
    }

    let inscripcionDestinoId: string | null = null;
    const { data: yaInscripta } = await supabaseAdmin
      .from("inscripciones")
      .select("id")
      .eq("torneo_id", input.torneoDestinoId)
      .eq("usuario_id", origenIns.usuario_id);
    const misma = (yaInscripta || []).find((row) => row.id);
    if (misma && origenIns.usuario2_id) {
      const { data: conPareja } = await supabaseAdmin
        .from("inscripciones")
        .select("id")
        .eq("torneo_id", input.torneoDestinoId)
        .eq("usuario_id", origenIns.usuario_id)
        .eq("usuario2_id", origenIns.usuario2_id)
        .maybeSingle();
      inscripcionDestinoId = conPareja?.id || null;
    } else if (misma && !origenIns.usuario2_id) {
      inscripcionDestinoId = misma.id;
    }

    if (!inscripcionDestinoId) {
      const { data: creada, error: crearError } = await supabaseAdmin
        .from("inscripciones")
        .insert({
          torneo_id: input.torneoDestinoId,
          usuario_id: origenIns.usuario_id,
          usuario2_id: origenIns.usuario2_id,
          jugador1_nombre: origenIns.jugador1_nombre,
          jugador2_nombre: origenIns.jugador2_nombre,
          monto: 0,
          estado_pago: FAP_ESTADOS_PAGO.CONFIRMADO,
          tipo: "Inscripción torneo",
          letra_prioridad: origenIns.letra_prioridad,
        })
        .select("id")
        .single();
      if (crearError || !creada) {
        throw new Error(crearError?.message || "No se pudo inscribir en la categoría superior.");
      }
      inscripcionDestinoId = creada.id;
    }

    const llaveDestino = (await partidosDeLlave(input.torneoDestinoId)).map(
      aEditable,
    );
    const primeraDestino = primeraRondaDe(
      llaveDestino.map((partido) => partido.ronda),
    );
    if (!primeraDestino) {
      throw new Error("La categoría superior no tiene llave de campeonato.");
    }
    if (!inscripcionDestinoId) {
      throw new Error("No se pudo inscribir la pareja en la categoría superior.");
    }

    let modo: "bye" | "partido-nuevo" = "bye";
    if (input.partidoDestinoId) {
      const partido = llaveDestino.find(
        (item) => item.id === input.partidoDestinoId,
      );
      if (!partido || !input.ladoDestino) {
        throw new Error("Elegí un bye de la categoría superior.");
      }
      const parche = insercionEnBye(
        partido,
        input.ladoDestino,
        inscripcionDestinoId,
      );
      await aplicarParche(partido.id, parche);
      if (!parche.ganador && partido.ganador) {
        const avance = await destinoDeAvance(
          input.torneoDestinoId,
          partido,
          llaveDestino.filter(
            (item) => normalizarRonda(item.ronda) === normalizarRonda(partido.ronda),
          ),
        );
        if (avance) {
          await escribirLadoSiLibre(
            avance.id,
            avance.lado,
            null,
            partido.ganador,
          );
        }
      }
    } else {
      modo = "partido-nuevo";
      const deRonda = llaveDestino.filter(
        (partido) => normalizarRonda(partido.ronda) === primeraDestino,
      );
      const orden =
        deRonda.reduce((max, partido) => Math.max(max, partido.orden), 0) + 1;
      const { error: insertError } = await supabaseAdmin.from("partidos").insert({
        torneo_id: input.torneoDestinoId,
        ronda: primeraDestino,
        orden,
        equipo_a_id: inscripcionDestinoId,
        equipo_b_id: null,
        ganador: inscripcionDestinoId,
        set1_a: 0,
        set1_b: 0,
        estado_partido: "Finalizado",
        horario_bloqueado: false,
        es_lesion: false,
      });
      if (insertError) throw new Error(insertError.message);
    }

    const llaveOrigen = (await partidosDeLlave(input.torneoOrigenId)).map(
      aEditable,
    );
    const fuente = llaveOrigen.find((partido) => partido.id === pareja.partidoId);
    if (!fuente) throw new Error("No se encontró el partido de origen.");

    const posteriores = llaveOrigen.filter(
      (partido) =>
        partido.id !== fuente.id &&
        (partido.equipoAId === input.inscripcionId ||
          partido.equipoBId === input.inscripcionId),
    );
    for (const posterior of posteriores) {
      const lado: LadoLlave =
        posterior.equipoAId === input.inscripcionId ? "a" : "b";
      await aplicarParche(posterior.id, limpiarSlot(posterior, lado));
    }

    const parcheOrigen = retiroConBye(fuente, pareja.lado);
    await aplicarParche(fuente.id, parcheOrigen);
    if (parcheOrigen.ganador) {
      const avance = await destinoDeAvance(
        input.torneoOrigenId,
        fuente,
        llaveOrigen.filter(
          (partido) =>
            normalizarRonda(partido.ronda) === normalizarRonda(fuente.ronda),
        ),
      );
      if (avance) {
        await escribirLadoSiLibre(
          avance.id,
          avance.lado,
          parcheOrigen.ganador,
          input.inscripcionId,
        );
      }
    }

    await supabaseAdmin.from("logs_auditoria").insert([
      {
        usuario_id_admin: input.adminId,
        accion: "promover_pareja_categoria",
        entidad_afectada: input.torneoOrigenId,
        detalles: {
          inscripcion_id: input.inscripcionId,
          torneo_destino_id: input.torneoDestinoId,
          inscripcion_destino_id: inscripcionDestinoId,
          modo,
          motivo,
        },
      },
      {
        usuario_id_admin: input.adminId,
        accion: "recibir_pareja_categoria",
        entidad_afectada: input.torneoDestinoId,
        detalles: {
          inscripcion_origen_id: input.inscripcionId,
          inscripcion_id: inscripcionDestinoId,
          torneo_origen_id: input.torneoOrigenId,
          modo,
          motivo,
        },
      },
    ]);

    return {
      exito: true,
      modo,
      mensaje:
        modo === "bye"
          ? "La pareja salió de esta llave con un bye y entró en el bye de la categoría superior."
          : "La pareja salió de esta llave con un bye y se creó un partido en la primera ronda de la categoría superior.",
    };
  }
}
