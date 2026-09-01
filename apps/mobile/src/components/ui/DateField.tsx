import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Button } from "@/src/components/ui/Button";
import { DatePickerWheel } from "@/src/components/ui/DatePickerWheel";
import {
  formatDateDisplay,
  formatIsoDate,
  parseIsoDate,
} from "@/src/lib/dateUtils";

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

export { formatIsoDate as formatDateValue };

export function DateField({
  label,
  value,
  onChange,
  placeholder = "Seleccioná",
  error,
  maximumDate = new Date(),
  minimumDate = new Date(1920, 0, 1),
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => parseIsoDate(value));

  const labelValue = useMemo(() => formatDateDisplay(value), [value]);

  function closeModal() {
    setOpen(false);
    setFocused(false);
  }

  function openModal() {
    setDraft(parseIsoDate(value));
    setFocused(true);
    setOpen(true);
  }

  function confirmSelection() {
    onChange(formatIsoDate(draft));
    closeModal();
  }

  return (
    <View className="w-full gap-2">
      <Text className="font-sans-medium text-sm text-brand-muted">{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={openModal}
        className={`h-14 flex-row items-center rounded-field border bg-brand-elevated px-4 ${
          error
            ? "border-red-500"
            : focused
              ? "border-brand-chartreuse"
              : "border-brand-border"
        }`}
      >
        <FontAwesome
          name="calendar"
          size={16}
          color={focused ? "#CBFE01" : "#8A8A8A"}
          style={{ marginRight: 12 }}
        />
        <Text
          className={`flex-1 font-sans text-base ${
            labelValue ? "text-white" : "text-[#6B6B6B]"
          }`}
        >
          {labelValue || placeholder}
        </Text>
        <FontAwesome name="chevron-down" size={14} color="#8A8A8A" />
      </Pressable>
      {error ? (
        <Text className="font-sans text-xs text-red-400">{error}</Text>
      ) : null}

      <BottomSheet
        visible={open}
        onClose={closeModal}
        title={label}
        footer={
          <View className="gap-3 px-6 pt-4">
            <Button label="Confirmar" onPress={confirmSelection} />
            <Pressable
              onPress={closeModal}
              className="h-12 items-center justify-center"
            >
              <Text className="font-sans-semibold text-base text-brand-muted">
                Cancelar
              </Text>
            </Pressable>
          </View>
        }
      >
        <View className="px-4">
          <DatePickerWheel
            value={draft}
            onChange={setDraft}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        </View>
      </BottomSheet>
    </View>
  );
}
