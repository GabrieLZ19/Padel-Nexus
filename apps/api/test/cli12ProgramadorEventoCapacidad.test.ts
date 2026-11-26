import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { sugerenciaCapacidadEvento } from "../src/utils/programacionEvento.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-12 capacidad del evento en programador maestro", () => {
  it("sugerenciaCapacidadEvento suma partidos del evento, no una categoría", () => {
    const unaCat = sugerenciaCapacidadEvento({
      totalPartidos: 12,
      duracionMinutos: 90,
      diasCount: 2,
      canchasCount: 4,
    });
    const evento = sugerenciaCapacidadEvento({
      totalPartidos: 48,
      duracionMinutos: 90,
      diasCount: 2,
      canchasCount: 4,
    });
    assert.match(unaCat.mensaje, /12 partidos/);
    assert.match(evento.mensaje, /48 partidos/);
    assert.ok(evento.canchas >= unaCat.canchas);
  });

  it("mergeBoardsEvento recalcula sugerencia con total agregado", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/programacionEvento.ts"),
      "utf8",
    );
    assert.match(util, /export function sugerenciaCapacidadEvento/);
    assert.match(util, /sugerenciaCapacidadEvento\(/);
    assert.match(util, /totalPartidos: total/);
    assert.doesNotMatch(
      util,
      /sugerencia:\s*ref\.sugerencia/,
      "no debe reutilizar la sugerencia de la categoría referencia",
    );
  });
});