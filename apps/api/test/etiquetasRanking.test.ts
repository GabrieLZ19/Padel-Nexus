import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  etiquetaCategoriaRanking,
  tituloRankingEntidad,
  tituloRankingNacional,
} from "../../web/utils/rankings/etiquetas";

describe("nombres del ranking", () => {
  it("arma los títulos del documento sin cambiar el valor guardado", () => {
    assert.equal(etiquetaCategoriaRanking("7ª"), "7º");
    assert.equal(etiquetaCategoriaRanking("Sub-12"), "Pre Cadetes (Hasta 12 Años)");
    assert.equal(etiquetaCategoriaRanking("Sub-14"), "Cadetes (Hasta 14 Años)");

    assert.equal(
      tituloRankingNacional({ tipo: "libres", rama: "masculino", categoria: "7ª" }),
      "Ranking Nacional de Libres Caballeros 7º",
    );
    assert.equal(
      tituloRankingNacional({ tipo: "libres", rama: "femenino", categoria: "6ª" }),
      "Ranking Nacional de Libres Damas 6º",
    );
    assert.equal(
      tituloRankingNacional({ tipo: "menores", rama: "", categoria: "Sub-12" }),
      "Ranking Nacional Pre Cadetes (Hasta 12 Años)",
    );
    assert.equal(
      tituloRankingNacional({ tipo: "menores", rama: "", categoria: "Sub-14" }),
      "Ranking Nacional Cadetes (Hasta 14 Años)",
    );
    assert.equal(tituloRankingEntidad("masculino", "8ª"), "Ranking Masculino 8º");
    assert.equal(
      tituloRankingEntidad("femenino", "Sub-12"),
      "Ranking Femenino Pre Cadetes (Hasta 12 Años)",
    );
  });
});
