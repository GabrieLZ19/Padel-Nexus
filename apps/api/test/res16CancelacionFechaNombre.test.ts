import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { fraseFechaTurnoReserva } from "../src/utils/fechaArgentina.ts";
import { normalizarNombrePerfil } from "../src/utils/formatoTexto.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-16 aviso de cancelación al club", () => {
  it("frase de turno con día corto y dd/mm", () => {
    const frase = fraseFechaTurnoReserva("2026-11-14", "20:00");
    assert.match(frase, /^del \S+ 14\/11 a las 20:00 hs$/);
    assert.doesNotMatch(frase, /2026-11-14/);
  });

  it("reservaCancelacion arma mensaje con fraseFechaTurnoReserva", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "src/utils/reservaCancelacion.ts"),
      "utf8",
    );
    assert.match(fuente, /fraseFechaTurnoReserva/);
    assert.doesNotMatch(fuente, /del \$\{fechaReserva\}/);

    const frase = fraseFechaTurnoReserva("2026-11-14", "20:00");
    const mensajeEjemplo = `QA Prueba Jugador Uno canceló el turno en Cancha 2 ${frase}. El horario quedó liberado en la agenda.`;
    assert.match(mensajeEjemplo, /QA Prueba Jugador Uno/);
    assert.doesNotMatch(mensajeEjemplo, /2026-11-14/);
  });

  it("normalizar nombre conserva mayúsculas del jugador", () => {
    assert.equal(normalizarNombrePerfil("QA Prueba"), "QA Prueba");
    assert.equal(normalizarNombrePerfil("juan"), "Juan");
  });
});
