import { supabaseAdmin } from "../config/supabase";
import {
  claveCategoria,
  compararPosicionRanking,
  variantesCategoria,
} from "../constants/rankings";
import { elegirProximoPartido } from "../utils/proximoPartido";

type InscripcionFila = {
  id: string;
  estado_pago: string | null;
  monto: number | null;
  jugador1_nombre: string | null;
  jugador2_nombre: string | null;
  torneos:
    | {
        id: string;
        nombre: string | null;
        categoria: string | null;
        nivel: string | null;
        estado: string | null;
        precio_inscripcion: number | null;
        es_gratis: boolean | null;
      }
    | {
        id: string;
        nombre: string | null;
        categoria: string | null;
        nivel: string | null;
        estado: string | null;
        precio_inscripcion: number | null;
        es_gratis: boolean | null;
      }[]
    | null;
};

type PartidoFila = {
  id: string;
  torneo_id: string;
  fecha_partido: string | null;
  estado_partido: string | null;
  ganador: string | null;
  cancha_asignada: string | null;
  ronda: string | null;
  equipo_a_id: string | null;
  equipo_b_id: string | null;
  set1_a: number | null;
  set1_b: number | null;
  set2_a: number | null;
  set2_b: number | null;
  set3_a: number | null;
  set3_b: number | null;
  torneos: { nombre: string | null } | { nombre: string | null }[] | null;
  equipo_a: NombresPareja | NombresPareja[] | null;
  equipo_b: NombresPareja | NombresPareja[] | null;
};

type Persona = { nombre: string | null; apellido: string | null };

type NombresPareja = {
  jugador1_nombre: string | null;
  jugador2_nombre: string | null;
  jugador1?: Persona | Persona[] | null;
  jugador2?: Persona | Persona[] | null;
};

export type PanelJugador = {
  proximoPartido: {
    id: string;
    torneoId: string;
    torneoNombre: string;
    fecha: string | null;
    cancha: string | null;
    ronda: string | null;
    rival: string;
  } | null;
  inscripciones: Array<{
    id: string;
    torneoId: string;
    torneoNombre: string;
    categoria: string | null;
    nivel: string | null;
    estadoTorneo: string | null;
    estadoPago: string | null;
    monto: number;
    sinCosto: boolean;
  }>;
  resultados: Array<{
    id: string;
    torneoId: string;
    torneoNombre: string;
    fecha: string | null;
    ronda: string | null;
    marcador: string;
    gano: boolean;
    rival: string;
  }>;
  ranking: {
    puesto: number;
    categoria: string;
    puntos: number;
    alcance: string;
  } | null;
};

function uno<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] ?? null : valor;
}

function nombrePersona(persona: Persona | null, respaldo: string | null): string {
  const guardado = respaldo?.trim();
  if (guardado && guardado !== "-") return guardado;
  const apellido = persona?.apellido?.trim() || "";
  const nombre = persona?.nombre?.trim() || "";
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre;
}

function nombrePareja(pareja: NombresPareja | null): string {
  const nombres = [
    nombrePersona(uno(pareja?.jugador1), pareja?.jugador1_nombre ?? null),
    nombrePersona(uno(pareja?.jugador2), pareja?.jugador2_nombre ?? null),
  ].filter(Boolean);
  return nombres.join(" / ") || "Rival por definir";
}

function marcadorDe(partido: PartidoFila): string {
  const sets: Array<[number | null, number | null]> = [
    [partido.set1_a, partido.set1_b],
    [partido.set2_a, partido.set2_b],
    [partido.set3_a, partido.set3_b],
  ];
  return sets
    .filter((set) => set[0] != null || set[1] != null)
    .map((set) => `${set[0] ?? 0}-${set[1] ?? 0}`)
    .join(" · ");
}

function partidoJugado(partido: PartidoFila): boolean {
  const estado = (partido.estado_partido || "").trim().toLowerCase();
  return estado === "finalizado" || Boolean(partido.ganador);
}

