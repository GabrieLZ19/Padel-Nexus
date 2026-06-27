import { supabaseAdmin } from "../config/supabase";
import { NotificacionService } from "./notificacion.service";

export class LicenciaService {
  static async obtenerLicencias(page: number, limit: number, search?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("perfiles")
      .select(
        "*, licencias:licencias!fk_licencias_usuario!inner(*), afiliaciones:afiliaciones!fk_afiliaciones_usuario(id, entidad, estado, fecha_vencimiento)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (search) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `nombre.ilike.${term},apellido.ilike.${term},email.ilike.${term},licencias.nro_licencia.ilike.${term}`,
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) {
      console.error("🔴 Error al obtener licencias por perfil:", error);
      throw new Error("Error al listar licencias");
    }
    return { data: data || [], total: count || 0 };
  }

  static async obtenerPorUsuario(usuario_id: string) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("usuario_id", usuario_id)
      .single();

    if (error || !data)
      throw new Error("Licencia no encontrada para este usuario.");
    return data;
  }

  static async crearLicencia(
    usuario_id: string,
    nro_licencia: string,
    estado: string,
  ) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .insert([
        {
          usuario_id,
          nro_licencia,
          estado,
          fecha_emision: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async renovar(id: string) {
    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);

    const { data, error } = await supabaseAdmin
      .from("licencias")
      .update({
        fecha_vencimiento: vencimiento.toISOString(),
        estado: "Activa",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async verificar(usuario_id: string) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select(
        "estado, nro_licencia, fecha_vencimiento, perfiles(nombre, apellido)",
      )
      .eq("usuario_id", usuario_id)
      .single();

    if (error || !data) throw new Error("Licencia no encontrada");

    // Lógica dinámica de vencimiento
    if (
      new Date(data.fecha_vencimiento) < new Date() &&
      data.estado === "Activa"
    ) {
      data.estado = "Vencida";
    }
    return data;
  }

  static async actualizarEstado(id: string, estado: string, fechaVencimientoOverride?: string) {
    // 1. Obtener la licencia actual para saber el estado previo y usuario
    const { data: licenciaPrevia, error: readError } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", id)
      .single();

    if (readError || !licenciaPrevia) {
      throw new Error("No se encontró la licencia para actualizar o el estado es inválido.");
    }

    const estadoPrevio = licenciaPrevia.estado;
    const usuario_id = licenciaPrevia.usuario_id;
    let data = { ...licenciaPrevia, estado };

    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);
    const fechaVencimiento = fechaVencimientoOverride || vencimiento.toISOString().split("T")[0];

    // 2. Si es Rechazo (de Pendiente a Suspendida)
    if (estado === "Suspendida" && estadoPrevio === "Pendiente") {
      // Notificar al usuario sobre el rechazo
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Solicitud de Alta Rechazada",
        mensaje: "Tu solicitud de alta para la licencia deportiva fue rechazada. Puedes volver a iniciar el trámite desde tu perfil.",
        tipo: "error"
      });

      // Eliminar inmediatamente la fila de la base de datos
      const { error: deleteError } = await supabaseAdmin
        .from("licencias")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("🔴 Error al eliminar licencia rechazada:", deleteError);
        throw new Error("Error al eliminar la licencia rechazada.");
      }

      return data;
    }

    // 3. Si no es rechazo, actualizamos normalmente
    const updateData: Record<string, any> = { estado };

    if (estado === "Activa" && estadoPrevio !== "Activa") {
      // Activación real: registrar la fecha de emisión y calcular vencimiento
      updateData.fecha_emision = new Date().toISOString().split("T")[0];
      updateData.fecha_vencimiento = fechaVencimientoOverride || fechaVencimiento;
    } else if (fechaVencimientoOverride) {
      // Solo cambio de fecha (sin cambio de estado, o ya estaba Activa)
      updateData.fecha_vencimiento = fechaVencimientoOverride;
    } else if (estado === "Activa" && estadoPrevio === "Activa") {
      // Mismo estado, sin override de fecha → no tocar fechas
    }

    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from("licencias")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedData) {
      throw new Error("Error al actualizar el estado de la licencia.");
    }

    data = updatedData;

    // Helper para formatear fechas sin timezone shift
    const formatFecha = (iso?: string | null) => {
      if (!iso) return "";
      const [year, month, day] = iso.split("T")[0].split("-");
      return `${day}/${month}/${year}`;
    };

    // 4. Emitir notificaciones para otros cambios de estado
    if (estado === "Activa" && estadoPrevio !== "Activa") {
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Licencia Aprobada",
        mensaje: `¡Felicidades! Tu licencia N° ${data.nro_licencia} fue aprobada. Vence el ${formatFecha(data.fecha_vencimiento)}. Ya podés ver tu carnet digital.`,
        tipo: "success",
        metadata: { nro_licencia: data.nro_licencia, licencia_id: data.id },
      });
    } else if (estado === "Suspendida" && estadoPrevio === "Activa") {
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Licencia Suspendida",
        mensaje: `Tu licencia N° ${data.nro_licencia} fue suspendida administrativamente. Contactá a tu federación para más información.`,
        tipo: "error",
        metadata: { nro_licencia: data.nro_licencia, licencia_id: data.id },
      });
    }

    // 5. Si se activa o se suspende, actualizamos la afiliación correspondiente
    if (data.datos_solicitud) {
      const datosSol = data.datos_solicitud as Record<string, any>;
      if (datosSol.club_id) {
        try {
          // Buscamos el nombre del club
          const { data: club } = await supabaseAdmin
            .from("clubes")
            .select("nombre")
            .eq("id", datosSol.club_id)
            .single();

          const clubNombre = club?.nombre || `Club ID: ${datosSol.club_id}`;

          // Verificamos todas las afiliaciones existentes para este usuario con la misma entidad
          const { data: afiliacionesExistentes } = await supabaseAdmin
            .from("afiliaciones")
            .select("id")
            .eq("usuario_id", data.usuario_id)
            .eq("entidad", clubNombre);

          const tieneAfiliaciones = afiliacionesExistentes && afiliacionesExistentes.length > 0;

          if (estado === "Activa") {
            if (tieneAfiliaciones) {
              // Si ya existe, actualizamos su fecha de vencimiento y estado a activo
              await supabaseAdmin
                .from("afiliaciones")
                .update({
                  fecha_vencimiento: data.fecha_vencimiento || fechaVencimiento,
                  estado: "activo",
                })
                .eq("id", afiliacionesExistentes[0].id);

              // Si hay registros duplicados, los eliminamos
              if (afiliacionesExistentes.length > 1) {
                const idsToDelete = afiliacionesExistentes.slice(1).map(a => a.id);
                await supabaseAdmin
                  .from("afiliaciones")
                  .delete()
                  .in("id", idsToDelete);
              }
            } else {
              // Si no existe, creamos la afiliación activa
              await supabaseAdmin.from("afiliaciones").insert([
                {
                  usuario_id: data.usuario_id,
                  entidad: clubNombre,
                  estado: "activo",
                  fecha_vencimiento: data.fecha_vencimiento || fechaVencimiento,
                },
              ]);
            }
          } else if (estado === "Suspendida") {
            if (tieneAfiliaciones) {
              // Si existe, cambiamos el estado de la afiliación a suspendido
              await supabaseAdmin
                .from("afiliaciones")
                .update({
                  estado: "suspendido",
                })
                .eq("id", afiliacionesExistentes[0].id);

              // Si hay registros duplicados, los eliminamos
              if (afiliacionesExistentes.length > 1) {
                const idsToDelete = afiliacionesExistentes.slice(1).map(a => a.id);
                await supabaseAdmin
                  .from("afiliaciones")
                  .delete()
                  .in("id", idsToDelete);
              }
            }
          }
        } catch (err) {
          console.error("Error al registrar/actualizar afiliación en cambio de estado:", err);
        }
      }
    }

    return data;
  }

  static async solicitar(usuario_id: string, datos: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .insert([
        {
          usuario_id,
          estado: "Pendiente",
          nro_licencia: `PAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          datos_solicitud: datos,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
