import { PROVINCIAS_ARG } from "../constants/padelConfig";

export interface GeocodingResult {
  direccionCompleta: string;
  calle: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  latitud: number;
  longitud: number;
  displayName: string;
}

/**
 * Normaliza cualquier variante de provincia devuelta por Nominatim / OSM
 * a los 24 valores oficiales de PROVINCIAS_ARG de Padel Nexus.
 */
export function normalizarProvinciaArgentinas(raw: string): string {
  if (!raw) return "Buenos Aires";
  const texto = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (texto.includes("ciudad autonoma") || texto.includes("caba") || texto.includes("capital federal")) {
    return "CABA";
  }
  if (texto.includes("buenos aires")) {
    return "Buenos Aires";
  }
  if (texto.includes("cordoba")) return "Córdoba";
  if (texto.includes("santa fe")) return "Santa Fe";
  if (texto.includes("mendoza")) return "Mendoza";
  if (texto.includes("tucuman")) return "Tucumán";
  if (texto.includes("entre rios")) return "Entre Ríos";
  if (texto.includes("salta")) return "Salta";
  if (texto.includes("misiones")) return "Misiones";
  if (texto.includes("chaco")) return "Chaco";
  if (texto.includes("corrientes")) return "Corrientes";
  if (texto.includes("santiago del estero")) return "Santiago del Estero";
  if (texto.includes("san juan")) return "San Juan";
  if (texto.includes("jujuy")) return "Jujuy";
  if (texto.includes("rio negro")) return "Río Negro";
  if (texto.includes("neuquen")) return "Neuquén";
  if (texto.includes("formosa")) return "Formosa";
  if (texto.includes("chubut")) return "Chubut";
  if (texto.includes("san luis")) return "San Luis";
  if (texto.includes("catamarca")) return "Catamarca";
  if (texto.includes("la rioja")) return "La Rioja";
  if (texto.includes("la pampa")) return "La Pampa";
  if (texto.includes("santa cruz")) return "Santa Cruz";
  if (texto.includes("tierra del fuego")) return "Tierra del Fuego";

  // Búsqueda directa en la lista oficial
  const match = PROVINCIAS_ARG.find(
    (p) => p.value.toLowerCase() === texto || p.label.toLowerCase() === texto,
  );
  return match ? match.value : "Buenos Aires";
}

/**
 * Geocodifica una dirección física y código postal en Argentina.
 * Auto-detecta coordenadas, provincia y localidad.
 */
export async function geocodificarDireccion(
  direccion: string,
  codigoPostal?: string | null,
): Promise<GeocodingResult | null> {
  const queryParts = [direccion.trim()];
  if (codigoPostal?.trim()) {
    queryParts.push(codigoPostal.trim());
  }
  queryParts.push("Argentina");

  const query = queryParts.filter(Boolean).join(", ");
  if (!query || query === "Argentina") return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query,
    )}&countrycodes=ar&addressdetails=1&limit=1`;

    const res = await fetch(url, {
      headers: {
        "Accept-Language": "es",
        "User-Agent": "PadelNexus-App/1.0",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const addr = first.address || {};

    const provincia = normalizarProvinciaArgentinas(addr.state || addr.province || "");
    const localidad =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.county ||
      first.name ||
      "Localidad";

    const road = addr.road || addr.pedestrian || "";
    const houseNumber = addr.house_number || "";
    const calle = road ? (houseNumber ? `${road} ${houseNumber}` : road) : direccion;
    const cp = addr.postcode || codigoPostal || "";

    const lat = parseFloat(Number(first.lat).toFixed(6));
    const lon = parseFloat(Number(first.lon).toFixed(6));

    return {
      direccionCompleta: [calle, localidad, provincia].filter(Boolean).join(", "),
      calle,
      localidad,
      provincia,
      codigoPostal: cp,
      latitud: lat,
      longitud: lon,
      displayName: first.display_name || "",
    };
  } catch (error) {
    console.error("Error geocodificando dirección:", error);
    return null;
  }
}

/**
 * Reverse geocoding a partir de coordenadas geográficas.
 */
export async function reverseGeocodificar(
  lat: number,
  lng: number,
): Promise<GeocodingResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "es",
        "User-Agent": "PadelNexus-App/1.0",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.address) return null;

    const addr = data.address;
    const provincia = normalizarProvinciaArgentinas(addr.state || addr.province || "");
    const localidad =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.county ||
      "";

    const road = addr.road || addr.pedestrian || "";
    const houseNumber = addr.house_number || "";
    const calle = road ? (houseNumber ? `${road} ${houseNumber}` : road) : "";
    const cp = addr.postcode || "";

    return {
      direccionCompleta: [calle, localidad, provincia].filter(Boolean).join(", "),
      calle,
      localidad,
      provincia,
      codigoPostal: cp,
      latitud: parseFloat(lat.toFixed(6)),
      longitud: parseFloat(lng.toFixed(6)),
      displayName: data.display_name || "",
    };
  } catch (error) {
    console.error("Error en reverse geocodificación:", error);
    return null;
  }
}
