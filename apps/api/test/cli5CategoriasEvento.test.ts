import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  etiquetaCategoriaEventoTorneo,
  ordenarTorneosCategoriaEvento,
} from "../src/utils/gruposTorneo.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-5 categorías del evento", () => {
  it("etiquetaCategoriaEventoTorneo usa nivel y rama corta", () => {
    assert.equal(
      etiquetaCategoriaEventoTorneo({
        nombre: "Alta Barda — 7a Fem.",
        nivel: "7a",
        rama: "Femenina",
      }),
      "7a Fem.",
    );
    assert.equal(
      etiquetaCategoriaEventoTorneo({
        nombre: "Copa X",
        nivel: "5a",
        rama: "Masculina",
      }),
      "5a Masc.",
    );
  });

  it("ordenarTorneosCategoriaEvento agrupa por rama y nivel descendente", () => {
    const ordenados = ordenarTorneosCategoriaEvento([
      {
        id: "m5",
        nivel: "5a",
        rama: "Masculina",
        nombre: "E — 5a Masc.",
      },
      {
        id: "f7",
        nivel: "7a",
        rama: "Femenina",
        nombre: "E — 7a Fem.",
      },
      {
        id: "m7",
        nivel: "7a",
        rama: "Masculina",
        nombre: "E — 7a Masc.",
      },
      {
        id: "f6",
        nivel: "6a",
        rama: "Femenina",
        nombre: "E — 6a Fem.",
      },
    ]);
    assert.deepEqual(
      ordenados.map((t) => t.id),
      ["f7", "f6", "m7", "m5"],
    );
  });

  it("expone GET /torneos/:id/categorias-evento público", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(routes, /categorias-evento/);
    assert.match(routes, /getCategoriasEventoTorneo/);
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(svc, /listarCategoriasEvento/);
  });
});