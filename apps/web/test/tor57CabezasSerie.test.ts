import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = path.resolve(RAIZ, "../api");

describe("TOR-57 alcance validación cabezas de serie", () => {
  it("Paso8Cuadros documenta el switch en el editor", () => {
    const paso = fs.readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso8Cuadros.tsx"),
      "utf8",
    );
    assert.match(paso, /validación de cabezas de serie/i);
    assert.match(paso, /validación OFF/);
  });

  it("BracketEditor aclara persistencia y alcance al guardar", () => {
    const editor = fs.readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /al guardar zonas/);
    assert.match(editor, /persiste la preferencia en el torneo/);
  });

  it("generar zonas respeta cabezas_serie_activas al marcar es_cabeza_serie", () => {
    const svc = fs.readFileSync(
      path.join(API, "src/services/competencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /cabezas_serie_activas/);
    assert.match(svc, /es_cabeza_serie: cabezasSerieActivas && idx === 0/);
  });
});