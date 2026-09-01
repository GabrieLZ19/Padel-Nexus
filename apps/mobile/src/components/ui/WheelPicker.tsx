import { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  type ListRenderItem,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const WHEEL_ITEM_HEIGHT = 44;
export const WHEEL_VISIBLE_ITEMS = 5;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

export interface WheelPickerItem<T extends string | number> {
  value: T;
  label: string;
}

interface WheelPickerProps<T extends string | number> {
  items: readonly WheelPickerItem<T>[];
  value: T;
  onChange: (value: T) => void;
  flex?: number;
}

export function WheelPicker<T extends string | number>({
  items,
  value,
  onChange,
  flex = 1,
}: WheelPickerProps<T>) {
  const listRef = useRef<FlatList<WheelPickerItem<T>>>(null);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );
  const paddingVertical = (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;
  const isUserScroll = useRef(false);

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (index < 0 || index >= items.length) return;
      listRef.current?.scrollToOffset({
        offset: index * WHEEL_ITEM_HEIGHT,
        animated,
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (isUserScroll.current) {
      isUserScroll.current = false;
      return;
    }
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  const onMomentumScrollEnd = useCallback(
    (offsetY: number) => {
      const index = Math.max(
        0,
        Math.min(Math.round(offsetY / WHEEL_ITEM_HEIGHT), items.length - 1),
      );
      const next = items[index];
      if (!next) return;
      isUserScroll.current = true;
      onChange(next.value);
    },
    [items, onChange],
  );

  const renderItem: ListRenderItem<WheelPickerItem<T>> = useCallback(
    ({ item, index }) => {
      const active = index === selectedIndex;
      return (
        <View style={styles.item}>
          <Text
            className={`text-center font-sans text-base ${
              active ? "font-sans-bold text-brand-chartreuse" : "text-brand-muted"
            }`}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </View>
      );
    },
    [selectedIndex],
  );

  return (
    <View style={[styles.column, { flex }]}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item.value)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingVertical }}
        getItemLayout={(_, index) => ({
          length: WHEEL_ITEM_HEIGHT,
          offset: WHEEL_ITEM_HEIGHT * index,
          index,
        })}
        onMomentumScrollEnd={(event) =>
          onMomentumScrollEnd(event.nativeEvent.contentOffset.y)
        }
        onScrollEndDrag={(event) => {
          if (!event.nativeEvent.velocity?.y) {
            onMomentumScrollEnd(event.nativeEvent.contentOffset.y);
          }
        }}
        initialScrollIndex={selectedIndex}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => scrollToIndex(info.index, false), 50);
        }}
      />
      <View style={styles.highlight} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    height: WHEEL_HEIGHT,
    overflow: "hidden",
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  highlight: {
    position: "absolute",
    left: 4,
    right: 4,
    top: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBFE01",
    backgroundColor: "rgba(203, 254, 1, 0.08)",
    zIndex: 1,
  },
});
