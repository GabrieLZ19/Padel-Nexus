import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  debePersistirHorarioAutoAsignar,
  draftIntercambioHorariosEvento,
  horarioInicialDraftAutoAsignar,
} from "../src/utils/programacionEvento.ts";
import { ocupadosTrasIntercambio } from "../src/utils/programacionIntercambio.ts";
import {
  asignarHorariosAPartidos,
  buildOcupadosDesdePartidos,
  duracionParaFase,
  finWallClockTrasPartidos,
  generarSlotsDesdeSedesYVentana,
  parseFechaPartidoIsoPublic,
  type DisponibilidadTorneo,
  type PartidoProgramable,
} from "../src/utils/programacionPartidos.ts";
import { esRondaCampeonato } from "../src/utils/programadorReglas.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiSrc = path.join(__dirname, "../src");

describe("CLI-16 y CLI-17 — auto evento e intercambio atómico", () => {
  it("draftIntercambioHorariosEvento intercambia posiciones en memoria", () => {
    const base: PartidoProgramable[] = [
      {
        id: "p1",
        ronda: "Zona A",
        cancha_asignada: "Club X · 1",
        fecha_partido: "2026-11-28T10:00:00.000Z",
        estado_partido: "Programado",
        equipo_a_id: null,
        equipo_b_id: null,
      },
      {
        id: "p2",
        ronda: "Zona B",
        cancha_asignada: "Club X · 2",
        fecha_partido: "2026-11-28T11:00:00.000Z",
        estado_partido: "Programado",
        equipo_a_id: null,
        equipo_b_id: null,
      },
    ];
    const draft = draftIntercambioHorariosEvento(base, {
      partido_id: "p1",
      occupant_id: "p2",
      destino: {
        fecha_iso: "2026-11-28T11:00:00.000Z",
        cancha_label: "Club X · 2",
      },
      origen: {
        fecha_iso: "2026-11-28T10:00:00.000Z",
        cancha_label: "Club X · 1",
      },
    });
    const a = draft.find((p) => p.id === "p1");
    const b = draft.find((p) => p.id === "p2");
    assert.equal(a?.cancha_asignada, "Club X · 2");
    assert.equal(b?.cancha_asignada, "Club X · 1");
    const ocupados = ocupadosTrasIntercambio(draft);
    assert.ok(ocupados.size >= 2);
  });

  it("autoAsignar evento usa zonas_primero, omitirBoard y dos fases", () => {
    const src = readFileSync(
      path.join(apiSrc, "services/programacionEvento.service.ts"),
      "utf8",
    );
    assert.match(src, /distribucion:\s*"zonas_primero"/);
    assert.match(src, /omitirBoard:\s*true/);
    assert.match(src, /for \(const soloFase of \["zonas", "llave"\]/);
    assert.match(src, /cargarPartidosProgramablesEvento\(grupoId\)/);
    const prog = readFileSync(
      path.join(apiSrc, "services/programacion.service.ts"),
      "utf8",
    );
    assert.match(prog, /horarioInicialDraftAutoAsignar/);
    assert.match(prog, /debePersistirHorarioAutoAsignar/);
  });

  it("CLI-16 preserva horarios de zona al iniciar pasada llave", () => {
    const zona = horarioInicialDraftAutoAsignar(
      {
        ronda: "Zona A",
        cancha_asignada: "Club · 1",
        fecha_partido: "2026-11-29T10:00:00-03:00",
        horario_bloqueado: false,
      },
      "llave",
    );
    assert.equal(zona.cancha_asignada, "Club · 1");
    assert.ok(zona.fecha_partido);

    const octavo = horarioInicialDraftAutoAsignar(
      {
        ronda: "OCTAVOS",
        cancha_asignada: "Club · 2",
        fecha_partido: "2026-11-29T14:00:00-03:00",
        horario_bloqueado: false,
      },
      "llave",
    );
    assert.equal(octavo.cancha_asignada, null);
    assert.equal(octavo.fecha_partido, null);

    assert.equal(debePersistirHorarioAutoAsignar("Zona B", "zonas"), true);
    assert.equal(debePersistirHorarioAutoAsignar("CUARTOS", "zonas"), false);
    assert.equal(debePersistirHorarioAutoAsignar("Zona C", "llave"), false);
    assert.equal(debePersistirHorarioAutoAsignar("SEMIS", "llave"), true);
  });

  it("CLI-11/16 evento 3 categorías: 39/39 y llave después de zonas", () => {
    const cancha: DisponibilidadTorneo = {
      club_id: "club-qa",
      cancha_id: "c1",
      fecha: "2026-11-28",
      hora_inicio: "08:00:00",
      clubes: { nombre: "Club QA" },
      canchas: { nombre: "1" },
    };
    const canchas = [1, 2, 3, 4, 5].map((n) => ({
      ...cancha,
      cancha_id: `c${n}`,
      canchas: { nombre: String(n) },
    }));
    const dias = ["2026-11-28", "2026-11-29", "2026-11-30"];
    const slots = generarSlotsDesdeSedesYVentana({
      canchas,
      dias,
      duracionMinutos: 90,
      horaInicioMin: 8 * 60,
      horaFinMin: 22 * 60,
    });
    const ultimoDia = dias[dias.length - 1];
    const slotsSinDomingo = slots.filter((s) => s.fecha !== ultimoDia);
    const slotsDomingo = slots.filter((s) => s.fecha === ultimoDia);

    function crearCategoria(cat: string): PartidoProgramable[] {
      const zonas = ["A", "B", "C", "D"].flatMap((z, zi) =>
        [1, 2].map((o) => ({
          id: `${cat}-z${z}${o}`,
          ronda: `Zona ${z}`,
          orden: zi * 2 + o,
          estado_partido: "Programado",
          equipo_a_id: `${cat}-${z}a`,
          equipo_b_id: `${cat}-${z}b`,
        })),
      );
      const llave = [
        { id: `${cat}-oct1`, ronda: "OCTAVOS", orden: 1 },
        { id: `${cat}-oct2`, ronda: "OCTAVOS", orden: 2 },
        { id: `${cat}-cua1`, ronda: "CUARTOS", orden: 3 },
        { id: `${cat}-cua2`, ronda: "CUARTOS", orden: 4 },
        { id: `${cat}-sem`, ronda: "SEMIS", orden: 5 },
      ].map((p) => ({
        ...p,
        estado_partido: "Programado",
        equipo_a_id: `${cat}-la`,
        equipo_b_id: `${cat}-lb`,
      }));
      return [...zonas, ...llave];
    }

    const categorias = [crearCategoria("c1"), crearCategoria("c2"), crearCategoria("c3")];
    assert.equal(categorias.flat().length, 39);

    const duracionTorneo = 90;
    const durZona = duracionParaFase(duracionTorneo, "zonas");
    const durLlave = duracionParaFase(duracionTorneo, "llave");
    const descansoOpts = { descansoModo: "tras_fin_60" as const, descansoMinutos: 60 };
    let ocupados = new Set<string>();

    for (const drafts of categorias) {
      const zonas = drafts.filter((p) => /^ZONA\s+/i.test(String(p.ronda)));
      asignarHorariosAPartidos(drafts, slotsSinDomingo.length ? slotsSinDomingo : slots, ocupados, {
        duracionMinutos: durZona,
        ...descansoOpts,
        limitarAIds: new Set(zonas.map((z) => z.id!)),
      });
      const sinZona = zonas.filter((z) => !z.cancha_asignada || !z.fecha_partido);
      if (sinZona.length) {
        const ocupadosZ = buildOcupadosDesdePartidos(
          categorias.flat().filter((p) => p.cancha_asignada && p.fecha_partido),
        );
        for (const k of ocupados) ocupadosZ.add(k);
        asignarHorariosAPartidos(drafts, slots, ocupadosZ, {
          duracionMinutos: durZona,
          ...descansoOpts,
          limitarAIds: new Set(sinZona.map((z) => z.id!)),
        });
      }
      ocupados = buildOcupadosDesdePartidos(
        categorias.flat().filter((p) => p.cancha_asignada && p.fecha_partido),
      );
    }

    const zonasTotales = categorias.flat().filter((p) => /^ZONA\s+/i.test(String(p.ronda)));
    assert.equal(
      zonasTotales.filter((z) => z.cancha_asignada && z.fecha_partido).length,
      24,
    );

    for (const drafts of categorias) {
      const zonas = drafts.filter((p) => /^ZONA\s+/i.test(String(p.ronda)));
      const llave = drafts.filter((p) => !/^ZONA\s+/i.test(String(p.ronda)));
      const notBefore = finWallClockTrasPartidos(zonas, durZona, descansoOpts);
      const previas = llave.filter((p) => !esRondaCampeonato(p.ronda));

      if (previas.length) {
        asignarHorariosAPartidos(drafts, slotsSinDomingo.length ? slotsSinDomingo : slots, ocupados, {
          duracionMinutos: durLlave,
          duracionZonaMinutos: durZona,
          permitirSinEquipos: true,
          notBeforeExtra: notBefore,
          ...descansoOpts,
          limitarAIds: new Set(previas.map((p) => p.id!)),
        });
        ocupados = buildOcupadosDesdePartidos(
          categorias.flat().filter((p) => p.cancha_asignada && p.fecha_partido),
        );
      }

      let pendientes = llave.filter((p) => !p.cancha_asignada || !p.fecha_partido);
      if (pendientes.length) {
        asignarHorariosAPartidos(drafts, slotsDomingo.length ? slotsDomingo : slots, ocupados, {
          duracionMinutos: durLlave,
          duracionZonaMinutos: durZona,
          permitirSinEquipos: true,
          notBeforeExtra: notBefore,
          distribucion: "continua",
          ...descansoOpts,
          limitarAIds: new Set(pendientes.map((p) => p.id!)),
        });
        ocupados = buildOcupadosDesdePartidos(
          categorias.flat().filter((p) => p.cancha_asignada && p.fecha_partido),
        );
      }

      pendientes = llave.filter((p) => !p.cancha_asignada || !p.fecha_partido);
      if (pendientes.length) {
        const ocupadosFin = buildOcupadosDesdePartidos(
          categorias.flat().filter((p) => p.cancha_asignada && p.fecha_partido),
        );
        asignarHorariosAPartidos(drafts, slots, ocupadosFin, {
          duracionMinutos: durLlave,
          duracionZonaMinutos: durZona,
          permitirSinEquipos: true,
          notBeforeExtra: notBefore,
          distribucion: "continua",
          ...descansoOpts,
          limitarAIds: new Set(pendientes.map((p) => p.id!)),
        });
        ocupados = buildOcupadosDesdePartidos(
          categorias.flat().filter((p) => p.cancha_asignada && p.fecha_partido),
        );
      }
    }

    const todos = categorias.flat();
    assert.equal(
      todos.filter((p) => p.cancha_asignada && p.fecha_partido).length,
      39,
    );

    for (const cat of categorias) {
      const zonas = cat.filter((p) => /^ZONA\s+/i.test(String(p.ronda)));
      const llave = cat.filter((p) => !/^ZONA\s+/i.test(String(p.ronda)));
      let maxFinZona = 0;
      for (const z of zonas) {
        const parsed = parseFechaPartidoIsoPublic(String(z.fecha_partido));
        if (!parsed) continue;
        maxFinZona = Math.max(maxFinZona, parsed.startMin + durZona);
      }
      for (const l of llave) {
        const parsed = parseFechaPartidoIsoPublic(String(l.fecha_partido));
        assert.ok(parsed, l.id);
        if (parsed.fecha === dias[0]) {
          assert.ok(
            parsed.startMin >= maxFinZona,
            `${l.id} no debe ir antes del fin de zonas el mismo día`,
          );
        }
      }
    }
  });

  it("intercambio persiste con rollback al fallar el segundo update", () => {
    const src = readFileSync(
      path.join(apiSrc, "utils/programacionIntercambio.ts"),
      "utf8",
    );
    assert.match(src, /restaurarHorario\(partido_id, snapA\)/);
    assert.match(src, /restaurarHorario\(occupant_id, snapB\)/);
    assert.match(src, /validarIntercambioHorariosEvento/);
  });
});