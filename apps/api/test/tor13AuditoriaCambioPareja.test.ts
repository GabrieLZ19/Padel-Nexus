import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  construirResumenCambioPareja,
  detectarLadoCambiado,
} from "../src/utils/auditoriaOverridePareja.ts";
import { numerosVisiblesDePartidos } from "../src/utils/numerosVisiblesPartido.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-13 auditoría cambio de pareja en llave", () => {
  it("detecta cambio solo en lado B", () => {
    assert.equal(
      detectarLadoCambiado("a1", "b1", "a1", "b2"),
      "B",
    );
  });

  it("arma resumen esperado por QA", () => {
    const { resumen, valor_anterior, valor_nuevo } = construirResumenCambioPareja({
      numeroPartido: 17,
      lado: "B",
      nombreAntesA: "Pareja A",
      nombreAntesB: "Gómez / López",
      nombreNuevoA: "Pareja A",
      nombreNuevoB: "Ruiz / Martínez",
      prevA: "a",
      prevB: "b-old",
      nextA: "a",
      nextB: "b-new",
    });
    assert.equal(
      resumen,
      "Cambio de pareja · Partido #17 · Lado B: antes Gómez / López, ahora Ruiz / Martínez",
    );
    assert.equal(valor_anterior, "Gómez / López");
    assert.equal(valor_nuevo, "Ruiz / Martínez");
  });

  it("numeración visible continua zonas + llave", () => {
    const partidos = [
      { id: "z1", ronda: "Zona A", orden: 1 },
      { id: "z2", ronda: "Zona A", orden: 2 },
      { id: "l1", ronda: "OCTAVOS", orden: 49 },
    ];
    const map = numerosVisiblesDePartidos(partidos);
    assert.equal(map.get("z1"), 1);
    assert.equal(map.get("l1"), 3);
  });

  it("actualizarEquiposPartido registra cambio_pareja_llave con resumen", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(svc, /registrarAuditoriaCambioParejaPartido/);
    assert.doesNotMatch(svc, /accion: "override_rival_partido"/);
  });
});
