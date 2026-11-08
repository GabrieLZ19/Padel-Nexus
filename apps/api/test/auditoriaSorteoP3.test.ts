import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("P3: auditoría de sorteo, aviso y corrección", () => {
  it("resolverSorteoZona audita con entidad_afectada = torneoId y valores antes/después", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/clasificacion.service.ts"),
      "utf8",
    );
    assert.match(fuente, /accion:\s*"RESOLUCION_SORTEO_ZONA"/);
    assert.match(fuente, /entidad_afectada:\s*torneoId/);
    assert.match(fuente, /valor_anterior:\s*valorAnterior/);
    assert.match(fuente, /valor_nuevo:\s*valorNuevo/);
    assert.equal(fuente.includes('entidad_afectada: "grupo_parejas"'), false);
  });

  it("notificarSorteoZona audita con entidad_afectada = torneoId", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/clasificacion.service.ts"),
      "utf8",
    );
    assert.match(fuente, /accion:\s*"NOTIFICAR_SORTEO_ZONA"/);
    assert.match(
      fuente,
      /NOTIFICAR_SORTEO_ZONA[\s\S]*entidad_afectada:\s*torneoId/,
    );
  });

  it("getAuditoriaByTorneo incluye logs con torneo_id en detalles", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(fuente, /detalles->>torneo_id/);
    assert.match(fuente, /referenciasEntidadTorneoEnAuditoria/);
    assert.match(fuente, /\.in\("entidad_afectada", entidades\)/);
  });

  it("corregir_resultado audita aunque falte adminId y guarda torneo_id en detalles", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(fuente, /accion:\s*"corregir_resultado"/);
    assert.match(fuente, /yaTeniaResultado && valorAnterior/);
    assert.match(fuente, /torneo_id:\s*partido\.torneo_id/);
  });
});
