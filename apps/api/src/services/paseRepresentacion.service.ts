import { supabaseAdmin } from "../config/supabase";
import { AFILIACION_ESTADOS } from "../constants/afiliacion";
import { validarPase } from "../utils/pasesRepresentacion";
import { NotificacionService } from "./notificacion.service";

function fechaVencimientoDefault(meses = 12): string {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().split("T")[0];
}

const SELECT_PASE = `
  id, usuario_id, asociacion_origen_id, asociacion_destino_id, estado, motivo,
  resuelto_por, created_at, resuelto_at,
  origen:asociaciones!pases_representacion_asociacion_origen_id_fkey(id, nombre, provincia),
  destino:asociaciones!pases_representacion_asociacion_destino_id_fkey(id, nombre, provincia),
  perfiles!pases_representacion_usuario_id_fkey(id, nombre, apellido, email, dni)
`;

export class PaseRepresentacionService {
  static async solicitar(usuarioId: string, destinoId: string, motivo: string) {
    const { data: origenes, error: origenError } = await supabaseAdmin
      .from("afiliaciones")
      .select("asociacion_id")
      .eq("usuario_id", usuarioId)
      .eq("estado", AFILIACION_ESTADOS.ACTIVO)
      .not("asociacion_id", "is", null);

    if (origenError) throw new Error(origenError.message);

    const origenId = origenes?.find((row) => row.asociacion_id)?.asociacion_id ?? null;
    const errorValidacion = validarPase({ origenId, destinoId, motivo });
    if (errorValidacion) throw new Error(errorValidacion);

    const { data: destino, error: destinoError } = await supabaseAdmin
      .from("asociaciones")
      .select("id, nombre")
      .eq("id", destinoId)
      .maybeSingle();

    if (destinoError) throw new Error(destinoError.message);
    if (!destino) throw new Error("La asociación de destino no existe.");

    const { data: pendiente } = await supabaseAdmin
      .from("pases_representacion")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("estado", "pendiente")
      .maybeSingle();

    if (pendiente) {
      throw new Error("Ya tenés un pase pendiente. Cancelalo o esperá la resolución.");
    }

    const { data, error } = await supabaseAdmin
      .from("pases_representacion")
      .insert({
        usuario_id: usuarioId,
        asociacion_origen_id: origenId,
        asociacion_destino_id: destinoId,
        motivo: motivo.trim(),
        estado: "pendiente",
      })
      .select(SELECT_PASE)
      .single();

    if (error) throw new Error(error.message);

    NotificacionService.notificarAdmins({
      titulo: "Nuevo pase de provincia",
      mensaje: `Un jugador pidió pasar a ${destino.nombre}.`,
      tipo: "info",
    }).catch((err) => console.error("Error al notificar el pase:", err));

    return data;
  }

  static async listarMios(usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("pases_representacion")
      .select(SELECT_PASE)
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async listarPendientes() {
    const { data, error } = await supabaseAdmin
      .from("pases_representacion")
      .select(SELECT_PASE)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async cancelar(usuarioId: string, paseId: string) {
    const { data, error } = await supabaseAdmin
      .from("pases_representacion")
      .update({ estado: "cancelado", resuelto_at: new Date().toISOString() })
      .eq("id", paseId)
      .eq("usuario_id", usuarioId)
      .eq("estado", "pendiente")
      .select(SELECT_PASE)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("No hay un pase pendiente para cancelar.");
    return data;
  }

  static async resolver(
    adminId: string,
    paseId: string,
    estado: "aprobado" | "rechazado",
  ) {
    const { data: pase, error } = await supabaseAdmin
      .from("pases_representacion")
      .select("id, usuario_id, asociacion_origen_id, asociacion_destino_id, estado")
      .eq("id", paseId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!pase) throw new Error("El pase no existe.");
    if (pase.estado !== "pendiente") throw new Error("Ese pase ya fue resuelto.");

    const { data: destino, error: destinoError } = await supabaseAdmin
      .from("asociaciones")
      .select("id, nombre")
      .eq("id", pase.asociacion_destino_id)
      .single();

    if (destinoError || !destino) throw new Error("La asociación de destino no existe.");

    if (estado === "aprobado") {
      const { data: vigentes, error: vigentesError } = await supabaseAdmin
        .from("afiliaciones")
        .select("id")
        .eq("usuario_id", pase.usuario_id)
        .eq("asociacion_id", pase.asociacion_origen_id)
        .eq("estado", AFILIACION_ESTADOS.ACTIVO);

      if (vigentesError) throw new Error(vigentesError.message);

      if (vigentes && vigentes.length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("afiliaciones")
          .update({
            asociacion_id: destino.id,
            entidad: destino.nombre,
          })
          .in(
            "id",
            vigentes.map((row) => row.id),
          );
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabaseAdmin.from("afiliaciones").insert({
          usuario_id: pase.usuario_id,
          entidad: destino.nombre,
          estado: AFILIACION_ESTADOS.ACTIVO,
          fecha_vencimiento: fechaVencimientoDefault(),
          asociacion_id: destino.id,
        });
        if (insertError) throw new Error(insertError.message);
      }
    }

    const { data, error: resolveError } = await supabaseAdmin
      .from("pases_representacion")
      .update({
        estado,
        resuelto_por: adminId,
        resuelto_at: new Date().toISOString(),
      })
      .eq("id", paseId)
      .select(SELECT_PASE)
      .single();

    if (resolveError) throw new Error(resolveError.message);

    await NotificacionService.crearNotificacion({
      usuario_id: pase.usuario_id,
      titulo: estado === "aprobado" ? "Pase aprobado" : "Pase rechazado",
      mensaje:
        estado === "aprobado"
          ? `Tu representación provincial pasó a ${destino.nombre}.`
          : `Tu pedido de pase a ${destino.nombre} fue rechazado.`,
      tipo: estado === "aprobado" ? "success" : "error",
    });

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: estado === "aprobado" ? "PASE_APROBADO" : "PASE_RECHAZADO",
      entidad_afectada: `pases_representacion_id: ${paseId}`,
      detalles: {
        usuario_id: pase.usuario_id,
        asociacion_origen_id: pase.asociacion_origen_id,
        asociacion_destino_id: pase.asociacion_destino_id,
      },
    });

    return data;
  }
}
