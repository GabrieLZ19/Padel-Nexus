import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WheelPicker, WHEEL_HEIGHT } from "@/src/components/ui/WheelPicker";
import {
  MONTH_LABELS,
  clampDate,
  daysInMonth,
  formatDateLongFromParts,
  fromDateParts,
  isSameDay,
  mergeDateParts,
  toDateParts,
} from "@/src/lib/dateUtils";

interface DatePickerWheelProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

function buildYearItems(min: Date, max: Date) {
  const minYear = toDateParts(min).year;
  const maxYear = toDateParts(max).year;
  const items = [];
  for (let year = maxYear; year >= minYear; year -= 1) {
    items.push({ value: year, label: String(year) });
  }
  return items;
}

function buildMonthItems(year: number, min: Date, max: Date) {
  const minParts = toDateParts(min);
  const maxParts = toDateParts(max);
  const items: { value: number; label: string }[] = [];

  for (let month = 1; month <= 12; month += 1) {
    const monthStart = fromDateParts({ year, month, day: 1 });
    const monthEnd = fromDateParts({ year, month, day: daysInMonth(year, month) });
    if (monthEnd < min || monthStart > max) continue;
    if (year === minParts.year && month < minParts.month) continue;
    if (year === maxParts.year && month > maxParts.month) continue;

    items.push({
      value: month,
      label: MONTH_LABELS[month - 1],
    });
  }

  return items;
}

function buildDayItems(year: number, month: number, min: Date, max: Date) {
  const minParts = toDateParts(min);
  const maxParts = toDateParts(max);
  const total = daysInMonth(year, month);
  const items: { value: number; label: string }[] = [];

  for (let day = 1; day <= total; day += 1) {
    if (year === minParts.year && month === minParts.month && day < minParts.day) {
      continue;
    }
    if (year === maxParts.year && month === maxParts.month && day > maxParts.day) {
      continue;
    }

    items.push({
      value: day,
      label: String(day).padStart(2, "0"),
    });
  }

  return items;
}

function ensureSelectableParts(
  parts: ReturnType<typeof toDateParts>,
  minimumDate: Date,
  maximumDate: Date,
) {
  const bounded = toDateParts(
    clampDate(fromDateParts(parts), minimumDate, maximumDate),
  );
  const days = buildDayItems(bounded.year, bounded.month, minimumDate, maximumDate);
  const months = buildMonthItems(bounded.year, minimumDate, maximumDate);
  const years = buildYearItems(minimumDate, maximumDate);

  let next = { ...bounded };

  if (!years.some((item) => item.value === next.year)) {
    next.year = years[0]?.value ?? next.year;
  }
  if (!months.some((item) => item.value === next.month)) {
    next.month = months[0]?.value ?? next.month;
  }
  if (!days.some((item) => item.value === next.day)) {
    next.day = days[0]?.value ?? next.day;
  }

  return mergeDateParts(next, {});
}

export function DatePickerWheel({
  value,
  onChange,
  minimumDate = fromDateParts({ year: 1920, month: 1, day: 1 }),
  maximumDate = fromDateParts({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  }),
}: DatePickerWheelProps) {
  const parts = useMemo(
    () => ensureSelectableParts(toDateParts(value), minimumDate, maximumDate),
    [value, minimumDate, maximumDate],
  );

  const years = useMemo(
    () => buildYearItems(minimumDate, maximumDate),
    [minimumDate, maximumDate],
  );
  const months = useMemo(
    () => buildMonthItems(parts.year, minimumDate, maximumDate),
    [parts.year, minimumDate, maximumDate],
  );
  const days = useMemo(
    () => buildDayItems(parts.year, parts.month, minimumDate, maximumDate),
    [parts.year, parts.month, minimumDate, maximumDate],
  );

  const preview = formatDateLongFromParts(parts);

  function update(patch: Partial<typeof parts>) {
    const nextParts = ensureSelectableParts(
      mergeDateParts(parts, patch),
      minimumDate,
      maximumDate,
    );
    const nextDate = fromDateParts(nextParts);
    if (!isSameDay(nextDate, fromDateParts(parts))) {
      onChange(nextDate);
    }
  }

  return (
    <View style={styles.root}>
      <Text className="px-2 pb-3 text-center font-sans-semibold text-base text-brand-chartreuse">
        {preview}
      </Text>

      <View style={styles.wheels}>
        <WheelPicker
          key={`days-${parts.year}-${parts.month}`}
          flex={0.9}
          items={days}
          value={parts.day}
          onChange={(nextDay) => update({ day: nextDay })}
        />
        <WheelPicker
          key={`months-${parts.year}`}
          flex={1.4}
          items={months}
          value={parts.month}
          onChange={(nextMonth) => update({ month: nextMonth })}
        />
        <WheelPicker
          flex={1.1}
          items={years}
          value={parts.year}
          onChange={(nextYear) => update({ year: nextYear })}
        />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={["#1A1A1A", "transparent"]}
        style={styles.fadeTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "#1A1A1A"]}
        style={styles.fadeBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingTop: 12,
    paddingBottom: 8,
    overflow: "hidden",
  },
  wheels: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  fadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 52,
    height: WHEEL_HEIGHT * 0.28,
  },
  fadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: WHEEL_HEIGHT * 0.28,
  },
});
