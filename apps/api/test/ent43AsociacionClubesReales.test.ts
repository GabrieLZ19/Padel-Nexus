import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-43 clubes de asociación con estado y canchas reales", () => {
  it("obtenerClubes filtra por asociacion_id y expone canchas activas", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/asociacion.service.ts"),
      "utf8",
    );
    assert.match(svc, /\.eq\("asociacion_id", asociacionId\)/);
    assert.match(svc, /canchas_detalle:canchas/);
    assert.match(svc, /canchas_activas/);
    const bloqueObtener = svc.slice(
      svc.indexOf("static async obtenerClubes"),
      svc.indexOf("static async obtenerPorId"),
    );
    assert.doesNotMatch(
      bloqueObtener,
      /\.ilike\("provincia"/,
      "obtenerClubes no debe filtrar solo por provincia",
    );
  });

  it("detalle de asociación en web no hardcodea Activo ni 4 canchas", () => {
    const page = readFileSync(
      path.join(RAIZ, "../web/app/dashboard/asociaciones/[id]/page.tsx"),
      "utf8",
    );
    assert.match(page, /canchas_activas/);
    assert.match(page, /c\.estado/);
    assert.doesNotMatch(page, /c\.canchas \|\| 4/);
    assert.doesNotMatch(page, />Activo</);
  });
});