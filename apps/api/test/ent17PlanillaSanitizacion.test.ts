import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  esEmailPlaceholderPlanilla,
  parsearFilasPlanilla,
  sanearValorCeldaPlanilla,
  sanitizarFilaPlanillaInscripcion,
} from "../src/utils/inscripcionPlanilla.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("ENT-17 importación planilla y contactos", () => {
  it("sanearValorCeldaPlanilla quita etiquetas <v>", () => {
    assert.equal(sanearValorCeldaPlanilla("<v>Pérez</v>, <v>Juan</v>"), "Pérez, Juan");
    assert.equal(sanearValorCeldaPlanilla("<v>BUENOS AIRES"), "BUENOS AIRES");
    assert.equal(sanearValorCeldaPlanilla("<v>5º"), "5º");
    assert.equal(sanearValorCeldaPlanilla(">5º"), "5º");
    assert.equal(sanearValorCeldaPlanilla("> BUENOS AIRES"), "BUENOS AIRES");
    assert.equal(sanearValorCeldaPlanilla("  Gomez   <v>  "), "Gomez");
  });

  it("example.com cuenta como placeholder de planilla/ensayo", () => {
    assert.equal(esEmailPlaceholderPlanilla("qa@example.com"), true);
    assert.equal(esEmailPlaceholderPlanilla("jugador@gmail.com"), false);
  });

  it("parsearFilasPlanilla sanea apellido y email", () => {
    const { filas } = parsearFilasPlanilla([
      ["DNI", "APELLIDO Y NOMBRE", "EMAIL"],
      ["30123456", "<v>LOPEZ</v>, Maria", "test@example.com"],
    ]);
    assert.equal(filas[0]?.apellidoNombre, "LOPEZ, Maria");
    assert.equal(filas[0]?.email, "test@example.com");
    const saneada = sanitizarFilaPlanillaInscripcion(filas[0]!);
    assert.equal(esEmailPlaceholderPlanilla(saneada.email), true);
  });

  it("front y back comparten saneamiento de celdas", () => {
    const web = readFileSync(
      path.join(RAIZ, "web/utils/inscripcionPlanilla.ts"),
      "utf8",
    );
    assert.match(web, /sanearValorCeldaPlanilla/);
    assert.match(web, /@example\\\.com/);
  });
});
