import FontAwesome from "@expo/vector-icons/FontAwesome";
import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  error?: string;
  secureToggle?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    icon,
    error,
    secureToggle = false,
    secureTextEntry,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  const isSecure = secureToggle ? hidden : secureTextEntry;
  const borderClass = error
    ? "border-red-500"
    : focused
      ? "border-brand-chartreuse"
      : "border-brand-border";

  return (
    <View className="w-full gap-2">
      <Text className="font-sans-medium text-sm text-brand-muted">{label}</Text>
      <View
        className={`h-14 flex-row items-center rounded-field border bg-brand-elevated px-4 ${borderClass}`}
      >
        {icon ? (
          <FontAwesome
            name={icon}
            size={16}
            color={focused ? "#CBFE01" : "#8A8A8A"}
            style={{ marginRight: 12 }}
          />
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor="#6B6B6B"
          className="flex-1 font-sans text-base text-white"
          secureTextEntry={isSecure}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar contraseña" : "Ocultar contraseña"}
            onPress={() => setHidden((value) => !value)}
            hitSlop={8}
          >
            <FontAwesome
              name={hidden ? "eye-slash" : "eye"}
              size={18}
              color={focused ? "#CBFE01" : "#8A8A8A"}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="font-sans text-xs text-red-400">{error}</Text>
      ) : null}
    </View>
  );
});
