import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

type Llamada = {
  tabla: string;
  op: "select" | "update" | "insert" | "upsert";
  payload: unknown;
  opciones?: unknown;
};

type Respuesta = {
  data?: unknown;
  error?: { message: string } | null;
};

function clienteScript(pasos: Respuesta[]) {
  const llamadas: Llamada[] = [];
  let indice = 0;

  function siguiente(): Respuesta {
    const paso = pasos[indice];
    indice += 1;
    return paso ?? { data: null, error: null };
  }

  function desde(tabla: string) {
    const llamada: Llamada = { tabla, op: "select", payload: undefined };
    const cadena = {
      select() {
        if (llamada.op !== "update" && llamada.op !== "insert") {
          llamada.op = "select";
        }
        return cadena;
      },
      upsert(payload: unknown, opciones?: unknown) {
        llamada.op = "upsert";
        llamada.payload = payload;
        llamada.opciones = opciones;
        return cadena;
      },
      insert(payload: unknown) {
        llamada.op = "insert";
        llamada.payload = payload;
        return cadena;
      },
      eq() {
        return cadena;
      },
      maybeSingle() {
        llamadas.push({ ...llamada });
        return Promise.resolve(siguiente());
      },
      single() {
        llamadas.push({ ...llamada });
        return Promise.resolve(siguiente());
      },
      limit() {
        return cadena;
      },
      then(
        onFulfilled: (value: Respuesta) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        llamadas.push({ ...llamada });
        return Promise.resolve(siguiente()).then(onFulfilled, onRejected);
      },
    };
    return cadena;
  }

  return { llamadas, admin: { from: desde } };
}

const supabaseUrl = new URL("../src/config/supabase.ts", import.meta.url).href;
let activo = clienteScript([]);
const adminEstable = {
  from(tabla: string) {
    return activo.admin.from(tabla);
  },
};

mock.module(supabaseUrl, {
  exports: {
    supabaseAdmin: adminEstable,
    supabase: adminEstable,
  },
});

const { otorgarPuntosPorPartidoRanking } = await import(
  "../src/utils/otorgarPuntosPartidoTorneo.ts"
);

const TORNEO = "torneo-tor43";
const PARTIDO = "partido-oct-18";
const INS_GANADOR = "insc-ganador";
const INS_PERDEDOR = "insc-perdedor";
const USER1 = "user-j1";
const USER2 = "user-j2";
const RANK_EXISTENTE_ID = "rank-prov-7a";

function torneoInfoClubLocal() {
  return {
    nivel: "7ª",
    categoria: "Libres",
    alcance: "Local",
    configuracion_puntos: {
      puntos_activados: true,
      puntos_campeon: 1000,
      puntos_final: 600,
      puntos_semis: 360,
      puntos_cuartos: 180,
      puntos_octavos: 90,
      puntos_16avos: 45,
      puntos_zona: 0,
    },
    clubes: { provincia: "Neuquén" },
  };
}

describe("TOR-43 integración: otorgar puntos sin duplicar ranking", () => {
  it("actualiza fila existente 7ª Provincial al sumar puntos de torneo Local", async () => {
    activo = clienteScript([
      // perdedor: inscripción y 2 jugadores con puntos de instancia OCTAVOS
      {
        data: { usuario_id: "user-p1", usuario2_id: "user-p2" },
        error: null,
      },
      {
        data: {
          id: "rank-perdedor-1",
          puntos: 120,
          pj: 5,
          pg: 2,
          alcance: "Provincial",
          provincia_jurisdiccion: "Neuquén",
        },
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null },
      {
        data: {
          id: "rank-perdedor-2",
          puntos: 80,
          pj: 4,
          pg: 1,
          alcance: "Provincial",
          provincia_jurisdiccion: "Neuquén",
        },
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null },
      // ganador: inscripción (solo estadísticas pj/pg, TOR-47)
      {
        data: { usuario_id: USER1, usuario2_id: USER2 },
        error: null,
      },
      {
        data: {
          id: RANK_EXISTENTE_ID,
          puntos: 500,
          pj: 10,
          pg: 7,
          alcance: "Provincial",
          provincia_jurisdiccion: "Neuquén",
        },
        error: null,
      },
      { data: null, error: null },
      {
        data: {
          id: "rank-ganador-2",
          puntos: 400,
          pj: 9,
          pg: 6,
          alcance: "Provincial",
          provincia_jurisdiccion: "Neuquén",
        },
        error: null,
      },
      { data: null, error: null },
    ]);

    await otorgarPuntosPorPartidoRanking(
      {
        id: PARTIDO,
        torneo_id: TORNEO,
        ronda: "OCTAVOS",
        ganador: INS_GANADOR,
        equipo_a_id: INS_GANADOR,
        equipo_b_id: INS_PERDEDOR,
      },
      torneoInfoClubLocal(),
      INS_GANADOR,
    );

    const upsertRanking = activo.llamadas.filter(
      (l) => l.tabla === "rankings" && l.op === "upsert",
    );
    assert.ok(upsertRanking.length >= 1, "Debe hacer upsert en rankings");
    for (const u of upsertRanking) {
      assert.deepEqual(u.opciones, { onConflict: "usuario_id,categoria" });
    }

    const upsertGanador = upsertRanking.find(
      (u) =>
        (u.payload as Record<string, unknown>).usuario_id === USER1 &&
        (u.payload as Record<string, unknown>).id === RANK_EXISTENTE_ID,
    );
    assert.ok(
      upsertGanador,
      "Debe reutilizar la fila existente del jugador 1 sin duplicar categoría",
    );

    const filaGanador = upsertGanador!.payload as Record<string, unknown>;
    assert.equal(filaGanador.categoria, "7ª");
    assert.equal(filaGanador.alcance, "Provincial");
    assert.equal(filaGanador.puntos, 500);
    assert.equal(filaGanador.pj, 11);
    assert.equal(filaGanador.pg, 8);

    const upsertPerdedor = upsertRanking.find(
      (u) => (u.payload as Record<string, unknown>).usuario_id === "user-p1",
    );
    assert.ok(upsertPerdedor, "Debe actualizar ranking del perdedor");
    const filaPerdedor = upsertPerdedor!.payload as Record<string, unknown>;
    assert.equal(filaPerdedor.puntos, 120 + 90);
    assert.equal(filaPerdedor.pj, 6);
    assert.equal(filaPerdedor.pg, 2);
  });
});