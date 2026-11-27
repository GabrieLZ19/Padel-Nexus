import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  coincideFiltroEstadoPublico,
  vistaEstadoTorneoPublico,
} from "../utils/estadoTorneoPublico.ts";
import { etiquetaChipCategoriaTorneoPublico } from "../utils/etiquetaCategoriaEvento.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Oleada 3 ítem 16 — PUB-31 filtros públicos", () => {
  it("Programado incluye torneos en curso antes del primer partido", () => {
    assert.equal(
      coincideFiltroEstadoPublico("Programado", {
        estado: "En curso",
        fecha_primer_partido: "2099-06-15",
        ahora: new Date("2099-06-01T15:00:00.000Z"),
      }),
      true,
    );
    assert.equal(
      coincideFiltroEstadoPublico("En curso", {
        estado: "En curso",
        fecha_primer_partido: "2099-06-15",
        ahora: new Date("2099-06-01T15:00:00.000Z"),
      }),
      false,
    );
  });

  it("En curso coincide el día del primer partido", () => {
    assert.equal(
      coincideFiltroEstadoPublico("En curso", {
        estado: "En curso",
        fecha_primer_partido: "2099-06-15T18:00:00.000Z",
        ahora: new Date("2099-06-15T14:00:00.000Z"),
      }),
      true,
    );
  });

  it("el listado usa coincideFiltroEstadoPublico", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /coincideFiltroEstadoPublico/);
  });
});

describe("Oleada 3 ítem 16 — PUB-33 chip categoría", () => {
  it("prioriza nivel y rama en familia Libres", () => {
    assert.equal(
      etiquetaChipCategoriaTorneoPublico({
        nivel: "7a",
        categoria: "Libres",
        rama: "Femenina",
      }),
      "7ª Damas",
    );
    assert.equal(
      etiquetaChipCategoriaTorneoPublico({
        nivel: "5a",
        categoria: "Libres",
        rama: "Masculina",
      }),
      "5ª Libre",
    );
  });
});

describe("Oleada 3 ítem 16 — PUB-31 detalle", () => {
  it("el detalle usa vistaEstadoTorneoPublico", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /vistaEstadoTorneoPublico/);
    assert.match(pagina, /etiquetaEstadoPublico/);
  });

  it("vista coherente entre listado y detalle para Próximo", () => {
    const params = {
      estado: "En curso",
      fecha_primer_partido: "2099-08-01",
      ahora: new Date("2099-07-01T12:00:00.000Z"),
    };
    assert.equal(vistaEstadoTorneoPublico(params).etiqueta, "Próximo");
  });
});

describe("Oleada 3 ítem 16 — PUB-35 legales", () => {
  it("migración limpia títulos modo prueba", () => {
    const sql = readFileSync(
      path.resolve(RAIZ, "../../supabase/migrations/20261127150000_pub35_limpiar_modo_prueba_legales.sql"),
      "utf8",
    );
    assert.match(sql, /tipo = 'tyc'/);
    assert.match(sql, /tipo = 'privacidad'/);
    assert.match(sql, /Términos y Condiciones Generales de Uso/);
    assert.match(sql, /SET titulo = 'Política de Privacidad'/);
  });
});