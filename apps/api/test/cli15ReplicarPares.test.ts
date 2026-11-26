import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { resolverParesReplicar } from "../src/utils/gruposTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-15 replicar por pares nivel+rama", () => {
  it("resolverParesReplicar usa pares explícitos sin producto cartesiano", () => {
    const pares = resolverParesReplicar(
      { nivel: "7a", rama: "Femenina" },
      {
        niveles: ["6a", "5a"],
        ramas: ["Femenina", "Masculina"],
        pares: [
          { nivel: "6a", rama: "Masculina" },
          { nivel: "5a", rama: "Femenina" },
        ],
      },
    );
    assert.equal(pares.length, 2);
    assert.ok(
      pares.some((p) => p.nivel === "6a" && p.rama === "Masculina"),
    );
    assert.ok(
      pares.some((p) => p.nivel === "5a" && p.rama === "Femenina"),
    );
    const cartesian = resolverParesReplicar(
      { nivel: "7a", rama: "Femenina" },
      { niveles: ["6a"], ramas: ["Femenina", "Masculina"] },
    );
    assert.equal(cartesian.length, 2);
  });

  it("API acepta pares en body de replicar", () => {
    const ctrl = readFileSync(
      path.join(RAIZ, "src/controllers/torneo.controller.ts"),
      "utf8",
    );
    assert.match(ctrl, /pares\?: Array/);
    assert.match(ctrl, /pares: paresNorm/);
    const modal = readFileSync(
      path.join(RAIZ, "../web/components/torneos/ReplicarTorneoModal.tsx"),
      "utf8",
    );
    assert.match(modal, /pares: paresPreview\.map/);
    assert.match(modal, /Origen/);
    assert.doesNotMatch(modal, /ramas: ramasPayload/);
  });
});