import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { elegirProximoPartido } from "../src/utils/proximoPartido";

const ahora = new Date("2026-10-09T15:00:00-03:00");

describe("próximo partido del jugador", () => {
  it("elige el pendiente de hoy o de después, no uno ya jugado", () => {
    const elegido = elegirProximoPartido(
      [
        {
          id: "pasado",
          fecha: "2026-09-30T22:00:00Z",
          jugado: false,
        },
        {
          id: "hoy",
          fecha: "2026-10-09T22:00:00Z",
          jugado: false,
        },
        {
          id: "jugado",
          fecha: "2026-10-10T15:00:00Z",
          jugado: true,
        },
      ],
      ahora,
    );
    assert.equal(elegido?.id, "hoy");
  });

  it("si no hay fecha futura, muestra el pendiente más antiguo con hora", () => {
    const elegido = elegirProximoPartido(
      [
        {
          id: "tarde",
          fecha: "2026-09-30T22:00:00Z",
          jugado: false,
        },
        {
          id: "antes",
          fecha: "2026-09-30T15:30:00Z",
          jugado: false,
        },
      ],
      ahora,
    );
    assert.equal(elegido?.id, "antes");
  });
});
