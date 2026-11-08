import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  JUGADORES_PARTIDO_ABIERTO,
  jugadoresConfirmadosDesdeFaltantes,
  jugadoresFaltantesDesdeConfirmados,
} from "../src/utils/partidoAbiertoCupos.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-8 partido abierto — 4 jugadores", () => {
  it("dos confirmados y dos faltantes", () => {
    assert.equal(JUGADORES_PARTIDO_ABIERTO, 4);
    assert.equal(jugadoresFaltantesDesdeConfirmados(2), 2);
    assert.equal(jugadoresConfirmadosDesdeFaltantes(2), 2);
  });

  it("modal de reservas pide jugadores confirmados", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "../web/app/(public)/mi-perfil/reservas/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /Jugadores confirmados \(vos incluido\)/);
    assert.match(pagina, /jugadoresFaltantesDesdeConfirmados/);
    assert.equal(pagina.includes("Jugadores faltantes"), false);
  });

  it("detalle muestra ratio sobre 4", () => {
    const detalle = readFileSync(
      path.join(RAIZ, "../web/app/(public)/partidos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(detalle, /JUGADORES_PARTIDO_ABIERTO/);
    assert.match(detalle, /slotsPartidoAbierto/);
    assert.doesNotMatch(detalle, /inscriptos\.length \+ partido\.jugadores_faltantes/);
  });
});
