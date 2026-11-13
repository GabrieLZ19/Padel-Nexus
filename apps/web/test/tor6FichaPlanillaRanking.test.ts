import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-6 ficha y ranking Local", () => {
  it("muestra alcance Local con etiqueta de club", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/jugador/JugadorPublicoRankingSection.tsx"),
      "utf8",
    );
    assert.match(fuente, /case "Local":/);
    assert.match(fuente, /Ranking del club/);
  });

  it("resuelve posición desde API cuando no hay query", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/jugadores/[id]/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /posicion_actual/);
    assert.match(pagina, /posicionResuelta/);
  });
});
