import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PROVINCIAS_ARG } from "@/src/constants/padelConfig";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly SelectOption[];
  placeholder?: string;
  error?: string;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
}

export function SelectField({
  label,
  value,
  onChange,
  options = PROVINCIAS_ARG,
  placeholder = "Seleccioná",
  error,
  icon = "map-marker",
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const selected = useMemo(
    () => options.find((item) => item.value === value),
    [options, value],
  );

  function closeModal() {
    setOpen(false);
    setFocused(false);
  }

  return (
    <View className="w-full gap-2">
      <Text className="font-sans-medium text-sm text-brand-muted">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setFocused(true);
          setOpen(true);
        }}
        className={`h-14 flex-row items-center rounded-field border bg-brand-elevated px-4 ${
          error
            ? "border-red-500"
            : focused
              ? "border-brand-chartreuse"
              : "border-brand-border"
        }`}
      >
        <FontAwesome
          name={icon}
          size={16}
          color={focused ? "#CBFE01" : "#8A8A8A"}
          style={{ marginRight: 12 }}
        />
        <Text
          className={`flex-1 font-sans text-base ${
            selected ? "text-white" : "text-[#6B6B6B]"
          }`}
        >
          {selected?.label ?? placeholder}
        </Text>
        <FontAwesome name="chevron-down" size={14} color="#8A8A8A" />
      </Pressable>
      {error ? (
        <Text className="font-sans text-xs text-red-400">{error}</Text>
      ) : null}

      <BottomSheet visible={open} onClose={closeModal} title={label}>
        <FlatList
          data={options}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                className={`mx-4 mb-2 flex-row items-center justify-between rounded-field border px-4 py-4 ${
                  active
                    ? "border-brand-chartreuse bg-brand-elevated"
                    : "border-brand-border bg-brand-black"
                }`}
                onPress={() => {
                  onChange(item.value);
                  closeModal();
                }}
              >
                <Text
                  className={`flex-1 pr-3 font-sans text-base ${
                    active ? "text-brand-chartreuse" : "text-white"
                  }`}
                >
                  {item.label}
                </Text>
                {active ? (
                  <FontAwesome name="check" size={14} color="#CBFE01" />
                ) : null}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </View>
  );
}
