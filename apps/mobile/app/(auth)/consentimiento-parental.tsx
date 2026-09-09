import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui/Button";
import { MenoresService } from "@/src/services/legal";

function CheckRow({
  value,
  onToggle,
  label,
}: {
  value: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Pressable onPress={onToggle} className="mt-4 flex-row items-start gap-3">
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
          value
            ? "border-brand-chartreuse bg-brand-chartreuse"
            : "border-brand-border"
        }`}
      >
        {value ? <FontAwesome name="check" size={11} color="#000" /> : null}
      </View>
      <Text className="flex-1 font-sans text-sm leading-5 text-brand-muted">
        {label}
      </Text>
    </Pressable>
  );
}

export default function ConsentimientoParentalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = String(params.token || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [contenido, setContenido] = useState("");
  const [jugadorLabel, setJugadorLabel] = useState("");

  const [declara, setDeclara] = useState(false);
  const [esencial, setEsencial] = useState(false);
  const [privacidad, setPrivacidad] = useState(false);
  const [perfilPublico, setPerfilPublico] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await MenoresService.getConsentimientoPorToken(token);
        if (cancelled) return;
        if (data.estado === "ya_verificado") {
          setDone(true);
          return;
        }
        const jugador = data.jugador as
          | { nombre?: string; apellido?: string; edad_aprox?: number }
          | undefined;
        setJugadorLabel(
          `${jugador?.nombre || ""} ${jugador?.apellido || ""}${
            jugador?.edad_aprox != null ? ` · ${jugador.edad_aprox} años` : ""
          }`.trim(),
        );
        const docs = data.documentos as
          | { consentimiento_parental?: { contenido_md?: string } }
          | undefined;
        setContenido(docs?.consentimiento_parental?.contenido_md || "");
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el enlace.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onConfirm() {
    if (!declara || !esencial || !privacidad) {
      setError("Completá las declaraciones obligatorias.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await MenoresService.confirmarConsentimiento(token, {
        declara_representacion: declara,
        consentimiento_esencial: esencial,
        leyo_privacidad_menores: privacidad,
        autoriza_perfil_publico: perfilPublico,
      });
      setDone(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo confirmar el consentimiento.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-black">
        <ActivityIndicator color="#CBFE01" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-black"
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 20,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        className="mb-6 h-10 w-10 items-center justify-center rounded-field border border-brand-border"
      >
        <FontAwesome name="chevron-left" size={14} color="#fff" />
      </Pressable>

      {done ? (
        <View>
          <Text className="font-sans-bold text-2xl uppercase text-white">
            Cuenta protegida activada
          </Text>
          <Text className="mt-3 font-sans text-base text-brand-muted">
            El modo de protección para menores quedó activo.
          </Text>
          <View className="mt-8">
            <Button
              label="Ir al inicio"
              onPress={() => router.replace("/(auth)/login")}
            />
          </View>
        </View>
      ) : (
        <View>
          <Text className="font-sans-bold text-2xl uppercase text-white">
            Consentimiento parental
          </Text>
          {jugadorLabel ? (
            <Text className="mt-2 font-sans text-sm text-brand-chartreuse">
              {jugadorLabel}
            </Text>
          ) : null}
          <Text className="mt-4 font-sans text-sm leading-5 text-brand-muted">
            {contenido || "Texto de consentimiento no disponible."}
          </Text>

          <CheckRow
            value={declara}
            onToggle={() => setDeclara((v) => !v)}
            label="Declaro responsabilidad parental / representación suficiente"
          />
          <CheckRow
            value={esencial}
            onToggle={() => setEsencial((v) => !v)}
            label="Consentimiento para tratamiento de datos deportivos esenciales"
          />
          <CheckRow
            value={privacidad}
            onToggle={() => setPrivacidad((v) => !v)}
            label="Leí la Política de Privacidad para Jugadores Menores"
          />
          <CheckRow
            value={perfilPublico}
            onToggle={() => setPerfilPublico((v) => !v)}
            label="Autorizo perfil deportivo público (opcional, sin foto)"
          />

          {error ? (
            <Text className="mt-4 font-sans text-sm text-red-400">{error}</Text>
          ) : null}

          <View className="mt-6">
            <Button
              label="Confirmar consentimiento"
              loading={saving}
              onPress={() => void onConfirm()}
            />
          </View>

          <Link
            href="/(auth)/login"
            className="mt-6 text-center font-sans-bold text-brand-chartreuse"
          >
            Ir al login
          </Link>
        </View>
      )}
    </ScrollView>
  );
}
