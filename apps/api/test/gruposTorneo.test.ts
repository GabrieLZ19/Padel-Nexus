import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armarGruposTorneo } from "../src/utils/gruposTorneo";

describe("agrupado de competencias", () => {
  it("deja una sola fila que se abre en rama y después en categoría", () => {
    const grupos = armarGruposTorneo(
      [
        { id: "1", nombre: "Nacional Libres — 7ª Fem.", nivel: "7ª", rama: "Femenina", grupo_id: "comp-1" },
        { id: "2", nombre: "Nacional Libres — 6ª Fem.", nivel: "6ª", rama: "Femenina", grupo_id: "comp-1" },
        { id: "3", nombre: "Nacional Libres — 5ª Fem.", nivel: "5ª", rama: "Femenina", grupo_id: "comp-1" },
        { id: "4", nombre: "Nacional Libres — 7ª Masc.", nivel: "7ª", rama: "Masculina", grupo_id: "comp-1" },
        { id: "5", nombre: "Nacional Libres — 6ª Masc.", nivel: "6ª", rama: "Masculina", grupo_id: "comp-1" },
        { id: "6", nombre: "Nacional Libres — 5ª Masc.", nivel: "5ª", rama: "Masculina", grupo_id: "comp-1" },
        { id: "7", nombre: "Otro torneo", nivel: "4ª", rama: "Masculina", grupo_id: null },
      ],
      new Map([["comp-1", "Nacional Libres"]]),
    );

    assert.equal(grupos.length, 2);
    assert.equal(grupos[0].nombre, "Nacional Libres");
    assert.deepEqual(
      grupos[0].ramas.map((rama) => rama.etiqueta),
      ["Categorías Damas", "Categorías Caballeros"],
    );
    assert.deepEqual(
      grupos[0].ramas[0].torneos.map((torneo) => torneo.nivel),
      ["7ª", "6ª", "5ª"],
    );
    assert.deepEqual(
      grupos[0].ramas[1].torneos.map((torneo) => torneo.nivel),
      ["7ª", "6ª", "5ª"],
    );
    assert.equal(grupos[1].nombre, null);
  });
});
