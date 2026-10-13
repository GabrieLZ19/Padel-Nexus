import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { MENSAJE_RESULTADO_SIN_PUBLICAR } from "../src/utils/estadoCompetencia.ts";

type Llamada = {
  tabla: string;
  op: "select" | "update" | "insert" | "upsert";
  payload: unknown;
};

type Respuesta = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

function clienteScript(pasos: Respuesta[]) {
  const llamadas: Llamada[] = [];
  let indice = 0;

  function siguiente(): Respuesta {
    const paso = pasos[indice];
    indice += 1;
    return paso ?? { data: null, error: null, count: 0 };
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
      update(payload: unknown) {
        llamada.op = "update";
        llamada.payload = payload;
        return cadena;
      },
      insert(payload: unknown) {
        llamada.op = "insert";
        llamada.payload = payload;
        return cadena;
      },
      upsert(payload: unknown) {
        llamada.op = "upsert";
        llamada.payload = payload;
        return cadena;
      },
      eq() {
        return cadena;
      },
      in() {
        return cadena;
      },
      order() {
        return cadena;
      },
      limit() {
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

  return {
    llamadas,
    admin: { from: desde },
  };
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

const { ProgramacionService } = await import(
  "../src/services/programacion.service.ts"
);
const { TorneoService } = await import("../src/services/torneo.service.ts");

const TORNEO = "torneo-gen-08";
const PARTIDO = "partido-1";
const PAREJA_A = "pareja-a";
const PAREJA_B = "pareja-b";

function partidoConHorario() {
  return {
    id: PARTIDO,
    equipo_a_id: PAREJA_A,
    equipo_b_id: PAREJA_B,
    cancha_asignada: "Cancha 1",
    fecha_partido: "2026-10-20T15:00:00.000Z",
    ronda: "OCTAVOS",
  };
}

function updatesDeTorneo(llamadas: Llamada[]) {
  return llamadas.filter(
    (llamada) => llamada.tabla === "torneos" && llamada.op === "update",
  );
}

describe("GEN-08 publicar pasa el torneo a En curso", () => {
  it("publicar un torneo Programado guarda En curso y horarios publicados", async () => {
    activo = clienteScript([
      { data: [partidoConHorario()], error: null },
      { data: { id: TORNEO, estado: "Programado" }, error: null },
      { error: null },
      { error: null },
    ]);

    const resultado = await ProgramacionService.publicar(TORNEO, {
      adminId: "admin-1",
    });

    assert.equal(resultado.estado, "En curso");
    const cambios = updatesDeTorneo(activo.llamadas);
    assert.equal(cambios.length, 1);
    assert.deepEqual(cambios[0]?.payload, {
      programacion_estado: "publicado",
      programacion_publicada_en: resultado.publicada_en,
      estado: "En curso",
    });
    const auditoria = activo.llamadas.find(
      (llamada) => llamada.tabla === "logs_auditoria",
    );
    assert.equal(auditoria?.op, "insert");
    assert.equal(
      (auditoria?.payload as { detalles?: { estado?: string } }).detalles
        ?.estado,
      "En curso",
    );
  });

  it("volver a publicar un torneo En curso no lo mueve de estado", async () => {
    activo = clienteScript([
      { data: [partidoConHorario()], error: null },
      { data: { id: TORNEO, estado: "En curso" }, error: null },
      { error: null },
    ]);

    const resultado = await ProgramacionService.publicar(TORNEO);

    assert.equal(resultado.estado, "En curso");
    const cambios = updatesDeTorneo(activo.llamadas);
    assert.equal(cambios.length, 1);
    assert.equal(
      (cambios[0]?.payload as { estado?: string }).estado,
      undefined,
    );
    assert.equal(
      (cambios[0]?.payload as { programacion_estado?: string })
        .programacion_estado,
      "publicado",
    );
  });

  it("no publica ni cambia el estado si falta un horario", async () => {
    activo = clienteScript([
      {
        data: [{ ...partidoConHorario(), cancha_asignada: null }],
        error: null,
      },
    ]);

    await assert.rejects(
      () => ProgramacionService.publicar(TORNEO),
      /No se puede publicar: 1 partido/,
    );
    assert.equal(updatesDeTorneo(activo.llamadas).length, 0);
  });

  it("cargar un resultado con el torneo Programado no lo pasa a En curso", async () => {
    activo = clienteScript([
      {
        data: { ganador: null, torneos: { estado: "Programado" } },
        error: null,
      },
    ]);

    await assert.rejects(
      () =>
        TorneoService.procesarResultadoYAvance(
          PARTIDO,
          PAREJA_A,
          6,
          4,
          6,
          3,
        ),
      new RegExp(MENSAJE_RESULTADO_SIN_PUBLICAR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    assert.equal(updatesDeTorneo(activo.llamadas).length, 0);
    assert.equal(
      activo.llamadas.some((llamada) => llamada.op === "update"),
      false,
    );
  });

  it("cargar un resultado con el torneo En curso no vuelve a cambiar el estado", async () => {
    activo = clienteScript([
      {
        data: { ganador: null, torneos: { estado: "En curso" } },
        error: null,
      },
      {
        data: {
          id: PARTIDO,
          torneo_id: TORNEO,
          ronda: "OCTAVOS",
          orden: 1,
          equipo_a_id: PAREJA_A,
          equipo_b_id: PAREJA_B,
        },
        error: null,
      },
      { data: null, error: null },
    ]);

    await TorneoService.procesarResultadoYAvance(PARTIDO, PAREJA_A, 6, 4, 6, 3);

    const cambios = updatesDeTorneo(activo.llamadas);
    assert.equal(
      cambios.some(
        (cambio) =>
          (cambio.payload as { estado?: string }).estado === "En curso",
      ),
      false,
    );
    assert.equal(
      activo.llamadas.some(
        (llamada) => llamada.tabla === "partidos" && llamada.op === "update",
      ),
      true,
    );
  });
});
