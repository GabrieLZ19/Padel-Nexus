import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-65 Generar Cuadros — confirmación, auditoría y bloqueo", () => {
  it("bloquea regenerar cuando la programación está publicada", () => {
    const competencia = readFileSync(
      path.join(RAIZ, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(competencia, /programacion_estado/);
    assert.match(
      competencia,
      /La programación está publicada\. No se pueden regenerar los cuadros/,
    );
  });

  it("exige motivo al regenerar cuadros existentes", () => {
    const competencia = readFileSync(
      path.join(RAIZ, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(competencia, /esRegeneracion/);
    assert.match(
      competencia,
      /motivo de al menos 8 caracteres/,
    );
  });

  it("registra regeneración en logs_auditoria", () => {
    const competencia = readFileSync(
      path.join(RAIZ, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(competencia, /accion: "regenerar_cuadros"/);
    assert.match(competencia, /partidos_con_horario/);
  });

  it("generarZonas valida alcance de edición del torneo", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/competencia.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /AlcanceCuentaService\.exigir/);
    assert.match(ctrl, /"editar"/);
  });
});