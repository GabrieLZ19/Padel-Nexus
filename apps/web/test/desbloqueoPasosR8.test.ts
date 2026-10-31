import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWizardPasoReadOnly,
  pasoBloqueadoPorAlcance,
  ORDEN_PASOS_WIZARD,
  type WizardPasoId,
} from "../components/torneos/wizard/stepLocks.ts";

describe("R8 - Desbloqueo de pasos anteriores y corrección de datos", () => {
  it("en estado Programado los pasos 1 a 7 (edit, logos, categories, players, fiscales, cierre, draws) NO quedan bloqueados con candado", () => {
    const pasosDesbloqueados: WizardPasoId[] = [
      "edit",
      "logos",
      "categories",
      "players",
      "fiscales",
      "cierre",
      "draws",
    ];

    for (const paso of pasosDesbloqueados) {
      assert.equal(
        isWizardPasoReadOnly("Programado", paso),
        false,
        `El paso ${paso} no debe ser de solo lectura en estado Programado`,
      );
      assert.equal(
        pasoBloqueadoPorAlcance({ estado: "Programado" }, paso),
        false,
        `El paso ${paso} no debe tener candado en TournamentWizardNav en estado Programado`,
      );
    }

    // Solo matches (Resultados) permanece bloqueado en Programado hasta publicar horarios
    assert.equal(
      isWizardPasoReadOnly("Programado", "matches"),
      true,
      "Resultados permanece bloqueado hasta pasar a En curso",
    );
    assert.equal(
      pasoBloqueadoPorAlcance({ estado: "Programado" }, "matches"),
      true,
      "Resultados muestra candado en Programado",
    );
  });

  it("en estado En curso todos los pasos incluido resultados son editables", () => {
    for (const paso of ORDEN_PASOS_WIZARD) {
      assert.equal(
        isWizardPasoReadOnly("En curso", paso),
        false,
        `El paso ${paso} debe ser editable en estado En curso`,
      );
      assert.equal(
        pasoBloqueadoPorAlcance({ estado: "En curso" }, paso),
        false,
        `El paso ${paso} no debe tener candado en estado En curso`,
      );
    }
  });

  it("en estado Finalizado todos los pasos quedan bloqueados en modo lectura histórica", () => {
    for (const paso of ORDEN_PASOS_WIZARD) {
      assert.equal(
        isWizardPasoReadOnly("Finalizado", paso),
        true,
        `El paso ${paso} debe ser de solo lectura en estado Finalizado`,
      );
      assert.equal(
        pasoBloqueadoPorAlcance({ estado: "Finalizado" }, paso),
        true,
        `El paso ${paso} debe tener candado en estado Finalizado`,
      );
    }
  });

  it("si el torneo tiene solo_lectura (otra entidad), los pasos de configuración quedan bloqueados", () => {
    assert.equal(
      pasoBloqueadoPorAlcance(
        { estado: "Programado", solo_lectura: true },
        "categories",
      ),
      true,
    );
    assert.equal(
      pasoBloqueadoPorAlcance(
        { estado: "Programado", solo_lectura: true },
        "players",
      ),
      true,
    );
  });

  it("permite corregir días de competencia (Paso 3) en torneos ya Programados sin bloqueo", () => {
    // Escenario F1: torneo ya avanzó a Programado pero faltan días de juego
    const bloqueadoPaso3 = pasoBloqueadoPorAlcance(
      { estado: "Programado" },
      "categories",
    );
    assert.equal(
      bloqueadoPaso3,
      false,
      "Paso 3 Categorías debe ser editable en Programado para permitir cargar días de competencia",
    );
  });
});
