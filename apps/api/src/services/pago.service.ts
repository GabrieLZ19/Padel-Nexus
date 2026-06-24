import { supabase } from "../config/supabase";

interface ProcesarPagoManualDTO {
  entidadTipo: "inscripcion" | "licencia";
  entidadId: string;
  monto: number;
  metodoPago: string; // Ej: "Efectivo", "Transferencia"
  usuarioAdminId: string;
}

export class PagoService {
  /**
   * Registra un pago manual mediante el Checkbox administrativo (Fase 1)
   * Deja la estructura lista para ser llamada por el Webhook de Mercado Pago (Fase 2)
   */
  static async registrarPagoManual(datos: ProcesarPagoManualDTO) {
    const tabla =
      datos.entidadTipo === "inscripcion" ? "inscripciones" : "licencias";

    // 1. VERIFICAR EXISTENCIA DE LA ENTIDAD
    const { data: entidad, error: errFetch } = await supabase
      .from(tabla)
      .select("*")
      .eq("id", datos.entidadId)
      .single();

    if (errFetch || !entidad) {
      throw new Error(
        `No se encontró el registro de ${datos.entidadTipo} especificado.`,
      );
    }

    // 2. ACTUALIZAR EL ESTADO DE PAGO / LICENCIA
    const updatePayload: Record<string, any> = {};

    if (datos.entidadTipo === "inscripcion") {
      updatePayload.estado_pago = "Confirmado"; // Cambia de Pendiente a Confirmado para habilitar al jugador en el fixture
      updatePayload.monto = datos.monto;
    } else {
      updatePayload.estado = "Activa"; // Si es una licencia pendiente, la activa
    }

    const { data: entidadActualizada, error: errUpdate } = await supabase
      .from(tabla)
      .update(updatePayload)
      .eq("id", datos.entidadId)
      .select()
      .single();

    if (errUpdate || !entidadActualizada) {
      throw new Error(
        `Error al actualizar el estado financiero: ${errUpdate?.message}`,
      );
    }

    // 3. REGISTRAR TRANSACCIÓN EN EL HISTORIAL DE CAJA/AUDITORÍA
    // Esto asegura que el dinero quede registrado bajo el usuario del administrador responsable
    const { error: errAuditoria } = await supabase
      .from("logs_auditoria")
      .insert([
        {
          usuario_id_admin: datos.usuarioAdminId,
          accion: `PAGO_MANUAL_${datos.entidadTipo.toUpperCase()}`,
          entidad_afectada: `${tabla}_id: ${datos.entidadId}`,
          detalles: {
            monto: datos.monto,
            metodo_pago: datos.metodoPago,
            fecha_pago: new Date().toISOString(),
            observaciones:
              "Aprobación manual mediante checkbox del panel administrativo CRM.",
          },
        },
      ]);

    if (errAuditoria) {
      console.error(
        "❌ Alerta de Auditoría: Pago procesado pero no se pudo registrar el log:",
        errAuditoria.message,
      );
    }

    return entidadActualizada;
  }
}
