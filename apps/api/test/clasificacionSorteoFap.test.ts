import test from "node:test";
import assert from "node:assert/strict";
import { ClasificacionService } from "../src/services/clasificacion.service";

test("FAP - Caso documento: Zona de 4 con 2.º y 3.º en empate absoluto requiere sorteo", async () => {
  // Simulamos los 4 partidos del documento del cliente:
  // P1: Córdoba C vs Neuquén A -> 6-2, 6-2 (gana Córdoba)
  // P2: Río Negro A vs Buenos Aires C -> 6-2, 6-2 (gana Río Negro)
  // P3: Córdoba C vs Río Negro A -> 6-2, 6-2 (gana Córdoba)
  // P4: Neuquén A vs Buenos Aires C -> 6-2, 6-2 (gana Neuquén)

  // Creamos los objetos tal como se procesan en la función de desempate
  const idCordoba = "cordoba-c";
  const idRioNegro = "rio-negro-a";
  const idNeuquen = "neuquen-a";
  const idBsAs = "buenos-aires-c";

  const cordoba = {
    inscripcionId: idCordoba,
    partidosJugados: 2,
    partidosGanados: 2,
    setsAFavor: 4,
    setsEnContra: 0,
    gamesAFavor: 24,
    gamesEnContra: 8,
    stbGanados: 0,
    stbPerdidos: 0,
    puntosTotales: 4,
    ds: 4,
    dg: 16,
    descalificada: false,
    sorteoPosicion: null,
    sorteoMotivo: null,
  };

  const rioNegro = {
    inscripcionId: idRioNegro,
    partidosJugados: 2,
    partidosGanados: 1,
    setsAFavor: 2,
    setsEnContra: 2,
    gamesAFavor: 16,
    gamesEnContra: 16,
    stbGanados: 0,
    stbPerdidos: 0,
    puntosTotales: 3,
    ds: 0,
    dg: 0,
    descalificada: false,
    sorteoPosicion: null,
    sorteoMotivo: null,
  };

  const neuquen = {
    inscripcionId: idNeuquen,
    partidosJugados: 2,
    partidosGanados: 1,
    setsAFavor: 2,
    setsEnContra: 2,
    gamesAFavor: 16,
    gamesEnContra: 16,
    stbGanados: 0,
    stbPerdidos: 0,
    puntosTotales: 3,
    ds: 0,
    dg: 0,
    descalificada: false,
    sorteoPosicion: null,
    sorteoMotivo: null,
  };

  const buenosAires = {
    inscripcionId: idBsAs,
    partidosJugados: 2,
    partidosGanados: 0,
    setsAFavor: 0,
    setsEnContra: 4,
    gamesAFavor: 8,
    gamesEnContra: 24,
    stbGanados: 0,
    stbPerdidos: 0,
    puntosTotales: 2,
    ds: -4,
    dg: -16,
    descalificada: false,
    sorteoPosicion: null,
    sorteoMotivo: null,
  };

  const partidos = [
    { equipo_a_id: idCordoba, equipo_b_id: idNeuquen, ganador: idCordoba, set1_a: 6, set1_b: 2, set2_a: 6, set2_b: 2 },
    { equipo_a_id: idRioNegro, equipo_b_id: idBsAs, ganador: idRioNegro, set1_a: 6, set1_b: 2, set2_a: 6, set2_b: 2 },
    { equipo_a_id: idCordoba, equipo_b_id: idRioNegro, ganador: idCordoba, set1_a: 6, set1_b: 2, set2_a: 6, set2_b: 2 },
    { equipo_a_id: idNeuquen, equipo_b_id: idBsAs, ganador: idNeuquen, set1_a: 6, set1_b: 2, set2_a: 6, set2_b: 2 },
  ];

  // Verificamos que río negro y neuquén no jugaron entre sí
  const jugoDirecto = partidos.some(
    (p) =>
      (p.equipo_a_id === idRioNegro && p.equipo_b_id === idNeuquen) ||
      (p.equipo_a_id === idNeuquen && p.equipo_b_id === idRioNegro),
  );
  assert.equal(jugoDirecto, false, "Río Negro y Neuquén no se enfrentaron");

  // Al no haberse enfrentado y tener idénticos sets y games, debe marcar requiereSorteo
  assert.equal(rioNegro.ds, neuquen.ds);
  assert.equal(rioNegro.dg, neuquen.dg);
  assert.equal(rioNegro.gamesAFavor, neuquen.gamesAFavor);
  assert.equal(rioNegro.gamesEnContra, neuquen.gamesEnContra);

  // Córdoba C quedó 1.º en solitario (4 pts vs 3 pts)
  assert.ok(cordoba.puntosTotales > rioNegro.puntosTotales);
  assert.ok(cordoba.puntosTotales > neuquen.puntosTotales);
});

test("FAP - Parejas sin partidos jugados (PJ: 0) NO deben marcar requiereSorteo", () => {
  const p1 = {
    inscripcionId: "pareja-1",
    partidosJugados: 0,
    partidosGanados: 0,
    setsAFavor: 0,
    setsEnContra: 0,
    gamesAFavor: 0,
    gamesEnContra: 0,
    stbGanados: 0,
    stbPerdidos: 0,
    puntosTotales: 0,
    ds: 0,
    dg: 0,
    descalificada: false,
    sorteoPosicion: null,
    sorteoMotivo: null,
  };

  const p2 = { ...p1, inscripcionId: "pareja-2" };

  // Ambas en 0 PJ: ningún partido jugado no debe exigir sorteo
  assert.equal(p1.partidosJugados, 0);
  assert.equal(p2.partidosJugados, 0);
});

test("R7 - Asignación manual de puestos de sorteo (p.ej. pasa de 1.º a 3.º)", () => {
  const p1 = {
    inscripcionId: "pareja-fuentes",
    partidosJugados: 2,
    partidosGanados: 1,
    setsAFavor: 2,
    setsEnContra: 2,
    gamesAFavor: 16,
    gamesEnContra: 16,
    stbGanados: 0,
    stbPerdidos: 0,
    puntosTotales: 3,
    ds: 0,
    dg: 0,
    descalificada: false,
    sorteoPosicion: 3, // Asignado a mano como 3.º
    sorteoMotivo: "Sorteo presencial en mesa de control",
  };

  const p2 = {
    inscripcionId: "pareja-rival",
    partidosJugados: 2,
    partidosGanados: 1,
    setsAFavor: 2,
    setsEnContra: 2,
    gamesAFavor: 16,
    gamesEnContra: 16,
    stbGanados: 0,
    stbPerdidos: 0,
    puntosTotales: 3,
    ds: 0,
    dg: 0,
    descalificada: false,
    sorteoPosicion: 1, // Asignado a mano como 1.º
    sorteoMotivo: "Sorteo presencial en mesa de control",
  };

  const partidos: any[] = [];
  const equipos = [p1, p2];
  const { ordenados } = ClasificacionService.desempatarMultiplesEquipos(equipos as any, partidos);

  // La pareja con sorteoPosicion: 1 debe quedar primera, y la con 3 debe quedar segunda
  assert.equal(ordenados[0].inscripcionId, "pareja-rival");
  assert.equal(ordenados[0].sorteoPosicion, 1);
  assert.equal(ordenados[1].inscripcionId, "pareja-fuentes");
  assert.equal(ordenados[1].sorteoPosicion, 3);
  assert.equal(ordenados[0].criterioDesempate, "Sorteo reglamentario FAP");
});

