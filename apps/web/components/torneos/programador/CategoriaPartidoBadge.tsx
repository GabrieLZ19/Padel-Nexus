import type { BoardPartido } from "@/utils/services/torneos";

interface Props {
  partido: BoardPartido;
  compact?: boolean;
}

export function CategoriaPartidoBadge({ partido, compact }: Props) {
  if (!partido.categoria_etiqueta && !partido.categoria_color) return null;
  const color = partido.categoria_color || "#CBFE01";
  return (
    <p
      className={`truncate font-bold uppercase tracking-wide ${
        compact ? "text-[9px]" : "text-[10px]"
      }`}
      style={{ color }}
      title={partido.categoria_etiqueta || partido.torneo_nombre}
    >
      {partido.categoria_etiqueta || partido.torneo_nombre}
    </p>
  );
}