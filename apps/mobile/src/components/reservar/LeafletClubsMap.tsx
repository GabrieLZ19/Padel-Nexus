import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { ClubsInteractiveFallback } from "@/src/components/reservar/ClubsInteractiveFallback";
import type { UserCoords } from "@/src/hooks/useUserLocation";
import type { Club } from "@/src/types/club.types";

interface LeafletClubsMapProps {
  clubs: Club[];
  userCoords?: UserCoords | null;
  selectedClubId?: string | null;
  onSelectClub?: (clubId: string) => void;
  height?: number;
}

function generarHtmlMapa(
  clubs: Club[],
  userCoords?: UserCoords | null,
  selectedClubId?: string | null,
): string {
  const clubsJson = JSON.stringify(
    clubs
      .filter(
        (c) =>
          c.latitud != null &&
          c.longitud != null &&
          Number.isFinite(Number(c.latitud)) &&
          Number.isFinite(Number(c.longitud)),
      )
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        lat: Number(c.latitud),
        lng: Number(c.longitud),
        direccion: c.direccion || "",
        localidad: c.localidad || "",
        distancia: c.distancia_km != null ? `${c.distancia_km.toFixed(1)} km` : "",
      })),
  );

  const userCoordsJson = JSON.stringify(
    userCoords &&
      Number.isFinite(userCoords.latitude) &&
      Number.isFinite(userCoords.longitude)
      ? { lat: userCoords.latitude, lng: userCoords.longitude }
      : null,
  );

  const initialSelectedId = JSON.stringify(selectedClubId || null);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; background: #000000; overflow: hidden; }
    
    /* Pin normal de club */
    .club-pin {
      width: 34px;
      height: 34px;
      background: #181818;
      border: 2px solid #CBFE01;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 0 10px rgba(203,254,1,0.35);
      cursor: pointer;
      transition: transform 0.18s ease, background 0.18s ease;
    }
    .club-pin svg { width: 18px; height: 18px; fill: #CBFE01; }

    /* Pin seleccionado */
    .club-pin.selected {
      background: #CBFE01;
      border-color: #FFFFFF;
      transform: scale(1.22);
      box-shadow: 0 6px 18px rgba(203,254,1,0.7);
      z-index: 9999 !important;
    }
    .club-pin.selected svg { fill: #000000; }

    /* Pin usuario GPS */
    .user-pin {
      width: 18px;
      height: 18px;
      background: #3B82F6;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.35);
    }

    /* Popups oscuros personalizados */
    .leaflet-popup-content-wrapper {
      background: #181818;
      color: #FFFFFF;
      border: 1px solid #2A2A2A;
      border-radius: 14px;
      padding: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.8);
    }
    .leaflet-popup-tip { background: #181818; }
    .leaflet-popup-content { margin: 8px 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .popup-title { font-weight: 700; font-size: 13px; color: #FFFFFF; }
    .popup-sub { font-size: 11px; color: #8A8A8A; margin-top: 2px; }
    .popup-badge { display: inline-block; background: rgba(203,254,1,0.15); color: #CBFE01; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 6px; margin-top: 4px; }
    
    /* Modo oscuro para tiles OpenStreetMap sin requerir ninguna API key ni mostrar marcas de agua */
    .leaflet-tile-pane {
      filter: brightness(0.6) invert(1) contrast(2) hue-rotate(200deg) saturate(0.25) brightness(0.75);
    }

    /* Controles de zoom oscuros */
    .leaflet-bar { border: 1px solid #2A2A2A !important; border-radius: 8px !important; overflow: hidden; }
    .leaflet-bar a { background: #181818 !important; color: #CBFE01 !important; border-bottom: 1px solid #2A2A2A !important; }
    .leaflet-bar a:hover { background: #222222 !important; }
    .leaflet-control-attribution { background: rgba(0,0,0,0.7) !important; color: #555555 !important; font-size: 9px !important; }
    .leaflet-control-attribution a { color: #777777 !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const clubs = ${clubsJson};
    const userCoords = ${userCoordsJson};
    let selectedId = ${initialSelectedId};
    const markersMap = {};

    // Inicializar mapa
    const defaultCenter = userCoords ? [userCoords.lat, userCoords.lng] : [-34.6037, -58.3816];
    const map = L.map('map', {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    // Tiles 100% gratuitos de OpenStreetMap sin API key requerida
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
    }).addTo(map);

    // Ícono SVG de raqueta / pin de pádel
    const paddleSvg = '<svg viewBox="0 0 24 24"><path d="M12 2C7.58 2 4 5.58 4 10c0 3.32 2.02 6.16 4.9 7.37L8.5 22h3l.4-4.63C16.8 16.16 20 13.32 20 10c0-4.42-3.58-8-8-8zm0 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>';

    function createPinIcon(isSelected) {
      return L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="club-pin ' + (isSelected ? 'selected' : '') + '">' + paddleSvg + '</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      });
    }

    // Marcador de ubicación de usuario
    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="user-pin"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindTooltip("Tu ubicación", { permanent: false, direction: 'top' });
    }

    const bounds = [];
    if (userCoords) bounds.push([userCoords.lat, userCoords.lng]);

    // Añadir marcadores de clubes
    clubs.forEach(club => {
      bounds.push([club.lat, club.lng]);
      const isSelected = club.id === selectedId;
      const marker = L.marker([club.lat, club.lng], {
        icon: createPinIcon(isSelected)
      }).addTo(map);

      const popupHtml = '<div class="popup-title">' + club.nombre + '</div>' +
        (club.direccion ? '<div class="popup-sub">' + club.direccion + '</div>' : '') +
        (club.distancia ? '<div class="popup-badge">' + club.distancia + '</div>' : '');

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -10] });

      marker.on('click', () => {
        selectClubInMap(club.id, false);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SELECT_CLUB',
            clubId: club.id
          }));
        }
      });

      markersMap[club.id] = { marker, club };
    });

    function selectClubInMap(clubId, panTo = true) {
      selectedId = clubId;
      Object.keys(markersMap).forEach(id => {
        const item = markersMap[id];
        const isSel = id === clubId;
        item.marker.setIcon(createPinIcon(isSel));
      });

      if (panTo && markersMap[clubId]) {
        const target = markersMap[clubId].club;
        map.setView([target.lat, target.lng], Math.max(map.getZoom(), 14), { animate: true });
        markersMap[clubId].marker.openPopup();
      }
    }

    window.selectClubFromApp = function(clubId) {
      selectClubInMap(clubId, true);
    };

    // Ajustar vista para abarcar todos los puntos
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
  </script>
</body>
</html>`;
}

function abrirEnMapaExterno(club: Club) {
  const query = encodeURIComponent(
    [club.nombre, club.direccion, club.localidad].filter(Boolean).join(", "),
  );
  const lat = club.latitud;
  const lng = club.longitud;

  const url =
    Platform.OS === "ios"
      ? lat && lng
        ? `maps:${lat},${lng}?q=${query}`
        : `maps:0,0?q=${query}`
      : lat && lng
        ? `geo:${lat},${lng}?q=${query}`
        : `geo:0,0?q=${query}`;

  void Linking.openURL(url).catch(() => {
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
    );
  });
}

/**
 * Mapa interactivo 100% gratuito basado en Leaflet + CartoDB Dark Matter (OpenStreetMap).
 * Funciona sin API keys, sin costos de facturación y sin crasheos nativos en Android/iOS.
 */
export function LeafletClubsMap({
  clubs,
  userCoords,
  selectedClubId,
  onSelectClub,
  height = 260,
}: LeafletClubsMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const selected =
    clubs.find((c) => c.id === selectedClubId) ?? clubs[0] ?? null;

  const hasValidCoords = useMemo(
    () =>
      clubs.some(
        (c) =>
          c.latitud != null &&
          c.longitud != null &&
          Number.isFinite(Number(c.latitud)) &&
          Number.isFinite(Number(c.longitud)) &&
          Number(c.latitud) !== 0,
      ),
    [clubs],
  );

  const htmlContent = useMemo(
    () => generarHtmlMapa(clubs, userCoords, selectedClubId),
    [clubs, userCoords], // solo regenerar HTML si cambian clubes o coords de usuario
  );

  if (!hasValidCoords || loadError) {
    return null;
  }

  // Cuando cambia el club seleccionado desde React Native, animar el mapa de Leaflet
  useEffect(() => {
    if (!selectedClubId || loading || loadError) return;
    try {
      webViewRef.current?.injectJavaScript(
        `if (window.selectClubFromApp) { window.selectClubFromApp("${selectedClubId}"); } true;`,
      );
    } catch {
      // noop
    }
  }, [selectedClubId, loading, loadError]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          clubId?: string;
        };
        if (data.type === "SELECT_CLUB" && data.clubId) {
          onSelectClub?.(data.clubId);
        }
      } catch {
        // noop
      }
    },
    [onSelectClub],
  );

  if (loadError) {
    return (
      <ClubsInteractiveFallback
        clubs={clubs}
        userCoords={userCoords}
        selectedClubId={selectedClubId}
        onSelectClub={onSelectClub}
        height={height}
      />
    );
  }

  return (
    <View
      className="relative overflow-hidden rounded-card border border-brand-border bg-black"
      style={{ height }}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        onMessage={onMessage}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoadError(true)}
        style={{ flex: 1, backgroundColor: "#000000" }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />

      {loading ? (
        <View className="absolute inset-0 items-center justify-center bg-black/70">
          <ActivityIndicator size="small" color="#CBFE01" />
          <Text className="mt-2 font-sans text-xs text-brand-muted">
            Cargando mapa interactivo…
          </Text>
        </View>
      ) : null}

      {/* Floating card del club seleccionado */}
      {selected ? (
        <Pressable
          onPress={() => onSelectClub?.(selected.id)}
          className="absolute bottom-2.5 left-2.5 right-2.5 flex-row items-center gap-2.5 rounded-2xl border border-brand-border bg-brand-black/90 px-3 py-2.5 active:opacity-90"
        >
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-chartreuse/15">
            <FontAwesome name="map-marker" size={16} color="#CBFE01" />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="font-sans-bold text-sm text-white"
              numberOfLines={1}
            >
              {selected.nombre}
            </Text>
            <Text
              className="font-sans text-xs text-brand-muted"
              numberOfLines={1}
            >
              {[
                selected.distancia_km != null
                  ? `${selected.distancia_km.toFixed(1).replace(".", ",")} km`
                  : null,
                selected.localidad,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              abrirEnMapaExterno(selected);
            }}
            className="h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand-surface active:opacity-80"
            accessibilityLabel="Abrir en Maps"
          >
            <FontAwesome name="external-link" size={12} color="#CBFE01" />
          </Pressable>
          <Text className="font-sans-semibold text-xs text-brand-chartreuse">
            Ver
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
