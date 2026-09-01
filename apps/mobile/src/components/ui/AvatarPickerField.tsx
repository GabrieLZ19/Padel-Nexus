import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import {
  pickAvatarFromLibrary,
  takeAvatarPhoto,
  type AvatarSelection,
} from "@/src/lib/avatarPicker";

interface AvatarPickerFieldProps {
  label?: string;
  value: AvatarSelection | null;
  onChange: (value: AvatarSelection | null) => void;
  error?: string;
}

export function AvatarPickerField({
  label = "Foto de perfil",
  value,
  onChange,
  error,
}: AvatarPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handlePick(
    action: () => Promise<AvatarSelection | null>,
  ) {
    setLocalError(null);
    try {
      const selection = await action();
      if (selection) {
        onChange(selection);
      }
      setOpen(false);
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : "No se pudo cargar la imagen.",
      );
      setOpen(false);
    }
  }

  const displayError = error ?? localError;

  return (
    <View className="items-center gap-3">
      <Text className="font-sans-medium text-sm text-brand-muted">{label}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        className={`h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-2 ${
          displayError ? "border-red-500" : "border-brand-border"
        } bg-brand-elevated`}
      >
        {value?.uri ? (
          <Image
            source={{ uri: value.uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <View className="items-center gap-2">
            <FontAwesome name="camera" size={24} color="#8A8A8A" />
            <Text className="font-sans text-xs text-brand-muted">Agregar</Text>
          </View>
        )}
        <View className="absolute bottom-1 right-1 h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-brand-black/90">
          <FontAwesome name="plus" size={12} color="#CBFE01" />
        </View>
      </Pressable>

      {value ? (
        <Pressable onPress={() => onChange(null)}>
          <Text className="font-sans text-sm text-brand-muted">Quitar foto</Text>
        </Pressable>
      ) : (
        <Text className="text-center font-sans text-xs text-brand-muted">
          Opcional · JPG o PNG, máx. 2MB
        </Text>
      )}

      {displayError ? (
        <Text className="text-center font-sans text-xs text-red-400">
          {displayError}
        </Text>
      ) : null}

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Foto de perfil"
      >
        <View className="gap-3 px-6 pb-2">
          <Pressable
            onPress={() => void handlePick(takeAvatarPhoto)}
            className="flex-row items-center gap-4 rounded-field border border-brand-border bg-brand-black px-4 py-4"
          >
            <FontAwesome name="camera" size={18} color="#CBFE01" />
            <Text className="font-sans text-base text-white">Sacar foto</Text>
          </Pressable>
          <Pressable
            onPress={() => void handlePick(pickAvatarFromLibrary)}
            className="flex-row items-center gap-4 rounded-field border border-brand-border bg-brand-black px-4 py-4"
          >
            <FontAwesome name="image" size={18} color="#CBFE01" />
            <Text className="font-sans text-base text-white">
              Elegir de la galería
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}
