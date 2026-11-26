import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  normalizarFilasDisponibilidadEvento,
  unionDisponibilidad,
} from "../src/utils/programacionEvento.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-9 sedes y canchas compartidas del evento", () => {
  it("expone rutas de persistencia en el programador maestro", () => {
    const routes = readFileSync(
      path.join(RAIZ, "src/routes/torneo.routes.ts"),
      "utf8",
    );
    assert.match(routes, /grupos\/:grupoId\/programacion\/sedes/);
    assert.match(
      routes,
      /grupos\/:grupoId\/programacion\/canchas-disponibilidad/,
    );
  });

  it("ProgramacionEventoService propaga a todas las categorías", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(svc, /guardarSedesEvento/);
    assert.match(svc, /guardarCanchasDisponibilidadEvento/);
    assert.match(svc, /for \(const t of meta\.torneos\)/);
  });

  it("getBoard y autoAsignar usan disponibilidad compartida del evento", () => {
    const prog = readFileSync(
      path.join(RAIZ, "src/services/programacion.service.ts"),
      "utf8",
    );
    assert.match(prog, /disponibilidadCompartidaEvento/);
  });

  it("normalizarFilasDisponibilidadEvento descarta filas incompletas", () => {
    const filas = normalizarFilasDisponibilidadEvento([
      {
        club_id: "c1",
        cancha_id: "k1",
        fecha: "2026-11-28",
        hora_inicio: "08:00:00",
      },
      { club_id: "", cancha_id: "k2", fecha: "2026-11-28", hora_inicio: "09:00" },
    ]);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].club_id, "c1");
  });

  it("unionDisponibilidad deduplica canchas por club/cancha/fecha/franja", () => {
    const union = unionDisponibilidad([
      [
        {
          club_id: "c1",
          cancha_id: "k1",
          fecha: "2026-11-28",
          hora_inicio: "08:00:00",
          hora_fin: "23:59:59",
        },
      ],
      [
        {
          club_id: "c1",
          cancha_id: "k1",
          fecha: "2026-11-28",
          hora_inicio: "08:00:00",
          hora_fin: "23:59:59",
        },
        {
          club_id: "c1",
          cancha_id: "k2",
          fecha: "2026-11-28",
          hora_inicio: "08:00:00",
          hora_fin: "23:59:59",
        },
      ],
    ]);
    assert.equal(union.length, 2);
  });
});