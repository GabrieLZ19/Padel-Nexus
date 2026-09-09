import { supabaseAdmin } from "../config/supabase";
import {
  LEGAL_TIPOS,
  LEGAL_VERSIONES_PILOTO,
  type LegalTipo,
} from "../constants/legal";

export class LegalService {
  static assertTipo(tipo: string): LegalTipo {
    if (!(LEGAL_TIPOS as readonly string[]).includes(tipo)) {
      throw new Error(
        `Tipo de documento inválido. Use: ${LEGAL_TIPOS.join(", ")}`,
      );
    }
    return tipo as LegalTipo;
  }

  static async obtenerActivo(tipo: string) {
    const tipoOk = LegalService.assertTipo(tipo);
    const { data, error } = await supabaseAdmin
      .from("legal_documentos")
      .select("id, tipo, version, titulo, contenido_md, vigente_desde, activo")
      .eq("tipo", tipoOk)
      .eq("activo", true)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo obtener el documento: ${error.message}`);
    }
    if (!data) {
      throw new Error(`No hay documento activo para tipo: ${tipoOk}`);
    }
    return data;
  }

  static async obtenerVersionesActivas() {
    const { data, error } = await supabaseAdmin
      .from("legal_documentos")
      .select("tipo, version, titulo")
      .eq("activo", true);

    if (error) {
      throw new Error(`No se pudieron listar documentos: ${error.message}`);
    }

    const map: Record<string, { version: string; titulo: string }> = {};
    for (const row of data || []) {
      map[row.tipo] = { version: row.version, titulo: row.titulo };
    }

    // Fallback a constantes de piloto si falta seed
    for (const [tipo, version] of Object.entries(LEGAL_VERSIONES_PILOTO)) {
      if (!map[tipo]) {
        map[tipo] = { version, titulo: tipo };
      }
    }

    return map;
  }
}
