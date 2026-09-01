import * as ImagePicker from "expo-image-picker";

const MAX_BYTES = 2 * 1024 * 1024;

export interface AvatarSelection {
  uri: string;
  base64: string;
}

export async function pickAvatarFromLibrary(): Promise<AvatarSelection | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Necesitamos permiso para acceder a tus fotos.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
    base64: true,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return toAvatarSelection(result.assets[0]);
}

export async function takeAvatarPhoto(): Promise<AvatarSelection | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Necesitamos permiso para usar la cámara.");
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
    base64: true,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return toAvatarSelection(result.assets[0]);
}

function toAvatarSelection(
  asset: ImagePicker.ImagePickerAsset,
): AvatarSelection {
  if (!asset.base64) {
    throw new Error("No se pudo procesar la imagen seleccionada.");
  }

  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    throw new Error("La imagen no debe superar los 2MB.");
  }

  const mimeType = asset.mimeType ?? "image/jpeg";
  return {
    uri: asset.uri,
    base64: `data:${mimeType};base64,${asset.base64}`,
  };
}
