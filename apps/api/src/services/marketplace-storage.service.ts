import sharp from "sharp";
import { supabaseAdmin } from "../config/supabase";
import { MARKETPLACE_STORAGE } from "../constants/marketplace";

interface ImagenSubida {
  imagenUrl: string;
  thumbnailUrl: string;
}

export class MarketplaceStorageService {
  /**
   * Procesa y sube una imagen al bucket de marketplace.
   * 1. Decodifica base64 → Buffer
   * 2. Resize a max 800px de ancho + conversión a WebP (calidad 80%)
   * 3. Genera thumbnail a 200px de ancho + WebP (calidad 70%)
   * 4. Sube ambas versiones a Supabase Storage
   *
   * Resultado: una imagen de 3-5MB se reduce a ~50-100KB
   */
  static async subirImagen(
    vendedorId: string,
    productoId: string,
    base64Data: string,
  ): Promise<ImagenSubida> {
    // 1. Extraer datos del base64
    const matches = base64Data.match(/^data:image\/\w+;base64,(.+)$/);
    const rawBuffer = matches
      ? Buffer.from(matches[1], "base64")
      : Buffer.from(base64Data, "base64");

    // Validar tamaño antes de comprimir
    if (rawBuffer.length > MARKETPLACE_STORAGE.MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `La imagen excede el tamaño máximo de ${MARKETPLACE_STORAGE.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      );
    }

    const timestamp = Date.now();
    const basePath = `${vendedorId}/${productoId}`;

    // 2. Comprimir imagen principal a WebP
    const imagenComprimida = await sharp(rawBuffer)
      .resize({ width: MARKETPLACE_STORAGE.MAX_ANCHO_PX, withoutEnlargement: true })
      .webp({ quality: MARKETPLACE_STORAGE.CALIDAD_WEBP })
      .toBuffer();

    // 3. Generar thumbnail
    const thumbnail = await sharp(rawBuffer)
      .resize({ width: MARKETPLACE_STORAGE.THUMBNAIL_ANCHO_PX, withoutEnlargement: true })
      .webp({ quality: MARKETPLACE_STORAGE.CALIDAD_THUMBNAIL })
      .toBuffer();

    // 4. Subir imagen principal
    const imagenPath = `${basePath}/img_${timestamp}.webp`;
    const { error: errorImagen } = await supabaseAdmin.storage
      .from(MARKETPLACE_STORAGE.BUCKET)
      .upload(imagenPath, imagenComprimida, {
        contentType: "image/webp",
        upsert: true,
      });

    if (errorImagen) {
      throw new Error(`Error al subir imagen: ${errorImagen.message}`);
    }

    // 5. Subir thumbnail
    const thumbPath = `${basePath}/thumb_${timestamp}.webp`;
    const { error: errorThumb } = await supabaseAdmin.storage
      .from(MARKETPLACE_STORAGE.BUCKET)
      .upload(thumbPath, thumbnail, {
        contentType: "image/webp",
        upsert: true,
      });

    if (errorThumb) {
      console.error("⚠️ Error al subir thumbnail:", errorThumb.message);
    }

    // 6. Obtener URLs públicas
    const { data: { publicUrl: imagenUrl } } = supabaseAdmin.storage
      .from(MARKETPLACE_STORAGE.BUCKET)
      .getPublicUrl(imagenPath);

    const { data: { publicUrl: thumbnailUrl } } = supabaseAdmin.storage
      .from(MARKETPLACE_STORAGE.BUCKET)
      .getPublicUrl(thumbPath);

    return { imagenUrl, thumbnailUrl };
  }

  /**
   * Sube múltiples imágenes para un producto.
   * Respeta el límite de MAX_IMAGENES_POR_PRODUCTO.
   */
  static async subirImagenes(
    vendedorId: string,
    productoId: string,
    imagenesBase64: string[],
  ): Promise<{ imagenes: string[]; thumbnailUrl: string }> {
    const limitadas = imagenesBase64.slice(
      0,
      MARKETPLACE_STORAGE.MAX_IMAGENES_POR_PRODUCTO,
    );

    const resultados: ImagenSubida[] = [];

    for (const base64 of limitadas) {
      const resultado = await this.subirImagen(vendedorId, productoId, base64);
      resultados.push(resultado);
    }

    return {
      imagenes: resultados.map((r) => r.imagenUrl),
      thumbnailUrl: resultados[0]?.thumbnailUrl || "",
    };
  }

  /**
   * Elimina todas las imágenes de un producto del storage.
   */
  static async eliminarImagenesProducto(
    vendedorId: string,
    productoId: string,
  ): Promise<void> {
    const carpeta = `${vendedorId}/${productoId}`;

    const { data: archivos, error } = await supabaseAdmin.storage
      .from(MARKETPLACE_STORAGE.BUCKET)
      .list(carpeta);

    if (error || !archivos || archivos.length === 0) return;

    const rutas = archivos.map((f) => `${carpeta}/${f.name}`);

    const { error: deleteError } = await supabaseAdmin.storage
      .from(MARKETPLACE_STORAGE.BUCKET)
      .remove(rutas);

    if (deleteError) {
      console.error(
        "⚠️ Error al eliminar imágenes del producto:",
        deleteError.message,
      );
    }
  }

  /**
   * Gestiona la actualización de imágenes de un producto.
   */
  static async actualizarImagenes(
    vendedorId: string,
    productoId: string,
    imagenesExistentes: string[],
    imagenesNuevasBase64: string[],
  ): Promise<{ imagenes: string[]; thumbnailUrl: string }> {
    const nuevasUrls: string[] = [];
    let nuevoThumb = "";

    if (imagenesNuevasBase64.length > 0) {
      const espacioDisponible =
        MARKETPLACE_STORAGE.MAX_IMAGENES_POR_PRODUCTO -
        imagenesExistentes.length;
      const aSubir = imagenesNuevasBase64.slice(
        0,
        Math.max(0, espacioDisponible),
      );

      for (const base64 of aSubir) {
        const resultado = await this.subirImagen(
          vendedorId,
          productoId,
          base64,
        );
        nuevasUrls.push(resultado.imagenUrl);
        if (!nuevoThumb) nuevoThumb = resultado.thumbnailUrl;
      }
    }

    const todasLasImagenes = [...imagenesExistentes, ...nuevasUrls];

    const thumbnailUrl =
      nuevoThumb ||
      (imagenesExistentes[0] || "").replace("/img_", "/thumb_") ||
      "";

    return { imagenes: todasLasImagenes, thumbnailUrl };
  }
}
