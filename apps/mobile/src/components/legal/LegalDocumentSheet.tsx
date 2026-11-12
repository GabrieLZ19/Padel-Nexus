import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Button } from "@/src/components/ui/Button";
import { resolvePublicWebUrl } from "@/src/lib/resolvePublicWebUrl";
import { LegalService, type LegalTipo } from "@/src/services/legal";

const WEB_PATH: Partial<Record<LegalTipo, string>> = {
  tyc: "/terminos",
  privacidad: "/privacidad",
  privacidad_menores: "/privacidad-menores",
};

interface LegalDocumentSheetProps {
  tipo: LegalTipo | null;
  visible: boolean;
  onClose: () => void;
}

export function LegalDocumentSheet({
  tipo,
  visible,
  onClose,
}: LegalDocumentSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");

  const load = useCallback(async () => {
    if (!tipo) return;
    setLoading(true);
    setError(null);
    try {
      const doc = await LegalService.getDocumento(tipo);
      setTitulo(doc.titulo);
      setContenido(doc.contenido_md);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el documento.",
      );
      setTitulo("");
      setContenido("");
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    if (visible && tipo) {
      void load();
    }
  }, [visible, tipo, load]);

  const webPath = tipo ? WEB_PATH[tipo] : undefined;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={titulo || "Documento legal"}
      maxHeight="88%"
      footer={
        webPath ? (
          <Button
            label="Abrir en el sitio web"
            variant="ghost"
            onPress={() => {
              void Linking.openURL(resolvePublicWebUrl(webPath));
            }}
          />
        ) : undefined
      }
    >
      {loading ? (
        <View className="items-center py-12">
          <ActivityIndicator color="#CBFE01" />
        </View>
      ) : error ? (
        <View className="gap-4">
          <Text className="font-sans text-sm text-red-400">{error}</Text>
          {webPath ? (
            <Pressable
              onPress={() => void Linking.openURL(resolvePublicWebUrl(webPath))}
              className="flex-row items-center gap-2"
            >
              <FontAwesome name="external-link" size={14} color="#CBFE01" />
              <Text className="font-sans-medium text-sm text-brand-chartreuse">
                Ver en el navegador
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView
          className="max-h-[60vh]"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <Text className="font-sans text-sm leading-6 text-brand-muted">
            {contenido}
          </Text>
        </ScrollView>
      )}
    </BottomSheet>
  );
}
