import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { identificadorPareceDni } from "../utils/identificadorJugadorManual.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-20 inscripción manual UI", () => {
  it("detecta DNI numérico para pedir ficha provisional", () => {
    assert.equal(identificadorPareceDni("99000201"), true);
    assert.equal(identificadorPareceDni("jugador@test.com"), false);
    assert.equal(identificadorPareceDni("123"), false);
  });

  it("modal expone datos de alta y servicio los envía", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/inscripciones/InscripcionManualModal.tsx"),
      "utf8",
    );
    assert.match(modal, /Ficha provisional jugador 1/);
    assert.match(modal, /jugador1_datos/);
    const svc = readFileSync(
      path.join(RAIZ, "utils/services/inscripciones.ts"),
      "utf8",
    );
    assert.match(svc, /jugador1_datos/);
  });
});
