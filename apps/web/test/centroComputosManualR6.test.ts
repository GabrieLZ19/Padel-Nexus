import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("R6: Centro de cómputos con ingreso manual y alta rápida", () => {
  it("el paso 1 no tiene el botón de Guardar Cambios deshabilitado por falta de sede", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    // El botón ya no debe exigir !editSede
    assert.equal(
      fuente.includes("!editNombre || !editFecha || !editSede"),
      false,
    );
    assert.match(fuente, /!editNombre\.trim\(\) \|\| !editFecha/);
  });

  it("la validación de campos obligatorios en handleSaveStep1 no bloquea por sede vacía", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.equal(
      fuente.includes('if (!editSede) incompletos.sede = "Elegí el centro de cómputos.";'),
      false,
    );
  });

  it("el selector de centro de cómputos no queda grisado ni deshabilitado si no hay clubes", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.equal(fuente.includes("disabled={clubs.length === 0}"), false);
    assert.match(fuente, /Sin clubes cargados/);
  });

  it("ofrece alta rápida de club e ingreso manual directamente en el paso 1", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.match(fuente, /Alta club/);
    assert.match(fuente, /Ingreso manual/);
    assert.match(fuente, /Alta Rápida de Club/);
    assert.match(fuente, /handleCrearClubRapido/);
    assert.match(fuente, /\+ Dar de alta nuevo club\.\.\./);
    assert.match(fuente, /✎ Ingresar nombre manualmente\.\.\./);
  });

  it("persiste centro_computos_manual en reglas_arbitraje al guardar", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.match(fuente, /centro_computos_manual:\s*centroComputosManual/);
  });

  it("P1: ingreso manual no anula club_id del organizador", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/wizard/Paso1Datos.tsx"),
      "utf8",
    );
    assert.equal(
      fuente.includes("const clubIdFinal = modoManualSede || !editSede ? null : editSede"),
      false,
      "no debe nullificar club_id solo por modo manual",
    );
    assert.match(fuente, /clubIdPreservado/);
    assert.match(fuente, /esRolClub\(userRole\)/);
    assert.match(
      fuente,
      /if \(modoManualSede\) \{\s*clubIdFinal = clubIdPreservado;/s,
    );
  });

  it("nombreSedeFiscal y las vistas públicas priorizan centro_computos_manual", () => {
    const fiscalFuente = readFileSync(
      path.join(RAIZ, "utils/services/fiscal-panel.ts"),
      "utf8",
    );
    assert.match(
      fiscalFuente,
      /centro_computos_manual[\s\S]*?clubes\?\.nombre/,
    );

    const publicoFuente = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/[id]/page.tsx"),
      "utf8",
    );
    assert.match(
      publicoFuente,
      /centro_computos_manual[\s\S]*?clubes\?\.nombre/,
    );
  });
});
