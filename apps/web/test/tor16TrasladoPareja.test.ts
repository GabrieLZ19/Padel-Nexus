import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { mensajesTrasladoParejaLlave } from "../utils/trasladoParejaLlave.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-16 traslado e intercambio en llave", () => {
  it("anuncia intercambio cuando había pareja en el lado editado", () => {
    const res = mensajesTrasladoParejaLlave({
      equipoAId: "p-destino-a",
      equipoBId: "p-origen",
      partidoId: "m-dest",
      baseline: { equipo_a_id: "p-destino-a", equipo_b_id: "p-saliente" },
      partidosLlave: [
        {
          id: "m-dest",
          orden: 1,
          ronda: "OCTAVOS",
          equipo_a_id: "p-destino-a",
          equipo_b_id: "p-origen",
        } as import("@/utils/types").Partido,
        {
          id: "m-origen",
          orden: 2,
          ronda: "OCTAVOS",
          equipo_a_id: "p-origen",
          equipo_b_id: "p-rival",
        } as import("@/utils/types").Partido,
      ],
      etiquetaPareja: (id) =>
        id === "p-saliente" ? "Jugador 02/03" : id === "p-origen" ? "J 12/13" : id || "-",
      numeroPartido: (id) => (id === "m-dest" ? 1 : id === "m-origen" ? 2 : null),
    });
    assert.equal(res.hayIntercambio, true);
    assert.match(res.avisos.join(" "), /Intercambio/);
    assert.match(res.avisos.join(" "), /Jugador 02\/03/);
    assert.match(res.avisos.join(" "), /partido #2/);
  });

  it("BracketEditor usa util de traslado y confirmación de intercambio", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /mensajesTrasladoParejaLlave/);
    assert.match(editor, /Confirmar intercambio/);
    assert.match(editor, /Intercambiar parejas en la llave/);
  });
});
