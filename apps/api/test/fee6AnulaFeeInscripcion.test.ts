import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

type Llamada = {
  tabla: string;
  op: string;
  payload?: unknown;
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
    return paso ?? { data: null, error: null };
  }

  function desde(tabla: string) {
    const llamada: Llamada = { tabla, op: "select" };
    const cadena = {
      select() {
        return cadena;
      },
      update(payload: unknown) {
        llamada.op = "update";
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
      like() {
        return cadena;
      },
      neq() {
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

const INSC = "insc-fee6-1";
const MOV_PENDIENTE = {
  id: "mov-p1",
  entidad_id: `${INSC}:plaza-1`,
  entidad_tipo: "inscripcion_plaza",
  canal: "inscripciones",
  org_tipo: "club",
  org_id: "club-1",
  torneo_id: "tor-1",
  monto_fee: 500,
  modo_fee: "absorber",
  estado: "pendiente_organizador",
};

describe("FEE-6 anular fees al cancelar/rechazar inscripción", () => {
  it("cancelar inscripción invoca anularFeesPorInscripcion", () => {
    const src = readFileSync(`${root}src/services/inscripcion.service.ts`, "utf8");
    assert.match(src, /cancelarInscripcion[\s\S]*anularFeesPorInscripcion/);
  });

  it("rechazar pago invoca anularFeesPorInscripcion", () => {
    const src = readFileSync(`${root}src/services/inscripcion.service.ts`, "utf8");
    assert.match(src, /RECHAZADO[\s\S]*anularFeesPorInscripcion/);
  });

  it("anular marca pendiente_organizador como anulado", async () => {
    activo = clienteMock([
      { data: [MOV_PENDIENTE], error: null },
      { data: null, error: null },
    ]);

    await PlatformFeeService.anularFeesPorInscripcion(INSC);

    const upd = activo.llamadas.find(
      (l) => l.tabla === "plataforma_fee_movimientos" && l.op === "update",
    );
    assert.ok(upd);
    assert.deepEqual((upd!.payload as { estado: string }).estado, "anulado");
    assert.equal(
      activo.llamadas.filter((l) => l.op === "upsert").length,
      0,
      "Sin crédito si no estaba cobrado",
    );
  });

  it("anular cobrado_mp genera crédito negativo", async () => {
    activo = clienteMock([
      {
        data: [{ ...MOV_PENDIENTE, estado: "cobrado_mp" }],
        error: null,
      },
      { data: null, error: null },
      { data: null, error: null },
    ]);

    await PlatformFeeService.anularFeesPorInscripcion(INSC);

    const credito = activo.llamadas.find(
      (l) => l.op === "upsert" && l.tabla === "plataforma_fee_movimientos",
    );
    assert.ok(credito);
    const body = credito!.payload as {
      monto_fee: number;
      entidad_tipo: string;
      estado: string;
    };
    assert.equal(body.monto_fee, -500);
    assert.equal(body.entidad_tipo, "inscripcion_credito_anulacion");
    assert.equal(body.estado, "descontar_liquidacion");
  });

  it("reporte mensual excluye anulados", () => {
    const src = readFileSync(`${root}src/services/platformFee.service.ts`, "utf8");
    assert.match(src, /reporteMensual[\s\S]*neq\("estado", "anulado"\)/);
  });
});