export const PanelJugadorService = {
  async obtener(usuarioId: string): Promise<PanelJugador> {
    const { data: inscripcionesRaw, error } = await supabaseAdmin
      .from("inscripciones")
      .select(
        "id, estado_pago, monto, jugador1_nombre, jugador2_nombre, torneos(id, nombre, categoria, nivel, estado, precio_inscripcion, es_gratis)",
      )
      .or(`usuario_id.eq.${usuarioId},usuario2_id.eq.${usuarioId}`);

    if (error) throw new Error("No se pudieron leer las inscripciones.");

    const inscripciones = (inscripcionesRaw || []) as InscripcionFila[];
    const ids = inscripciones.map((inscripcion) => inscripcion.id);

    const inscripcionesPanel = inscripciones.map((inscripcion) => {
      const torneo = uno(inscripcion.torneos);
      const monto = Number(inscripcion.monto || 0);
      const sinCosto =
        torneo?.es_gratis === true ||
        Number(torneo?.precio_inscripcion || 0) === 0;
      return {
        id: inscripcion.id,
        torneoId: torneo?.id || "",
        torneoNombre: torneo?.nombre || "Torneo",
        categoria: torneo?.categoria || null,
        nivel: torneo?.nivel || null,
        estadoTorneo: torneo?.estado || null,
        estadoPago: inscripcion.estado_pago,
        monto,
        sinCosto,
      };
    });

    const partidos = ids.length
      ? await cargarPartidos(ids)
      : [];

    const vistos = partidos.map((partido) => {
      const soyA = partido.equipo_a_id
        ? ids.includes(partido.equipo_a_id)
        : false;
      const rival = nombrePareja(uno(soyA ? partido.equipo_b : partido.equipo_a));
      const miId = soyA ? partido.equipo_a_id : partido.equipo_b_id;
      return {
        partido,
        rival,
        miId,
        jugado: partidoJugado(partido),
      };
    });

    const proximo = elegirProximoPartido(
      vistos.map((item) => ({
        id: item.partido.id,
        fecha: item.partido.fecha_partido,
        jugado: item.jugado,
        item,
      })),
    );

    const resultados = vistos
      .filter((item) => item.jugado)
      .sort((a, b) =>
        String(b.partido.fecha_partido || "").localeCompare(
          String(a.partido.fecha_partido || ""),
        ),
      )
      .slice(0, 5)
      .map((item) => ({
        id: item.partido.id,
        torneoId: item.partido.torneo_id,
        torneoNombre: uno(item.partido.torneos)?.nombre || "Torneo",
        fecha: item.partido.fecha_partido,
        ronda: item.partido.ronda,
        marcador: marcadorDe(item.partido),
        gano: Boolean(item.miId && item.partido.ganador === item.miId),
        rival: item.rival,
      }));

    return {
      proximoPartido: proximo
        ? {
            id: proximo.item.partido.id,
            torneoId: proximo.item.partido.torneo_id,
            torneoNombre:
              uno(proximo.item.partido.torneos)?.nombre || "Torneo",
            fecha: proximo.item.partido.fecha_partido,
            cancha: proximo.item.partido.cancha_asignada,
            ronda: proximo.item.partido.ronda,
            rival: proximo.item.rival,
          }
        : null,
      inscripciones: inscripcionesPanel,
      resultados,
      ranking: await puestoEnCategoria(usuarioId),
    };
  },
};

async function cargarPartidos(ids: string[]): Promise<PartidoFila[]> {
  const lista = ids.join(",");
  const { data, error } = await supabaseAdmin
    .from("partidos")
    .select(
      `id, torneo_id, fecha_partido, estado_partido, ganador, cancha_asignada, ronda,
       equipo_a_id, equipo_b_id, set1_a, set1_b, set2_a, set2_b, set3_a, set3_b,
       torneos!fk_partidos_torneo(nombre),
       equipo_a:inscripciones!fk_partidos_equipo_a(jugador1_nombre, jugador2_nombre, jugador1:perfiles!fk_inscripciones_usuario(nombre, apellido), jugador2:perfiles!fk_inscripciones_usuario2(nombre, apellido)),
       equipo_b:inscripciones!fk_partidos_equipo_b(jugador1_nombre, jugador2_nombre, jugador1:perfiles!fk_inscripciones_usuario(nombre, apellido), jugador2:perfiles!fk_inscripciones_usuario2(nombre, apellido))`,
    )
    .or(`equipo_a_id.in.(${lista}),equipo_b_id.in.(${lista})`);

  if (error) throw new Error("No se pudieron leer los partidos.");
  return (data || []) as PartidoFila[];
}

async function puestoEnCategoria(usuarioId: string) {
  const { data: perfil } = await supabaseAdmin
    .from("perfiles")
    .select("categoria_padel, apellido, nombre")
    .eq("id", usuarioId)
    .maybeSingle();

  const categoriaPerfil = perfil?.categoria_padel?.trim();
  if (!categoriaPerfil) return null;
  const clave = claveCategoria(categoriaPerfil);

  const { data: propios } = await supabaseAdmin
    .from("rankings")
    .select("puntos, categoria, alcance")
    .eq("usuario_id", usuarioId);

  const deSuCategoria = (propios || []).filter(
    (item) => claveCategoria(String(item.categoria || "")) === clave,
  );

  const cualquiera = propios || [];
  const fila =
    deSuCategoria.find((item) => item.alcance === "Nacional") ||
    deSuCategoria.find((item) => item.alcance === "Provincial") ||
    deSuCategoria[0] ||
    cualquiera.find((item) => item.alcance === "Nacional") ||
    cualquiera.find((item) => item.alcance === "Provincial") ||
    cualquiera[0];
  if (!fila) return null;
  const categoria = String(fila.categoria || categoriaPerfil);

  const { data: tabla } = await supabaseAdmin
    .from("rankings")
    .select("usuario_id, puntos, perfiles(apellido, nombre)")
    .in("categoria", variantesCategoria(String(fila.categoria)))
    .eq("alcance", fila.alcance);

  const ordenada = (tabla || [])
    .map((item) => {
      const persona = uno(
        item.perfiles as
          | { apellido: string | null; nombre: string | null }
          | { apellido: string | null; nombre: string | null }[]
          | null,
      );
      return {
        usuarioId: item.usuario_id as string,
        puntos: Number(item.puntos || 0),
        apellido: persona?.apellido || "",
        nombre: persona?.nombre || "",
      };
    })
    .sort(compararPosicionRanking);

  const vistos = new Set<string>();
  const unicos = ordenada.filter((item) => {
    if (vistos.has(item.usuarioId)) return false;
    vistos.add(item.usuarioId);
    return true;
  });

  const indice = unicos.findIndex((item) => item.usuarioId === usuarioId);
  if (indice < 0) return null;

  return {
    puesto: indice + 1,
    categoria,
    puntos: Number(fila.puntos || 0),
    alcance: String(fila.alcance || ""),
  };
}
