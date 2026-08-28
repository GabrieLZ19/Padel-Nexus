export const LEAFLET_TILE_LIGHT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

export const LEAFLET_TILE_DARK =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

export const LEAFLET_TILE_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ";

export function leafletTileUrl(isLightMode: boolean): string {
  return isLightMode ? LEAFLET_TILE_LIGHT : LEAFLET_TILE_DARK;
}
