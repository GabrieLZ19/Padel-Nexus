import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

import type { RankingPerfilJugador } from "@/src/types/competencia.types";
import type { PerfilPublico } from "@/src/types/user.types";

export function displayNameFromRanking(perfil: RankingPerfilJugador): string {
  const p = perfil.perfiles;
  if (p?.nombre_completo) return p.nombre_completo;
  const joined = [p?.nombre, p?.apellido].filter(Boolean).join(" ");
  return joined || "Jugador";
}

export function displayNameFromPerfil(perfil: PerfilPublico): string {
  return [perfil.nombre, perfil.apellido].filter(Boolean).join(" ") || "Jugador";
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "J";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function labelAlcance(alcance?: string | null): string {
  switch (alcance) {
    case "Provincial":
      return "Ranking provincial";
    case "Nacional":
      return "Ranking nacional";
    case "Global":
      return "Ranking global";
    default:
      return alcance ? `Ranking ${alcance.toLowerCase()}` : "Ranking";
  }
}

function desgloseRanking(registros: RankingPerfilJugador[]) {
  const alcances = new Set(registros.map((r) => r.alcance).filter(Boolean));
  const porAlcance = alcances.size > 1;

  return {
    mostrar: registros.length > 1,
    porAlcance,
    titulo: porAlcance ? "PUNTOS POR CIRCUITO" : "PUNTOS POR CATEGORÍA",
    subtitulo: porAlcance
      ? "El jugador compite en más de un circuito (provincial, nacional, etc.)."
      : "El jugador tiene puntos en más de una categoría de juego.",
  };
}

function tituloFilaRanking(
  row: RankingPerfilJugador,
  porAlcance: boolean,
): string {
  return porAlcance ? row.alcance || "Circuito" : row.categoria || "Categoría";
}

function subtituloFilaRanking(
  row: RankingPerfilJugador,
  porAlcance: boolean,
): string {
  if (porAlcance) {
    return `${row.categoria} · PJ ${row.pj ?? 0} · PG ${row.pg ?? 0}`;
  }
  return `${labelAlcance(row.alcance)} · PJ ${row.pj ?? 0} · PG ${row.pg ?? 0}`;
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-brand-border" />
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="font-sans-semibold text-[10px] tracking-[2px] text-brand-muted">
          {title}
        </Text>
      </View>
      <View className="h-px flex-1 bg-brand-border" />
    </View>
  );
}

function MetaChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-full border border-brand-border bg-brand-black/40 px-3 py-1.5">
      {icon}
      <Text className="font-sans-medium text-xs text-white" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      className={`min-w-[46%] flex-1 overflow-hidden rounded-2xl border p-4 ${
        accent
          ? "border-brand-chartreuse/40 bg-brand-chartreuse/10"
          : "border-brand-border bg-brand-surface"
      }`}
    >
      <View className="mb-3 h-9 w-9 items-center justify-center rounded-xl bg-brand-black/30">
        {icon}
      </View>
      <Text className="font-sans text-[10px] tracking-[1px] text-brand-muted">
        {label}
      </Text>
      <Text
        className={`mt-1 font-sans-bold text-2xl ${
          accent ? "text-brand-chartreuse" : "text-white"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

function TrendPill({ tendencia }: { tendencia: number }) {
  if (tendencia > 0) {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5">
        <FontAwesome name="arrow-up" size={10} color="#34D399" />
        <Text className="font-sans-bold text-xs text-emerald-400">+{tendencia}</Text>
      </View>
    );
  }
  if (tendencia < 0) {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5">
        <FontAwesome name="arrow-down" size={10} color="#F87171" />
        <Text className="font-sans-bold text-xs text-red-400">{tendencia}</Text>
      </View>
    );
  }
  return (
    <View className="rounded-full bg-brand-elevated px-3 py-1.5">
      <Text className="font-sans-semibold text-xs text-brand-muted">Estable</Text>
    </View>
  );
}

interface JugadorDetalleViewProps {
  perfil: PerfilPublico | null;
  registros: RankingPerfilJugador[];
  principal: RankingPerfilJugador | null;
  historial: NonNullable<RankingPerfilJugador["historial_ranking"]>;
  posicion?: string;
  scope?: string;
}

export function JugadorDetalleView({
  perfil,
  registros,
  principal,
  historial,
  posicion,
  scope,
}: JugadorDetalleViewProps) {
  const nombre = principal
    ? displayNameFromRanking(principal)
    : perfil
      ? displayNameFromPerfil(perfil)
      : "Jugador";
  const avatar = principal?.perfiles?.avatar_url || perfil?.avatar_url;
  const categoria =
    principal?.categoria ||
    principal?.perfiles?.categoria_padel ||
    perfil?.categoria_padel ||
    "Sin categoría";
  const residencia =
    principal?.perfiles?.lugar_residencia ||
    principal?.provincia_jurisdiccion ||
    perfil?.lugar_residencia ||
    "—";
  const club =
    principal?.perfiles?.clubes?.nombre || perfil?.clubes?.nombre || null;
  const sinRanking = !principal;
  const pj = principal?.pj ?? 0;
  const pg = principal?.pg ?? 0;
  const winRate = pj > 0 ? Math.round((pg / pj) * 100) : 0;
  const tendencia = principal?.tendencia ?? 0;
  const desglose = desgloseRanking(registros);

  return (
    <View className="gap-6">
      <View className="overflow-hidden rounded-[28px] border border-brand-chartreuse/25">
        <LinearGradient
          colors={["rgba(203,254,1,0.22)", "rgba(203,254,1,0.04)", "#121212"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="px-5 pb-5 pt-6">
            <View className="items-center">
              <View className="relative mb-4">
                <View className="rounded-full border-2 border-brand-chartreuse/60 p-1">
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={{ width: 108, height: 108, borderRadius: 54 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-[108px] w-[108px] items-center justify-center rounded-full bg-brand-elevated">
                      <Text className="font-sans-bold text-4xl text-brand-chartreuse">
                        {initials(nombre)}
                      </Text>
                    </View>
                  )}
                </View>
                {posicion ? (
                  <View className="absolute -bottom-1 -right-1 rounded-2xl border border-brand-chartreuse bg-brand-black px-3 py-1.5">
                    <Text className="font-sans-bold text-sm text-brand-chartreuse">
                      #{posicion}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text className="text-center font-sans-bold text-3xl text-white">
                {nombre}
              </Text>

              <View className="mt-3 rounded-full bg-brand-chartreuse px-4 py-1.5">
                <Text className="font-sans-bold text-xs uppercase tracking-wide text-black">
                  {categoria}
                </Text>
              </View>

              <View className="mt-4 flex-row flex-wrap items-center justify-center gap-2">
                <MetaChip
                  icon={<FontAwesome name="map-marker" size={11} color="#CBFE01" />}
                  label={residencia}
                />
                {perfil?.lado_preferido ? (
                  <MetaChip
                    icon={
                      <MaterialCommunityIcons
                        name="tennis"
                        size={12}
                        color="#CBFE01"
                      />
                    }
                    label={perfil.lado_preferido}
                  />
                ) : null}
                {club ? (
                  <MetaChip
                    icon={<FontAwesome name="building" size={11} color="#CBFE01" />}
                    label={club}
                  />
                ) : null}
              </View>
            </View>

            {!sinRanking ? (
              <View className="mt-6 rounded-2xl border border-brand-border/80 bg-brand-black/50 p-4">
                <View className="flex-row items-end justify-between">
                  <View>
                    <Text className="font-sans-semibold text-[10px] tracking-[2px] text-brand-muted">
                      PUNTOS FAP
                    </Text>
                    <Text className="font-sans-bold text-5xl text-brand-chartreuse">
                      {principal.puntos.toLocaleString("es-AR")}
                    </Text>
                    <Text className="mt-1 font-sans text-xs text-brand-muted">
                      {labelAlcance(principal.alcance || scope)} ·{" "}
                      {principal.categoria}
                    </Text>
                  </View>
                  <TrendPill tendencia={tendencia} />
                </View>
              </View>
            ) : (
              <View className="mt-6 rounded-2xl border border-dashed border-brand-border bg-brand-black/40 p-4">
                <Text className="font-sans-bold text-base text-white">
                  Perfil en formación
                </Text>
                <Text className="mt-1 font-sans text-sm text-brand-muted">
                  Todavía no acumuló puntos oficiales. Seguí su evolución cuando
                  compita en torneos federados.
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      {!sinRanking ? (
        <View className="flex-row flex-wrap gap-3">
          <StatCard
            accent
            icon={
              <MaterialCommunityIcons name="podium" size={18} color="#CBFE01" />
            }
            label="POSICIÓN"
            value={posicion ? `#${posicion}` : "—"}
          />
          <StatCard
            icon={
              <MaterialCommunityIcons
                name="sword-cross"
                size={18}
                color="#FFFFFF"
              />
            }
            label="PARTIDOS"
            value={String(pj)}
          />
          <StatCard
            icon={
              <MaterialCommunityIcons name="trophy" size={18} color="#FFFFFF" />
            }
            label="GANADOS"
            value={String(pg)}
          />
          <StatCard
            icon={
              <MaterialCommunityIcons
                name="chart-line"
                size={18}
                color="#FFFFFF"
              />
            }
            label="% VICTORIAS"
            value={`${winRate}%`}
          />
        </View>
      ) : null}

      {desglose.mostrar ? (
        <View className="gap-3">
          <SectionTitle
            icon={
              <MaterialCommunityIcons
                name={desglose.porAlcance ? "earth" : "format-list-numbered"}
                size={14}
                color="#CBFE01"
              />
            }
            title={desglose.titulo}
          />
          <Text className="-mt-1 text-center font-sans text-xs text-brand-muted">
            {desglose.subtitulo}
          </Text>
          {registros.map((row, index) => {
            const active = row.id === principal?.id;
            return (
              <View
                key={row.id}
                className={`overflow-hidden rounded-2xl border ${
                  active
                    ? "border-brand-chartreuse/50"
                    : "border-brand-border"
                }`}
              >
                {active ? (
                  <LinearGradient
                    colors={["rgba(203,254,1,0.12)", "transparent"]}
                    style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                  />
                ) : null}
                <View className="flex-row items-center gap-3 px-4 py-4">
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-xl ${
                      active ? "bg-brand-chartreuse" : "bg-brand-elevated"
                    }`}
                  >
                    <Text
                      className={`font-sans-bold text-lg ${
                        active ? "text-black" : "text-white"
                      }`}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans-bold text-base text-white">
                      {tituloFilaRanking(row, desglose.porAlcance)}
                    </Text>
                    <Text className="mt-0.5 font-sans text-xs text-brand-muted">
                      {subtituloFilaRanking(row, desglose.porAlcance)}
                    </Text>
                  </View>
                  <Text className="font-sans-bold text-xl text-brand-chartreuse">
                    {row.puntos.toLocaleString("es-AR")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {!sinRanking ? (
        <View className="gap-3">
          <SectionTitle
            icon={
              <MaterialCommunityIcons name="history" size={14} color="#CBFE01" />
            }
            title="EVOLUCIÓN DE PUNTOS"
          />

          {historial.length === 0 ? (
            <View className="rounded-2xl border border-brand-border bg-brand-surface p-4">
              <Text className="font-sans text-sm text-brand-muted">
                Sin movimientos recientes de puntos.
              </Text>
            </View>
          ) : (
            <View className="rounded-2xl border border-brand-border bg-brand-surface p-4">
              {historial.slice(0, 8).map((item, index, arr) => {
                const delta =
                  (item.puntos_nuevos ?? 0) - (item.puntos_anteriores ?? 0);
                const isLast = index === arr.length - 1;
                return (
                  <View key={`${item.torneo_id}-${item.created_at}-${index}`} className="flex-row gap-3">
                    <View className="items-center">
                      <View className="h-3 w-3 rounded-full border-2 border-brand-chartreuse bg-brand-black" />
                      {!isLast ? (
                        <View className="my-1 w-px flex-1 bg-brand-border" />
                      ) : null}
                    </View>
                    <View className={`min-w-0 flex-1 ${isLast ? "" : "pb-5"}`}>
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="min-w-0 flex-1">
                          <Text className="font-sans-bold text-sm text-white">
                            Actualización de ranking
                          </Text>
                          <Text className="mt-0.5 font-sans text-xs text-brand-muted">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString(
                                  "es-AR",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="font-sans-bold text-base text-brand-chartreuse">
                            {item.puntos_nuevos?.toLocaleString("es-AR")} pts
                          </Text>
                          {delta !== 0 ? (
                            <Text
                              className={`font-sans-semibold text-xs ${
                                delta > 0 ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta.toLocaleString("es-AR")}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
