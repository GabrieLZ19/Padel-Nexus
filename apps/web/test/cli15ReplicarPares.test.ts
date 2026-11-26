import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  claveParNivelRama,
  opcionesParesReplicar,
} from "../utils/replicarTorneoPares.ts";

describe("CLI-15 frontend pares replicar", () => {
  it("opcionesParesReplicar excluye el par origen", () => {
    const opts = opcionesParesReplicar(
      [
        { value: "7a", label: "7ª" },
        { value: "6a", label: "6ª" },
      ],
      [
        { value: "Femenina", label: "Femenina" },
        { value: "Masculina", label: "Masculina" },
      ],
      { nivel: "7a", rama: "Femenina" },
    );
    assert.ok(opts.length >= 2);
    assert.ok(
      !opts.some(
        (p) =>
          p.nivel === "7a" &&
          p.rama === "Femenina" &&
          claveParNivelRama(String(p.rama), p.nivel) ===
            claveParNivelRama("Femenina", "7a"),
      ),
    );
  });
});