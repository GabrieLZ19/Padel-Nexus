import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PUB-13 cifras portada vs listados publicos", () => {
  it("cifras usa listado de torneos publico y contadores de reserva", () => {
    const svc = readFileSync(
      path.join(RAIZ_API, "src/services/sitioPublico.service.ts"),
      "utf8",
    );
    assert.match(svc, /TorneoService\.listarTorneos\(undefined, 50_000, \{ ocultarPrueba: true \}\)/);
    assert.match(svc, /ClubService\.contadoresListadoReservaPublico\(\)/);
    assert.match(svc, /torneos: listadoTorneos\.total/);
    assert.doesNotMatch(svc, /from\("clubes"\)\.select\("id", \{ count: "exact", head: true \}\)/);
    assert.doesNotMatch(svc, /from\("canchas"\)\.select\("id", \{ count: "exact", head: true \}\)/);
  });

  it("contadoresListadoReservaPublico deriva de listarTodosConDistancia", () => {
    const club = readFileSync(
      path.join(RAIZ_API, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(club, /contadoresListadoReservaPublico/);
    assert.match(club, /listarTodosConDistancia\(\)/);
    assert.match(club, /clubes: lista\.length/);
    assert.match(club, /reduce\(\(sum, club\) => sum \+ club\.canchas/);
  });
});
