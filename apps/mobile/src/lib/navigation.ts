import type { Href } from "expo-router";

/** Rutas bajo /torneo para no chocar con la tab /(tabs)/torneos */
export function hrefTorneoDetalle(id: string): Href {
  return `/torneo/${id}` as Href;
}

export function hrefTorneoInscripcion(id: string): Href {
  return `/torneo/${id}/inscripcion` as Href;
}

export function hrefTorneoCuadro(id: string): Href {
  return `/torneo/${id}/cuadro` as Href;
}

export function hrefTorneoZonas(id: string): Href {
  return `/torneo/${id}/zonas` as Href;
}

export function hrefJugador(
  usuarioId: string,
  params?: { posicion?: number; scope?: string },
): Href {
  return {
    pathname: "/jugador/[id]",
    params: {
      id: usuarioId,
      ...(params?.posicion != null
        ? { posicion: String(params.posicion) }
        : {}),
      ...(params?.scope ? { scope: params.scope } : {}),
    },
  } as Href;
}

export function hrefTorneoResultado(id: string, partidoId?: string): Href {
  if (partidoId) {
    return {
      pathname: "/torneo/[id]/resultado",
      params: { id, partidoId },
    } as Href;
  }
  return `/torneo/${id}/resultado` as Href;
}

export function hrefReservarClub(clubId: string): Href {
  return `/reservar/club/${clubId}` as Href;
}

export function hrefReservarNueva(): Href {
  return "/reservar/nueva" as Href;
}

export function hrefReservaDetalle(reservaId: string): Href {
  return `/reservar/detalle/${reservaId}` as Href;
}

export function hrefReservaCheckout(params: {
  turnoId: string;
  fecha: string;
  clubId?: string;
}): Href {
  return {
    pathname: "/reservar/checkout",
    params: {
      turnoId: params.turnoId,
      fecha: params.fecha,
      ...(params.clubId ? { clubId: params.clubId } : {}),
    },
  } as Href;
}

export function hrefReservaPago(reservaId: string): Href {
  return {
    pathname: "/reservar/checkout",
    params: { reservaId },
  } as Href;
}

export function hrefMarketProducto(id: string): Href {
  return `/market/producto/${id}` as Href;
}

export function hrefMarketCarrito(): Href {
  return "/market/carrito" as Href;
}

export function hrefMarketOrdenes(): Href {
  return "/market/ordenes" as Href;
}

export function hrefMarketOrden(id: string): Href {
  return `/market/orden/${id}` as Href;
}
