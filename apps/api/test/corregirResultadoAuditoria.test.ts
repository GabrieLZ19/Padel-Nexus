import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

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

const { TorneoService } = await import("../src/services/torneo.service.ts");

const TORNEO = "torneo-f6-test";
const PARTIDO = "partido-f6-test";
const PAREJA_A = "pareja-a-uuid";
const PAREJA_B = "pareja-b-uuid";
const ADMIN_ID = "admin-user-uuid";

describe("F6: Auditoría y motivo obligatorio al corregir resultado", () => {
  it("rechaza la corrección de un partido finalizado si no se provee motivo", async () => {
    activo = clienteScript([
      {
        data: {
          id: PARTIDO,
          torneo_id: TORNEO,
          ronda: "OCTAVOS",
          orden: 1,
          equipo_a_id: PAREJA_A,
          equipo_b_id: PAREJA_B,
          ganador: PAREJA_A,
          set1_a: 6,
          set1_b: 2,
          set2_a: 6,
          set2_b: 2,
          set3_a: null,
          set3_b: null,
          torneos: { estado: "En curso" },
        },
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
          4,
          null,
          null,
          false,
          false,
          false,
          false,
          "", // motivo vacio
          ADMIN_ID,
        ),
      /Debes ingresar un motivo para corregir el resultado de un partido finalizado/,
    );
  });

  it("registra en logs_auditoria los valores anteriores y nuevos al corregir con motivo", async () => {
    activo = clienteScript([
      // 1. select previo con resultado existente
      {
        data: {
          id: PARTIDO,
          torneo_id: TORNEO,
          ronda: "OCTAVOS",
          orden: 1,
          equipo_a_id: PAREJA_A,
          equipo_b_id: PAREJA_B,
          ganador: PAREJA_A,
          set1_a: 6,
          set1_b: 2,
          set2_a: 6,
          set2_b: 2,
          set3_a: null,
          set3_b: null,
          es_supertiebreak: false,
          es_wo: false,
          es_injustificado_wo: false,
          es_lesion: false,
          torneos: { estado: "En curso" },
        },
        error: null,
      },
      // 2. partidos del torneo (número visible para auditoría)
      {
        data: [{ id: PARTIDO, ronda: "OCTAVOS", orden: 1 }],
        error: null,
      },
      // 3. insert logs_auditoria (antes de actualizar el partido)
      { data: null, error: null },
      // 4. update partido
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
      // 5. select torneoInfo (ranking)
      { data: null, error: null },
      // 6. inscripciones count (fap bracket)
      { count: 0, error: null },
    ]);

    await TorneoService.procesarResultadoYAvance(
      PARTIDO,
      PAREJA_A,
      6,
      4,
      6,
      4,
      null,
      null,
      false,
      false,
      false,
      false,
      "Corrección de marcador de 6-2 6-2 a 6-4 6-4",
      ADMIN_ID,
    );

    const logCall = activo.llamadas.find(
      (llamada) => llamada.tabla === "logs_auditoria" && llamada.op === "insert",
    );

    assert.ok(logCall, "Debe registrar en logs_auditoria");
    const payload = logCall.payload as {
      usuario_id_admin: string;
      accion: string;
      entidad_afectada: string;
      detalles: {
        partido_id: string;
        ronda: string;
        orden: number;
        motivo: string;
        valor_anterior: any;
        valor_nuevo: any;
      };
    };

    assert.equal(payload.usuario_id_admin, ADMIN_ID);
    assert.equal(payload.accion, "corregir_resultado");
    assert.equal(payload.entidad_afectada, TORNEO);
    assert.equal(payload.detalles.partido_id, PARTIDO);
    assert.equal(payload.detalles.motivo, "Corrección de marcador de 6-2 6-2 a 6-4 6-4");
    assert.match(String(payload.detalles.resumen || ""), /Corrección de resultado/);
    assert.ok(payload.detalles.numero_partido != null);
    assert.equal(payload.detalles.valor_anterior.set1_a, 6);
    assert.equal(payload.detalles.valor_anterior.set1_b, 2);
    assert.equal(payload.detalles.valor_anterior.set2_a, 6);
    assert.equal(payload.detalles.valor_anterior.set2_b, 2);
    assert.equal(payload.detalles.valor_nuevo.set1_a, 6);
    assert.equal(payload.detalles.valor_nuevo.set1_b, 4);
    assert.equal(payload.detalles.valor_nuevo.set2_a, 6);
    assert.equal(payload.detalles.valor_nuevo.set2_b, 4);
  });
});
