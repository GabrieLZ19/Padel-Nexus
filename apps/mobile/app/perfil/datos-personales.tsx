import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPickerField } from "@/src/components/ui/AvatarPickerField";
import { Button } from "@/src/components/ui/Button";
import { DateField } from "@/src/components/ui/DateField";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { SelectField } from "@/src/components/ui/SelectField";
import { TextField } from "@/src/components/ui/TextField";
import {
  LADOS_PADEL,
  NIVELES_PADEL,
  PROVINCIAS_ARG,
  SEXOS,
} from "@/src/constants/padelConfig";
import type { AvatarSelection } from "@/src/lib/avatarPicker";
import {
  normalizeDni,
  sanitizeDniInput,
  sanitizeTelefonoInput,
  validateDni,
  validateNombre,
  validateTelefono,
} from "@/src/lib/validation";
import { PerfilService } from "@/src/services/perfil";
import { useAuthStore } from "@/src/stores/authStore";

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function DatosPersonalesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);

  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [apellido, setApellido] = useState(usuario?.apellido || "");
  const [telefono, setTelefono] = useState(usuario?.telefono || "");
  const [dni, setDni] = useState(usuario?.dni || "");
  const [lugarResidencia, setLugarResidencia] = useState(
    usuario?.lugar_residencia || "",
  );
  const [fechaNacimiento, setFechaNacimiento] = useState(
    toDateInputValue(usuario?.fecha_nacimiento),
  );
  const [sexo, setSexo] = useState(usuario?.sexo || "");
  const [categoria, setCategoria] = useState(usuario?.categoria_padel || "");
  const [lado, setLado] = useState(usuario?.lado_preferido || "");
  const [avatar, setAvatar] = useState<AvatarSelection | null>(
    usuario?.avatar_url
      ? { uri: usuario.avatar_url, base64: "" }
      : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    setNombre(usuario.nombre || "");
    setApellido(usuario.apellido || "");
    setTelefono(usuario.telefono || "");
    setDni(usuario.dni || "");
    setLugarResidencia(usuario.lugar_residencia || "");
    setFechaNacimiento(toDateInputValue(usuario.fecha_nacimiento));
    setSexo(usuario.sexo || "");
    setCategoria(usuario.categoria_padel || "");
    setLado(usuario.lado_preferido || "");
    setAvatar(
      usuario.avatar_url
        ? { uri: usuario.avatar_url, base64: "" }
        : null,
    );
  }, [usuario]);

  const nivelOptions = useMemo(
    () => NIVELES_PADEL.map((n) => ({ value: n.value, label: n.label })),
    [],
  );

  async function onSave() {
    const nextErrors: Record<string, string> = {};

    if (!validateNombre(nombre)) {
      nextErrors.nombre = "Nombre inválido (mín. 2 letras, sin números).";
    }
    if (!validateNombre(apellido)) {
      nextErrors.apellido = "Apellido inválido (mín. 2 letras, sin números).";
    }
    if (!validateDni(dni)) {
      nextErrors.dni = "El DNI debe tener 7 u 8 dígitos.";
    }
    if (telefono && !validateTelefono(telefono)) {
      nextErrors.telefono = "Teléfono inválido (mín. 10 dígitos).";
    }
    if (!lugarResidencia) {
      nextErrors.lugar_residencia = "La provincia es obligatoria.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFeedback(null);
      return;
    }

    setSaving(true);
    setErrors({});
    setFeedback(null);

    try {
      if (avatar?.base64) {
        await PerfilService.subirAvatar(avatar.base64);
      }

      const updated = await PerfilService.updateMe({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim() || null,
        dni: normalizeDni(dni),
        lugar_residencia: lugarResidencia,
        fecha_nacimiento: fechaNacimiento || null,
        sexo: (sexo as "masculino" | "femenino" | "otro") || null,
        categoria_padel: categoria || null,
        lado_preferido: lado || null,
      });

      setUsuario(updated);
      setFeedback("Perfil actualizado.");
      setTimeout(() => router.back(), 600);
    } catch (err: unknown) {
      setFeedback(
        err instanceof Error ? err.message : "No se pudo guardar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Datos personales" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          gap: 14,
          paddingBottom: insets.bottom + 28,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AvatarPickerField
          value={avatar}
          onChange={setAvatar}
          error={errors.avatar}
        />

        <TextField
          label="Nombre"
          value={nombre}
          onChangeText={setNombre}
          error={errors.nombre}
          autoCapitalize="words"
        />
        <TextField
          label="Apellido"
          value={apellido}
          onChangeText={setApellido}
          error={errors.apellido}
          autoCapitalize="words"
        />
        <TextField
          label="Email"
          value={usuario?.email || ""}
          editable={false}
          icon="envelope"
        />
        <TextField
          label="DNI"
          value={dni}
          onChangeText={(v) => setDni(sanitizeDniInput(v))}
          error={errors.dni}
          keyboardType="numeric"
          icon="id-card"
        />
        <TextField
          label="Teléfono"
          value={telefono}
          onChangeText={(v) => setTelefono(sanitizeTelefonoInput(v))}
          error={errors.telefono}
          keyboardType="phone-pad"
          icon="phone"
        />
        <SelectField
          label="Provincia"
          value={lugarResidencia}
          onChange={setLugarResidencia}
          options={PROVINCIAS_ARG}
          error={errors.lugar_residencia}
        />
        <DateField
          label="Fecha de nacimiento"
          value={fechaNacimiento}
          onChange={setFechaNacimiento}
        />
        <SelectField
          label="Sexo"
          value={sexo}
          onChange={setSexo}
          options={SEXOS}
          icon="user"
        />
        <SelectField
          label="Categoría"
          value={categoria}
          onChange={setCategoria}
          options={nivelOptions}
          icon="trophy"
        />
        <SelectField
          label="Lado preferido"
          value={lado}
          onChange={setLado}
          options={LADOS_PADEL}
          icon="exchange"
        />

        {feedback ? (
          <Text
            className={`font-sans text-sm ${
              feedback.includes("actualizado")
                ? "text-brand-chartreuse"
                : "text-red-400"
            }`}
          >
            {feedback}
          </Text>
        ) : null}

        <Button label="Guardar cambios" loading={saving} onPress={() => void onSave()} />
      </ScrollView>
    </View>
  );
}
