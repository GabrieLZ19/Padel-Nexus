import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import type { RankingJugador } from "@/src/types/competencia.types";

function playerName(item: RankingJugador): string {
  const fromPerfil = [item.perfiles?.nombre, item.perfiles?.apellido]
    .filter(Boolean)
    .join(" ");
  if (fromPerfil) return fromPerfil;
  return [item.nombre, item.apellido].filter(Boolean).join(" ") || "Jugador";
}

function playerMeta(item: RankingJugador): string {
  const categoria = item.categoria || item.categoria_padel || "—";
  const provincia =
    item.perfiles?.lugar_residencia ||
    item.provincia_jurisdiccion ||
    item.perfiles?.clubes?.provincia ||
    "—";
  return `${categoria} · ${provincia}`;
}

function TrendPill({ tendencia }: { tendencia: number }) {
  if (tendencia > 0) {
    return (
      <Text className="font-sans-semibold text-[10px] text-emerald-400">
        ↑ +{tendencia}
      </Text>
    );
  }
  if (tendencia < 0) {
    return (
      <Text className="font-sans-semibold text-[10px] text-red-400">
        ↓ {tendencia}
      </Text>
    );
  }
  return (
    <Text className="font-sans-semibold text-[10px] text-brand-muted">— 0</Text>
  );
}

function PodiumSlot({
  item,
  rank,
  height,
  medalColor,
  highlighted,
  onPress,
}: {
  item: RankingJugador;
  rank: number;
  height: number;
  medalColor: string;
  highlighted?: boolean;
  onPress?: () => void;
}) {
  const name = playerName(item);
  const uri = item.perfiles?.avatar_url;
  const shortName =
    name.length > 14 ? `${name.split(" ")[0]} ${name.split(" ").slice(-1)[0]?.charAt(0)}.` : name;

  return (
    <Pressable onPress={onPress} className="flex-1 items-center pt-2">
      <View className="mb-1 h-7 items-center justify-center">
        {rank === 1 ? (
          <MaterialCommunityIcons name="crown" size={26} color={medalColor} />
        ) : (
          <MaterialCommunityIcons
            name="medal-outline"
            size={24}
            color={medalColor}
          />
        )}
      </View>

      <View
        className={`w-full items-center rounded-t-2xl border bg-brand-surface px-2 pb-3 pt-2 ${
          highlighted ? "border-brand-chartreuse" : "border-brand-border"
        }`}
        style={{ height }}
      >
        <LinearGradient
          colors={[`${medalColor}22`, "transparent"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: height * 0.55,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        />

        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: 46, height: 46, borderRadius: 23, marginBottom: 6 }}
            contentFit="cover"
          />
        ) : (
          <View className="mb-1.5 h-11 w-11 items-center justify-center rounded-full bg-brand-elevated">
            <Text className="font-sans-bold text-base text-white">
              {name.charAt(0)}
            </Text>
          </View>
        )}

        <Text
          className="text-center font-sans-bold text-xs text-white"
          numberOfLines={2}
        >
          {shortName}
        </Text>
        <Text
          className="mt-0.5 text-center font-sans text-[10px] text-brand-muted"
          numberOfLines={2}
        >
          {playerMeta(item)}
        </Text>

        <Text className="mt-1.5 font-sans-bold text-xl" style={{ color: medalColor }}>
          {rank}
        </Text>

        <Text className="mt-0.5 font-sans-bold text-xs text-white">
          {item.puntos.toLocaleString("es-AR")} pts
        </Text>
        <Text className="mt-0.5 font-sans text-[10px] text-brand-muted">
          PJ {item.pj} · PG {item.pg}
        </Text>
        <View className="mt-1">
          <TrendPill tendencia={item.tendencia || 0} />
        </View>
      </View>
    </Pressable>
  );
}

interface RankingPodiumProps {
  topThree: RankingJugador[];
  highlightUserId?: string | null;
  onPressPlayer?: (item: RankingJugador, rank: number) => void;
}

export function RankingPodium({
  topThree,
  highlightUserId,
  onPressPlayer,
}: RankingPodiumProps) {
  if (topThree.length === 0) return null;

  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  return (
    <View className="mb-2 flex-row items-end gap-2 px-1">
      {second ? (
        <PodiumSlot
          item={second}
          rank={2}
          height={188}
          medalColor="#C0C0C0"
          highlighted={second.usuario_id === highlightUserId}
          onPress={() => onPressPlayer?.(second, 2)}
        />
      ) : (
        <View className="flex-1" />
      )}
      {first ? (
        <PodiumSlot
          item={first}
          rank={1}
          height={220}
          medalColor="#CBFE01"
          highlighted={first.usuario_id === highlightUserId}
          onPress={() => onPressPlayer?.(first, 1)}
        />
      ) : null}
      {third ? (
        <PodiumSlot
          item={third}
          rank={3}
          height={176}
          medalColor="#CD7F32"
          highlighted={third.usuario_id === highlightUserId}
          onPress={() => onPressPlayer?.(third, 3)}
        />
      ) : (
        <View className="flex-1" />
      )}
    </View>
  );
}

export function RankingListRow({
  item,
  rank,
  isMe,
  onPress,
}: {
  item: RankingJugador;
  rank: number;
  isMe?: boolean;
  onPress?: () => void;
}) {
  const name = playerName(item);
  const tendencia = item.tendencia || 0;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 overflow-hidden rounded-card border px-3.5 py-3.5 ${
        isMe
          ? "border-brand-chartreuse/50 bg-brand-chartreuse/5"
          : "border-brand-border bg-brand-surface"
      }`}
    >
      {isMe ? (
        <LinearGradient
          colors={["rgba(203,254,1,0.2)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
      ) : null}
      <Text className="w-8 text-center font-sans-bold text-xl text-white/80">
        {rank}
      </Text>
      <View className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-elevated">
        {item.perfiles?.avatar_url ? (
          <Image
            source={{ uri: item.perfiles.avatar_url }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            contentFit="cover"
          />
        ) : (
          <FontAwesome name="user" size={16} color="#8A8A8A" />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans-bold text-base text-white" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-0.5 font-sans text-xs text-brand-muted" numberOfLines={1}>
          {playerMeta(item)}
        </Text>
        <Text className="mt-0.5 font-sans text-[11px] text-brand-muted">
          PJ {item.pj} · PG {item.pg}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Text className="font-sans-bold text-base text-white">
          {item.puntos.toLocaleString("es-AR")}
        </Text>
        {tendencia > 0 ? (
          <Text className="font-sans-semibold text-xs text-emerald-400">
            ↑ +{tendencia}
          </Text>
        ) : tendencia < 0 ? (
          <Text className="font-sans-semibold text-xs text-red-400">
            ↓ {tendencia}
          </Text>
        ) : (
          <Text className="font-sans-semibold text-xs text-brand-muted">— 0</Text>
        )}
      </View>
    </Pressable>
  );
}
