import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCapacidadesZonasPorReglamento as zonasApi } from "../src/utils/capacidadesZonas";
import { puedeJugarEnNivelTorneo } from "../src/utils/inscripcionElegibilidad";
import { resolverReglamentoPersistido } from "../src/utils/reglamentoTorneo";
import {
  esTorneoContextoFederacion,
  getCapacidadesZonasPorReglamento as zonasWeb,
  getNivelesParaCategoria,
  getReglamentosPermitidos,
  reglamentoTorneo,
  usarPlanillaInscripcionFap,
} from "../../web/utils/constants/fapApaRules";

const valores = (items: { value: string }[]) => items.map((item) => item.value);

describe("reglamentos FAP y APA se aplican", () => {
  it("un torneo provincial conserva APA y uno nacional queda en FAP", () => {
    assert.equal(
      resolverReglamentoPersistido({ alcance: "Provincial", reglamento: "APA" }),
      "APA",
    );
    assert.equal(
      resolverReglamentoPersistido({ alcance: "Nacional", reglamento: "APA" }),
      "FAP",
    );
    assert.equal(reglamentoTorneo({ reglamento: "APA" }), "APA");
    assert.equal(reglamentoTorneo({}), "FAP");
  });

  it("las categorías de ladies y menores no son las mismas", () => {
    const fapLadies = valores(getNivelesParaCategoria("FAP", "Ladies & Veteranos"));
    const apaLadies = valores(getNivelesParaCategoria("APA", "Ladies & Veteranos"));
    assert.ok(fapLadies.includes("Seniors +30"));
    assert.ok(apaLadies.includes("Senior +35"));
    assert.equal(apaLadies.includes("Seniors +30"), false);
    assert.equal(fapLadies.includes("Senior +35"), false);

    const fapMenores = valores(getNivelesParaCategoria("FAP", "Menores"));
    const apaMenores = valores(getNivelesParaCategoria("APA", "Menores"));
    assert.ok(fapMenores.includes("Sub-12 Promocional"));
    assert.equal(apaMenores.includes("Sub-12 Promocional"), false);
  });

  it("la edad del nivel APA se exige igual que la del nivel FAP", () => {
    const menor = {
      fechaNacimiento: "2010-01-01",
      fechaReferencia: "2026-10-01",
    };
    const mayor = {
      fechaNacimiento: "1980-01-01",
      fechaReferencia: "2026-10-01",
    };
    assert.equal(
      puedeJugarEnNivelTorneo("Senior +35", "Senior +35", menor, {
        validarEdad: true,
      }).permitido,
      false,
    );
    assert.equal(
      puedeJugarEnNivelTorneo("Senior +35", "Senior +35", mayor, {
        validarEdad: true,
      }).permitido,
      true,
    );
    assert.equal(
      puedeJugarEnNivelTorneo("Seniors +30", "Seniors +30", menor, {
        validarEdad: true,
      }).permitido,
      false,
    );
  });

  it("FAP y APA arman zonas de a 3 y Amateur de a 4, en API y en el wizard", () => {
    assert.deepEqual(zonasApi(16, "FAP"), zonasApi(16, "APA"));
    assert.deepEqual(zonasApi(16, "APA"), zonasWeb(16, "APA"));
    assert.deepEqual(zonasApi(16, "FAP"), [4, 3, 3, 3, 3]);
    assert.deepEqual(zonasApi(16, "Amateur"), [4, 4, 4, 4]);
    assert.deepEqual(zonasWeb(16, "Amateur"), [4, 4, 4, 4]);
    assert.deepEqual(zonasApi(5, "APA"), [2, 3]);
    assert.deepEqual(zonasWeb(5, "FAP"), [2, 3]);
  });

  it("la planilla con letra y el cobro federativo no se aplican a un APA provincial", () => {
    const apa = { alcance: "Provincial", reglamento: "APA" };
    const fap = { alcance: "Provincial", reglamento: "FAP" };
    assert.equal(usarPlanillaInscripcionFap(apa), false);
    assert.equal(usarPlanillaInscripcionFap(fap), true);
    assert.equal(esTorneoContextoFederacion(apa, "admin_club"), false);
    assert.equal(esTorneoContextoFederacion(fap, "admin_club"), true);
  });

  it("Amateur no aparece en un alcance provincial", () => {
    const provincial = getReglamentosPermitidos("admin_club", "Provincial").map(
      (item) => item.value,
    );
    const local = getReglamentosPermitidos("admin_club", "Local").map(
      (item) => item.value,
    );
    assert.deepEqual(provincial, ["FAP", "APA"]);
    assert.ok(local.includes("Amateur"));
  });
});
