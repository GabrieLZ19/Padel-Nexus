import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

type Llamada = {
  tabla: string;
  op: "select" | "update" | "insert" | "upsert";
  payload?: unknown;
  opciones?: unknown;
};

type Respuesta = {
  data?: unknown;
  error?: { message: string } | null;
};

function clienteMock(pasos: Respuesta[]) {
  const llamadas: Llamada[] = [];
  let indice = 0;

  function siguiente(): Respuesta {
    const paso = pasos[indice];
    indice += 1;
    if (!paso) {
      return { data: null, error: null };
    }
    return paso;
  }

  function desde(tabla: string) {
    const llamada: Llamada = { tabla, op: "select" };
    const cadena = {
      select() {
        if (llamada.op !== "upsert" && llamada.op !== "insert" && llamada.op !== "update") {
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
      update(payload: unknown) {
        llamada.op = "update";
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

  return { llamadas, admin: { from: desde } };
}

const supabaseUrl = new URL("../src/config/supabase.ts", import.meta.url).href;
let activo = clienteMock([]);
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

const { PlatformFeeService } = await import(
  "../src/services/platformFee.service.ts"
);

const TORNEO_ID = "torneo-fee-1";
const CLUB_ID = "club-aaa";
const INSCRIPCION_ID = "insc-pareja-1";

describe("Platform fees integración (Supabase mock)", () => {
  it("obtenerSaldoTorneo suma movimientos pendiente_organizador", async () => {
    activo = clienteMock([
      {
        data: [
          { id: "m1", monto_fee: 500 },
          { id: "m2", monto_fee: 300 },
        ],
        error: null,
      },
    ]);

    const saldo = await PlatformFeeService.obtenerSaldoTorneo(TORNEO_ID);
    assert.equal(saldo.torneo_id, TORNEO_ID);
    assert.equal(saldo.cantidad_movimientos, 2);
    assert.equal(saldo.saldo_pendiente, 800);
    assert.equal(saldo.moneda, "ARS");

    const q = activo.llamadas.find(
      (l) => l.tabla === "plataforma_fee_movimientos" && l.op === "select",
    );
    assert.ok(q, "Debe consultar plataforma_fee_movimientos");
  });

  it("obtenerSaldoTorneo sin pendientes devuelve cero", async () => {
    activo = clienteMock([{ data: [], error: null }]);
    const saldo = await PlatformFeeService.obtenerSaldoTorneo(TORNEO_ID);
    assert.equal(saldo.saldo_pendiente, 0);
    assert.equal(saldo.cantidad_movimientos, 0);
  });

  it("obtenerSaldoTorneo propaga error de base de datos", async () => {
    activo = clienteMock([
      { data: null, error: { message: "timeout" } },
    ]);
    await assert.rejects(
      () => PlatformFeeService.obtenerSaldoTorneo(TORNEO_ID),
      /No se pudo calcular el saldo/,
    );
  });

  it("registrarFeeInscripcionOffPlatform genera 2 fees (una por plaza)", async () => {
    activo = clienteMock([
      {
        data: {
          id: INSCRIPCION_ID,
          torneo_id: TORNEO_ID,
          monto: 60_000,
          usuario2_id: "user-2",
        },
        error: null,
      },
      {
        data: {
          club_id: CLUB_ID,
          asociacion_id: null,
          federacion_id: null,
        },
        error: null,
      },
      { data: { modo: "absorber" }, error: null },
      {
        data: {
          canal: "inscripciones",
          tipo: "fijo",
          valor: 500,
          activo: true,
        },
        error: null,
      },
      {
        data: { id: "fee-mov-1", monto_fee: 500 },
        error: null,
      },
      {
        data: {
          canal: "inscripciones",
          tipo: "fijo",
          valor: 500,
          activo: true,
        },
        error: null,
      },
      {
        data: { id: "fee-mov-2", monto_fee: 500 },
        error: null,
      },
    ]);

    const rows = await PlatformFeeService.registrarFeeInscripcionOffPlatform(
      INSCRIPCION_ID,
      "planilla",
    );
    assert.ok(rows);
    assert.equal(rows!.length, 2);

    const upserts = activo.llamadas.filter(
      (l) =>
        l.tabla === "plataforma_fee_movimientos" && l.op === "upsert",
    );
    assert.equal(upserts.length, 2);

    const payloads = upserts.map((u) => u.payload as Record<string, unknown>);
    assert.equal(payloads[0].entidad_tipo, "inscripcion_plaza");
    assert.equal(
      payloads[0].entidad_id,
      `${INSCRIPCION_ID}:plaza-1`,
    );
    assert.equal(
      payloads[1].entidad_id,
      `${INSCRIPCION_ID}:plaza-2`,
    );
    assert.equal(payloads[0].estado, "pendiente_organizador");
    assert.equal(payloads[0].origen_pago, "planilla");
    assert.equal(payloads[0].monto_fee, 500);
    assert.equal(payloads[0].monto_bruto, 30_000);
    assert.equal(payloads[1].monto_bruto, 30_000);
    const totalFee = payloads.reduce(
      (a, p) => a + Number(p.monto_fee),
      0,
    );
    assert.equal(totalFee, 1000);
  });

  it("registrarFeeInscripcionOffPlatform con monto 0 (torneo gratuito) genera fee fijo", async () => {
    activo = clienteMock([
      {
        data: {
          id: INSCRIPCION_ID,
          torneo_id: TORNEO_ID,
          monto: 0,
          usuario2_id: "user-2",
        },
        error: null,
      },
      {
        data: {
          club_id: CLUB_ID,
          asociacion_id: null,
          federacion_id: null,
        },
        error: null,
      },
      { data: { modo: "absorber" }, error: null },
      {
        data: {
          canal: "inscripciones",
          tipo: "fijo",
          valor: 500,
          activo: true,
        },
        error: null,
      },
      { data: { id: "fee-mov-1", monto_fee: 500 }, error: null },
      {
        data: {
          canal: "inscripciones",
          tipo: "fijo",
          valor: 500,
          activo: true,
        },
        error: null,
      },
      { data: { id: "fee-mov-2", monto_fee: 500 }, error: null },
    ]);

    const rows = await PlatformFeeService.registrarFeeInscripcionOffPlatform(
      INSCRIPCION_ID,
      "planilla",
    );
    assert.ok(rows);
    assert.equal(rows!.length, 2);
    const upserts = activo.llamadas.filter(
      (l) => l.tabla === "plataforma_fee_movimientos" && l.op === "upsert",
    );
    assert.equal(
      upserts.reduce((a, u) => a + Number((u.payload as { monto_fee: number }).monto_fee), 0),
      1000,
    );
  });

  it("registrarFeeInscripcionOnline con modo sumar marca cobrado_mp", async () => {
    activo = clienteMock([
      {
        data: {
          id: INSCRIPCION_ID,
          torneo_id: TORNEO_ID,
          monto: 30_000,
          usuario2_id: null,
        },
        error: null,
      },
      {
        data: { club_id: CLUB_ID, asociacion_id: null, federacion_id: null },
        error: null,
      },
      { data: { modo: "sumar" }, error: null },
      {
        data: {
          canal: "inscripciones",
          tipo: "fijo",
          valor: 500,
          activo: true,
        },
        error: null,
      },
      { data: { id: "fee-online-1" }, error: null },
    ]);

    const rows = await PlatformFeeService.registrarFeeInscripcionOnline(
      INSCRIPCION_ID,
      "mp-pay-999",
      30_500,
    );
    assert.ok(rows);
    assert.equal(rows!.length, 1);

    const upsert = activo.llamadas.find(
      (l) =>
        l.tabla === "plataforma_fee_movimientos" && l.op === "upsert",
    );
    assert.ok(upsert);
    const payload = upsert!.payload as Record<string, unknown>;
    assert.equal(payload.estado, "cobrado_mp");
    assert.equal(payload.origen_pago, "mp_online");
    assert.equal(payload.mp_payment_id, "mp-pay-999");
    assert.equal(payload.modo_fee, "sumar");
  });

  it("registrarFeeInscripcionOffPlatform sin inscripción devuelve null", async () => {
    activo = clienteMock([{ data: null, error: { message: "not found" } }]);
    const rows = await PlatformFeeService.registrarFeeInscripcionOffPlatform(
      "inexistente",
      "manual",
    );
    assert.equal(rows, null);
  });

  it("confirmarSaldoTorneoDesdeWebhook marca pendientes como cobrado_mp", async () => {
    activo = clienteMock([
      { data: null, error: null },
      {
        data: [{ id: "m1", monto_fee: 200 }],
        error: null,
      },
    ]);

    const saldo = await PlatformFeeService.confirmarSaldoTorneoDesdeWebhook(
      TORNEO_ID,
      "mp-saldo-1",
    );
    assert.equal(saldo.saldo_pendiente, 200);

    const upd = activo.llamadas.find(
      (l) =>
        l.tabla === "plataforma_fee_movimientos" && l.op === "update",
    );
    assert.ok(upd);
    const payload = upd!.payload as Record<string, unknown>;
    assert.equal(payload.estado, "cobrado_mp");
    assert.equal(payload.mp_payment_id, "mp-saldo-1");
  });
});