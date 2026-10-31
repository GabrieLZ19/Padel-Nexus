import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("R9 - Asignar varios partidos a la vez en el programador", () => {
  interface MockPartido {
    id: string;
    zona_id: string | null;
    fase: string | null;
    orden_en_zona: number | null;
    cancha_asignada: string | null;
    fecha_partido: string | null;
  }

  const partidosPrueba: MockPartido[] = [
    { id: "p-za-1", zona_id: "zona-a", fase: "zona", orden_en_zona: 1, cancha_asignada: null, fecha_partido: null },
    { id: "p-za-2", zona_id: "zona-a", fase: "zona", orden_en_zona: 2, cancha_asignada: null, fecha_partido: null },
    { id: "p-za-3", zona_id: "zona-a", fase: "zona", orden_en_zona: 3, cancha_asignada: null, fecha_partido: null },
    { id: "p-zb-1", zona_id: "zona-b", fase: "zona", orden_en_zona: 1, cancha_asignada: null, fecha_partido: null },
    { id: "p-zb-2", zona_id: "zona-b", fase: "zona", orden_en_zona: 2, cancha_asignada: "Cancha 1", fecha_partido: "2026-11-01T10:00:00" },
    { id: "p-zc-1", zona_id: "zona-c", fase: "zona", orden_en_zona: 1, cancha_asignada: null, fecha_partido: null },
    { id: "p-zc-2", zona_id: "zona-c", fase: "zona", orden_en_zona: 2, cancha_asignada: null, fecha_partido: null },
  ];

  it("permite seleccionar partidos individuales de diferentes zonas (ej: Zona A p1 y p2, Zona B p1, Zona C p1 y p2)", () => {
    const selectedIds = new Set<string>();

    const toggle = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    };

    let selection = toggle("p-za-1");
    selection = new Set([...selection, "p-za-2", "p-zb-1", "p-zc-1", "p-zc-2"]);

    assert.equal(selection.size, 5);
    assert.ok(selection.has("p-za-1"));
    assert.ok(selection.has("p-za-2"));
    assert.ok(selection.has("p-zb-1"));
    assert.ok(selection.has("p-zc-1"));
    assert.ok(selection.has("p-zc-2"));
    assert.ok(!selection.has("p-za-3"));
    assert.ok(!selection.has("p-zb-2"));
  });

  it("el toggle de grupo selecciona todos los partidos no asignados de esa zona", () => {
    const unassignedZoneA = partidosPrueba
      .filter((p) => p.zona_id === "zona-a" && !p.cancha_asignada && !p.fecha_partido)
      .map((p) => p.id);

    assert.equal(unassignedZoneA.length, 3);

    let selectedIds = new Set<string>();
    // Click toggle de grupo Zona A -> agrega los 3
    const allSelected = unassignedZoneA.every((id) => selectedIds.has(id));
    assert.equal(allSelected, false);

    selectedIds = new Set([...selectedIds, ...unassignedZoneA]);
    assert.equal(selectedIds.size, 3);

    // Segundo click -> deselecciona los partidos de esa zona
    const allNowSelected = unassignedZoneA.every((id) => selectedIds.has(id));
    assert.equal(allNowSelected, true);

    const next = new Set(selectedIds);
    for (const id of unassignedZoneA) {
      next.delete(id);
    }
    assert.equal(next.size, 0);
  });

  it("ignora partidos ya asignados en la selección de zona", () => {
    const unassignedZoneB = partidosPrueba
      .filter((p) => p.zona_id === "zona-b" && !p.cancha_asignada && !p.fecha_partido)
      .map((p) => p.id);

    // p-zb-2 ya está asignado a Cancha 1, solo p-zb-1 está pendiente
    assert.deepEqual(unassignedZoneB, ["p-zb-1"]);
  });

  it("construye el payload correcto para la asignación en lote al backend", () => {
    const selectedMatches = ["p-za-1", "p-za-2", "p-zb-1", "p-zc-1", "p-zc-2"];
    const activeDay = "2026-11-01";

    const payload = {
      partido_ids: selectedMatches,
      dia: activeDay,
    };

    assert.equal(payload.partido_ids.length, 5);
    assert.equal(payload.dia, "2026-11-01");
    assert.deepEqual(payload.partido_ids, ["p-za-1", "p-za-2", "p-zb-1", "p-zc-1", "p-zc-2"]);
  });
});

