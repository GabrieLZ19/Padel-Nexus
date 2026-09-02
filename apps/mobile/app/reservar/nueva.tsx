import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ClubNearCard } from "@/src/components/reservar/ClubNearCard";
import { ClubsMapView } from "@/src/components/reservar/ClubsMapView";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useClubesCercanos } from "@/src/hooks/useClubesCercanos";
import { useUserLocation } from "@/src/hooks/useUserLocation";
import { hrefReservarClub } from "@/src/lib/navigation";

export default function ReservarNuevaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coords } = useUserLocation();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { clubes, loading, error, disponiblesCount, reload } = useClubesCercanos({
    lat: coords?.latitude,
    lng: coords?.longitude,
    search: searchDebounced || undefined,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const onSearchSubmit = useCallback(() => {
    setSearchDebounced(search.trim());
  }, [search]);

  const irAClub = useCallback(
    (clubId: string) => {
      router.push(hrefReservarClub(clubId));
    },
    [router],
  );

  return (
    <View className="flex-1 bg-brand-black">
      <View className="px-6">
        <ScreenHeader title="Reservar cancha" />
      </View>

      <FlatList
        data={loading ? [] : clubes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center gap-2 rounded-full border border-brand-border bg-brand-surface px-4 py-3">
                <FontAwesome name="search" size={16} color="#8A8A8A" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={onSearchSubmit}
                  placeholder="Buscar canchas cerca tuyo"
                  placeholderTextColor="#8A8A8A"
                  returnKeyType="search"
                  className="flex-1 font-sans text-base text-white"
                />
              </View>
              <Pressable
                onPress={onSearchSubmit}
                className="h-12 w-12 items-center justify-center rounded-full border border-brand-border bg-brand-surface active:opacity-80"
              >
                <FontAwesome name="sliders" size={18} color="#CBFE01" />
              </Pressable>
            </View>

            <ClubsMapView
              clubs={clubes}
              userCoords={coords}
              selectedClubId={selectedClubId}
              onSelectClub={(id) => {
                if (selectedClubId === id) {
                  irAClub(id);
                  return;
                }
                setSelectedClubId(id);
              }}
              height={260}
            />

            <View className="flex-row items-center justify-between">
              <Text className="font-sans-bold text-lg text-white">
                Canchas cercanas
              </Text>
              <Text className="font-sans text-sm text-brand-muted">
                {disponiblesCount || clubes.length} disponibles
              </Text>
            </View>

            {error ? (
              <Text className="font-sans text-sm text-red-400">{error}</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ClubNearCard
            club={item}
            onPress={() => irAClub(item.id)}
            onReservar={() => irAClub(item.id)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View className="gap-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </View>
          ) : (
            <View className="items-center rounded-card border border-brand-border bg-brand-surface p-8">
              <Text className="text-center font-sans text-base text-brand-muted">
                No encontramos clubes con esos criterios.
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#CBFE01"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
