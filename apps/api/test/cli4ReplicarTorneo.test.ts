import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  nombreBaseTorneo,
  nombreTorneoReplicado,
} from "../src/utils/gruposTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-4 replicar torneo", () => {
  it("nombreTorneoReplicado quita sufijos del origen y arma nivel + rama", () => {
    const nombre = nombreTorneoReplicado(
      "Alta Barda Open — 7a Fem.",
      "7a",
      "Femenina",
      "6a",
      "Femenina",
    );
    assert.equal(nombre, "Alta Barda Open — 6a Fem.");
    const base = nombreBaseTorneo("Copa Neuquén — 5a Masc.", "5a", "Masculina");
    assert.equal(base, "Copa Neuquén");
    const mix = nombreTorneoReplicado(
      "Copa Neuquén — 5a Masc.",
      "5a",
      "Masculina",
      "4a",
      "Mixta",
    );
    assert.equal(mix, "Copa Neuquén — 4a Mix.");
  });

  it("replicar copia fechas, dias, puntos y sedes", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async replicarTorneo"),
      svc.indexOf("private static async resolveFapAsociacionId"),
    );
    assert.match(bloque, /dias_juego: diasOrigen/);
    assert.match(bloque, /fecha_fin: origen\.fecha_fin/);
    assert.match(bloque, /configuracion_puntos: origen\.configuracion_puntos/);
    assert.match(bloque, /clonarSedesYDisponibilidadDesdeTorneo/);
    assert.doesNotMatch(bloque, /soloMismaRama/);
  });

  it("controller no fuerza solo misma rama para admin_club", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.doesNotMatch(ctrl, /soloMismaRama/);
    assert.match(ctrl, /replicarTorneo/);
  });
});