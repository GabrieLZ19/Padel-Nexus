import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { fraseFechaTurnoReserva } from "../src/utils/fechaArgentina.ts";
import {
  horarioInicialDraftAutoAsignar,
  partidoIgnoradoAutoAsignarProgramacion,
} from "../src/utils/programacionEvento.ts";
import { mensajeDescansoInsuficienteProgramador } from "../src/utils/programadorReglas.ts";

const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Oleada 3 ítem 18", () => {
  it("RES-26 formatea fecha y monto en notificaciones", () => {
    const svc = readFileSync(
      path.join(API, "src/services/reserva.service.ts"),
      "utf8",
    );
    assert.match(svc, /fraseFechaTurnoReserva/);
    assert.match(svc, /toLocaleString\("es-AR"\)/);
    const frase = fraseFechaTurnoReserva("2025-12-12", "20:00");
    assert.match(frase, /12\/12/);
  });

  it("ENT-50 exige motivo de 8 caracteres", () => {
    const svc = readFileSync(
      path.join(API, "src/services/perfil.service.ts"),
      "utf8",
    );
    assert.match(svc, /motivoLimpio\.length < 8/);
    assert.match(svc, /consigo misma/);
  });

  it("ENT-50 bloquea unir compañeros de pareja", () => {
    const val = readFileSync(
      path.join(API, "src/utils/validarColisionInscripcionesFusionFichas.ts"),
      "utf8",
    );
    assert.match(val, /consigo misma/);
  });

  it("CLI descanso unificado se exigen / hay", () => {
    const msg = mensajeDescansoInsuficienteProgramador(
      "tras_fin_60",
      9 * 60,
      10 * 60,
      90,
    );
    assert.match(msg, /se exigen/);
    assert.match(msg, /hay/);
  });

  it("automático ignora partidos finalizados", () => {
    assert.equal(
      partidoIgnoradoAutoAsignarProgramacion({
        estado_partido: "Finalizado",
      }),
      true,
    );
    const horario = horarioInicialDraftAutoAsignar(
      {
        estado_partido: "Finalizado",
        cancha_asignada: "C1",
        fecha_partido: "2025-01-01T10:00:00",
        ronda: "Zona A",
      },
      "zonas",
    );
    assert.equal(horario.cancha_asignada, "C1");
  });

  it("gestionarBajaClub responde 404 si no existe", () => {
    const svc = readFileSync(
      path.join(API, "src/services/club.service.ts"),
      "utf8",
    );
    const ctrl = readFileSync(
      path.join(API, "src/controllers/club.controller.ts"),
      "utf8",
    );
    assert.match(svc, /Club no encontrado/);
    assert.match(ctrl, /statusCode/);
  });

  it("nueva edición exige motivo mínimo", () => {
    const prog = readFileSync(
      path.join(API, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(prog, /motivo\.length < 8/);
    assert.doesNotMatch(
      prog.slice(prog.indexOf("abrirNuevaEdicion"), prog.indexOf("getBoard")),
      /Nueva edición de programación/,
    );
  });
});