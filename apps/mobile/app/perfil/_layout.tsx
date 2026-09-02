import { Stack } from "expo-router";

export default function PerfilStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="datos-personales" />
      <Stack.Screen name="licencia" />
      <Stack.Screen name="metodos-pago" />
    </Stack>
  );
}
