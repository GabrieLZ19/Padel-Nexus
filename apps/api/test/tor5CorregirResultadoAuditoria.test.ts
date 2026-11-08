import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  partidoYaTeniaResultado,
  referenciasEntidadTorneoEnAuditoria,
} from "../src/utils/auditoriaTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-5 corrección de resultado en auditoría", () => {
  it("detecta partido ya finalizado aunque falte ganador en el snapshot", () => {
    assert.equal(partidoYaTeniaResultado({ estado_partido: "Finalizado" }), true);
    assert.equal(
      partidoYaTeniaResultado({ set1_a: 6, set1_b: 4, ganador: null }),
      true,
    );
    assert.equal(partidoYaTeniaResultado({ ganador: null }), false);
  });

  it("referencias de entidad incluyen uuid y prefijos legacy", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    assert.deepEqual(referenciasEntidadTorneoEnAuditoria(id), [
      id,
      `torneo_id: ${id}`,
      `torneos_id: ${id}`,
    ]);
  });

  it("audita antes de actualizar el partido y falla si el insert no se persiste", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const idxAudit = svc.indexOf('accion: "corregir_resultado"');
    const idxUpdate = svc.indexOf('.from("partidos")\n      .update({', idxAudit);
    assert.ok(idxAudit > 0);
    assert.ok(idxUpdate > idxAudit);
    assert.match(svc, /No se pudo registrar la corrección en auditoría/);
  });

  it("getAuditoria lista por entidad_afectada y torneo_id en detalles", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /referenciasEntidadTorneoEnAuditoria/);
    assert.match(ctrl, /\.in\("entidad_afectada", entidades\)/);
    assert.match(ctrl, /detalles->>torneo_id/);
  });
});
