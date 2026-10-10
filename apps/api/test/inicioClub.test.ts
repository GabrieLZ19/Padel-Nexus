import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  precioDeTurno,
  rangoMesCalendario,
  tasaOcupacion,
  turnosDisponiblesEntre,
} from "../src/utils/ocupacionClub.ts";
import { compararCanchas, nombreCanchaNormalizado } from "../src/utils/ordenCanchas.ts";

describe("ocupación del inicio del club", () => {
  it("cuenta cada plantilla solo en su día de la semana", () => {
    const { desde, hasta } = rangoMesCalendario("2026-09-27");
    assert.equal(desde, "2026-09-01");
    assert.equal(hasta, "2026-10-01");

    const turnos = [
      ...Array.from({ length: 31 }, () => ({ dia_semana: 0 })),
      ...Array.from({ length: 44 }, () => ({ dia_semana: 1 })),
      ...Array.from({ length: 41 }, () => ({ dia_semana: 2 })),
      ...Array.from({ length: 41 }, () => ({ dia_semana: 3 })),
      ...Array.from({ length: 41 }, () => ({ dia_semana: 4 })),
      ...Array.from({ length: 41 }, () => ({ dia_semana: 5 })),
      ...Array.from({ length: 31 }, () => ({ dia_semana: 6 })),
    ];
    const disponibles = turnosDisponiblesEntre(turnos, desde, hasta);

    assert.equal(disponibles, 1162);
    assert.equal(Math.round((9 / (turnos.length * 30)) * 100), 0);
    assert.equal(tasaOcupacion(9, disponibles), 1);
    assert.equal(tasaOcupacion(0, disponibles), 0);
  });

  it("un turno de los martes de septiembre ofrece cinco lugares", () => {
    const disponibles = turnosDisponiblesEntre(
      [{ dia_semana: 2 }],
      "2026-09-01",
      "2026-10-01",
    );
    assert.equal(disponibles, 5);
    assert.equal(tasaOcupacion(1, disponibles), 20);
  });

  it("lee el precio del turno embebido", () => {
    assert.equal(precioDeTurno({ precio: "15000" }), 15000);
    assert.equal(precioDeTurno([{ precio: 8000 }]), 8000);
    assert.equal(precioDeTurno(null), 0);
  });
});

describe("orden de canchas", () => {
  it("ordena por número y deja el nombre completo para desempatar", () => {
    const canchas = [
      { nombre: "Cancha 3 | Clases Grupales" },
      { nombre: "Cancha 10" },
      { nombre: "Cancha 3 - Blindex" },
      { nombre: "Cancha Central" },
      { nombre: "Cancha 2 - Premium Court" },
    ].sort(compararCanchas);

    assert.deepEqual(
      canchas.map((cancha) => cancha.nombre),
      [
        "Cancha 2 - Premium Court",
        "Cancha 3 - Blindex",
        "Cancha 3 | Clases Grupales",
        "Cancha 10",
        "Cancha Central",
      ],
    );
  });

  it("trata como igual un nombre con espacios o mayúsculas distintas", () => {
    assert.equal(nombreCanchaNormalizado("  Cancha   3 "), nombreCanchaNormalizado("cancha 3"));
  });
});
