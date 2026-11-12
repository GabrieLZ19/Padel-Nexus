import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { haversineKm } from "../src/utils/coordenadasClub.ts";
import {
  clubCumpleFiltroCancha,
  slotCoincideHora,
} from "../src/utils/filtrosClubReserva.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("RES-4 cercanía y filtros de reservar", () => {
  it("haversine aproxima distancia Neuquén vs Mendoza desde Neuquén capital", () => {
    const neuquen = { lat: -38.9516, lng: -68.0591 };
    const qaNeuquen = { lat: -38.95, lng: -68.06 };
    const mendoza = { lat: -32.8895, lng: -68.8458 };

    const cerca = haversineKm(neuquen.lat, neuquen.lng, qaNeuquen.lat, qaNeuquen.lng);
    const lejos = haversineKm(neuquen.lat, neuquen.lng, mendoza.lat, mendoza.lng);

    assert.ok(cerca < 5, "club local debería quedar a pocos km");
    assert.ok(lejos > 400, "Mendoza debería quedar mucho más lejos");
    assert.ok(cerca < lejos);
  });

  it("filtra por tipo de cancha y techada", () => {
    const canchas = [
      { tipo_suelo: "Blindex", techada: true, activa: true },
      { tipo_suelo: "Cemento", techada: false, activa: true },
    ];
    assert.equal(clubCumpleFiltroCancha(canchas, "Blindex", true), true);
    assert.equal(clubCumpleFiltroCancha(canchas, "Blindex", false), false);
    assert.equal(clubCumpleFiltroCancha(canchas, "Cemento", false), true);
  });

  it("disponibilidad por hora cae dentro del turno", () => {
    assert.equal(slotCoincideHora("09:00", "10:30", "09:30"), true);
    assert.equal(slotCoincideHora("09:00", "10:30", "10:30"), false);
    assert.equal(slotCoincideHora("09:00", "10:30", "08:30"), false);
  });

  it("listado con ubicación usa RPC buscar_clubes_cercanos sin geocode en lectura", () => {
    const src = readFileSync(
      path.join(RAIZ, "src/services/club.service.ts"),
      "utf8",
    );
    assert.match(src, /listarClubesConUbicacionUsuario/);
    assert.match(src, /buscarCercanos\(lat, lng, maxRadio\)/);
    const idx = src.indexOf("listarClubesConUbicacionUsuario");
    const bloque = src.slice(idx, idx + 3200);
    assert.doesNotMatch(bloque, /resolverCoordenadas/);
    assert.doesNotMatch(bloque, /nominatim\.openstreetmap/);
  });
});
