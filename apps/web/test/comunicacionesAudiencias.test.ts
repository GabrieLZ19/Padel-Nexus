import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Comunicaciones - Selección múltiple y exclusión de licencia en torneos (Frontend)", () => {
  // Simulador de la lógica pura de buildFiltros en ComunicacionesPanel
  function buildFiltrosHelper(params: {
    audienciaTipo: string;
    provincia?: string;
    asociacionIds: string[];
    clubIds: string[];
    torneoId?: string;
    categoriaPadel?: string;
    licenciaEstado?: string;
    rol?: string;
    clubIdPerfil?: string;
  }) {
    const {
      audienciaTipo,
      provincia,
      asociacionIds,
      clubIds,
      torneoId,
      categoriaPadel,
      licenciaEstado,
      rol,
      clubIdPerfil,
    } = params;

    const filtros: Record<string, unknown> = {};
    if (provincia) filtros.provincias = [provincia];

    if (audienciaTipo === "jugadores_asociacion") {
      filtros.asociacion_ids =
        asociacionIds.length === 0 || asociacionIds.includes("todas")
          ? ["todas"]
          : asociacionIds;
    }

    if (audienciaTipo === "jugadores_club") {
      if (rol === "admin_club" && clubIdPerfil) {
        filtros.club_ids = [clubIdPerfil];
      } else {
        filtros.club_ids =
          clubIds.length === 0 || clubIds.includes("todos")
            ? ["todos"]
            : clubIds;
      }
    }

    if (audienciaTipo === "admins_clubes") {
      if (clubIds.length > 0 && !clubIds.includes("todos")) {
        filtros.club_ids = clubIds;
      }
    }

    if (torneoId && audienciaTipo === "inscritos_torneo") {
      filtros.torneo_id = torneoId;
    }

    if (
      categoriaPadel &&
      (audienciaTipo === "jugadores_provincia" ||
        audienciaTipo === "jugadores_asociacion" ||
        audienciaTipo === "jugadores_club" ||
        audienciaTipo === "plataforma")
    ) {
      filtros.categoria_padel = categoriaPadel;
    }

    if (audienciaTipo === "jugadores_provincia" || audienciaTipo === "plataforma") {
      filtros.solo_rol_usuario = true;
    }

    // Filtro por licencia: NO aplica a inscritos de torneo
    if (
      licenciaEstado &&
      audienciaTipo !== "inscritos_torneo" &&
      (audienciaTipo === "jugadores_provincia" ||
        audienciaTipo === "jugadores_asociacion" ||
        audienciaTipo === "jugadores_club" ||
        audienciaTipo === "plataforma")
    ) {
      filtros.licencia_estado = licenciaEstado;
    }

    return filtros;
  }

  // Filtrado de torneos disponibles por afiliación a entidad superior
  const normalizar = (v?: string | null) =>
    (v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  function filtrarTorneosDisponibles(
    rawTorneos: Array<{ id: string; nombre: string; asociacion_id?: string | null; federacion_id?: string | null }>,
    rol?: string,
    provinciaForzada?: string,
    asociaciones: Array<{ value: string; provincia?: string | null }> = [],
  ) {
    let filtered = rawTorneos.filter((t) => Boolean(t.asociacion_id || t.federacion_id));

    if (rol === "admin_provincial" && provinciaForzada) {
      const targetProv = normalizar(provinciaForzada);
      const asocIdsProv = new Set(
        asociaciones
          .filter((a) => normalizar(a.provincia) === targetProv)
          .map((a) => a.value),
      );
      filtered = filtered.filter(
        (t) => t.asociacion_id && asocIdsProv.has(t.asociacion_id),
      );
    }

    return filtered.map((t) => ({ value: t.id, label: t.nombre }));
  }

  it("permite seleccionar 'todas' o múltiples asociaciones en 'jugadores_asociacion'", () => {
    // Caso 'todas'
    const resTodas = buildFiltrosHelper({
      audienciaTipo: "jugadores_asociacion",
      asociacionIds: ["todas"],
      clubIds: [],
    });
    assert.deepStrictEqual(resTodas.asociacion_ids, ["todas"]);

    // Caso múltiple
    const resMultiples = buildFiltrosHelper({
      audienciaTipo: "jugadores_asociacion",
      asociacionIds: ["asoc-tucuman", "asoc-salta"],
      clubIds: [],
    });
    assert.deepStrictEqual(resMultiples.asociacion_ids, ["asoc-tucuman", "asoc-salta"]);
  });

  it("permite seleccionar 'todos' o múltiples clubes en 'jugadores_club'", () => {
    // Caso 'todos'
    const resTodos = buildFiltrosHelper({
      audienciaTipo: "jugadores_club",
      asociacionIds: [],
      clubIds: ["todos"],
    });
    assert.deepStrictEqual(resTodos.club_ids, ["todos"]);

    // Caso múltiple
    const resMultiples = buildFiltrosHelper({
      audienciaTipo: "jugadores_club",
      asociacionIds: [],
      clubIds: ["club-1", "club-2", "club-3"],
    });
    assert.deepStrictEqual(resMultiples.club_ids, ["club-1", "club-2", "club-3"]);
  });

  it("excluye el filtro de licencia en 'inscritos_torneo' aunque haya un valor cargado", () => {
    const res = buildFiltrosHelper({
      audienciaTipo: "inscritos_torneo",
      asociacionIds: [],
      clubIds: [],
      torneoId: "torneo-123",
      licenciaEstado: "vigente",
    });

    assert.strictEqual(res.torneo_id, "torneo-123");
    assert.strictEqual(res.licencia_estado, undefined);
  });

  it("solo permite torneos organizados por asociaciones o federaciones afiliadas a la entidad superior", () => {
    const torneos = [
      { id: "t1", nombre: "Torneo Oficial Asoc", asociacion_id: "asoc-1", federacion_id: null },
      { id: "t2", nombre: "Nacional Federacion", asociacion_id: null, federacion_id: "fed-1" },
      { id: "t3", nombre: "Torneo Privado Independiente", asociacion_id: null, federacion_id: null },
    ];

    const disponibles = filtrarTorneosDisponibles(torneos);
    assert.strictEqual(disponibles.length, 2);
    assert.deepStrictEqual(
      disponibles.map((t) => t.value),
      ["t1", "t2"],
    );
  });

  it("acota torneos disponibles a la provincia si el usuario es admin provincial", () => {
    const torneos = [
      { id: "t-tuc", nombre: "Torneo Tucumán", asociacion_id: "asoc-tuc", federacion_id: null },
      { id: "t-sal", nombre: "Torneo Salta", asociacion_id: "asoc-sal", federacion_id: null },
    ];
    const asociaciones = [
      { value: "asoc-tuc", provincia: "Tucumán" },
      { value: "asoc-sal", provincia: "Salta" },
    ];

    const disponibles = filtrarTorneosDisponibles(
      torneos,
      "admin_provincial",
      "tucuman",
      asociaciones,
    );

    assert.strictEqual(disponibles.length, 1);
    assert.strictEqual(disponibles[0].value, "t-tuc");
  });
});
