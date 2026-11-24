import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  normalizarRamaRanking,
  ramaInicialRankingPublico,
} from "../utils/rankings/rama.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RNK-3 ranking público — rama Damas / Caballeros", () => {
  it("normaliza torneos y perfiles a masculino/femenino", () => {
    assert.equal(normalizarRamaRanking("Damas"), "femenino");
    assert.equal(normalizarRamaRanking("Caballeros"), "masculino");
    assert.equal(ramaInicialRankingPublico("femenino"), "femenino");
    assert.equal(ramaInicialRankingPublico(null), "masculino");
  });

  it("la página /ranking envía rama al servicio y muestra el selector", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/ranking/page.tsx"),
      "utf8",
    );
    assert.match(page, /rama:\s*activeRama/);
    assert.match(page, /OPCIONES_RAMA_RANKING_PUBLICO/);
    assert.match(page, /setActiveRama\(opcion\.value\)/);
    assert.match(page, /ctx\.rama === "masculino"/);
  });
});