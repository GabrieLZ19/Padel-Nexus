import { supabaseAdmin } from "../config/supabase";
import {
  AFILIACION_ESTADOS,
  AFILIACION_ESTADOS_BLOQUEANTES,
} from "../constants/afiliacion";
import { NotificacionService } from "./notificacion.service";

function fechaVencimientoDefault(meses = 12): string {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().split("T")[0];
}

export class AfiliacionService {
  /** Crea o reactiva afiliación activa con FKs (usado también al aprobar licencia FAP). */
  static async upsertActivaPorClub(params: {
    usuarioId: string;
    clubId: string;
    fechaVencimiento?: string | null;
  }) {
    const { usuarioId, clubId } = params;
    const fechaVencimiento =
      params.fechaVencimiento || fechaVencimientoDefault();

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubes")
      .select("id, nombre, asociacion_id")
      .eq("id", clubId)
      .single();

    if (clubError || !club) {
      throw new Error("Club no encontrado para afiliar.");
    }

    const { data: existentes } = await supabaseAdmin
      .from("afiliaciones")
      .select("id, estado")
      .eq("usuario_id", usuarioId)
      .eq("club_id", clubId);

    const payload = {
      entidad: club.nombre,
      estado: AFILIACION_ESTADOS.ACTIVO,
      fecha_vencimiento: fechaVencimiento,
      club_id: club.id,
      asociacion_id: club.asociacion_id || null,
    };

    if (existentes && existentes.length > 0) {
      const principal = existentes[0];
      const { data, error } = await supabaseAdmin
        .from("afiliaciones")
        .update(payload)
        .eq("id", principal.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      if (existentes.length > 1) {
        await supabaseAdmin
          .from("afiliaciones")
          .delete()
          .in(
            "id",
            existentes.slice(1).map((a) => a.id),
          );
      }

      await AfiliacionService.syncClubPrincipalSiVacio(usuarioId, club.id);
      return data;
    }

    // Compat: filas legacy solo por nombre de entidad
    const { data: porNombre } = await supabaseAdmin
      .from("afiliaciones")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("entidad", club.nombre)
      .is("club_id", null)
      .limit(1);

    if (porNombre && porNombre.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("afiliaciones")
        .update(payload)
        .eq("id", porNombre[0].id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await AfiliacionService.syncClubPrincipalSiVacio(usuarioId, club.id);
      return data;
    }

    const { data, error } = await supabaseAdmin
      .from("afiliaciones")
      .insert([{ usuario_id: usuarioId, ...payload }])
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    await AfiliacionService.syncClubPrincipalSiVacio(usuarioId, club.id);
    return data;
  }

  static async syncClubPrincipalSiVacio(
    usuarioId: string,
    clubId: string,
  ): Promise<void> {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("club_id")
      .eq("id", usuarioId)
      .single();

    if (perfil && !perfil.club_id) {
      await supabaseAdmin
        .from("perfiles")
        .update({ club_id: clubId })
        .eq("id", usuarioId);
    }
  }

  static async solicitar(usuarioId: string, clubId: string) {
    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubes")
      .select("id, nombre, asociacion_id, estado")
      .eq("id", clubId)
      .single();

    if (clubError || !club) {
      throw new Error("El club seleccionado no existe.");
    }

    const { data: conflicto } = await supabaseAdmin
      .from("afiliaciones")
      .select("id, estado")
      .eq("usuario_id", usuarioId)
      .eq("club_id", clubId)
      .in("estado", [...AFILIACION_ESTADOS_BLOQUEANTES])
      .maybeSingle();

    if (conflicto) {
      throw new Error(
        conflicto.estado === AFILIACION_ESTADOS.PENDIENTE
          ? "Ya tenés una solicitud pendiente para este club."
          : "Ya estás afiliado a este club.",
      );
    }

    // También bloquear legacy por nombre
    const { data: legacy } = await supabaseAdmin
      .from("afiliaciones")
      .select("id, estado")
      .eq("usuario_id", usuarioId)
      .eq("entidad", club.nombre)
      .in("estado", [...AFILIACION_ESTADOS_BLOQUEANTES])
      .maybeSingle();

    if (legacy) {
      throw new Error("Ya tenés una afiliación activa o pendiente a este club.");
    }

    const { data, error } = await supabaseAdmin
      .from("afiliaciones")
      .insert([
        {
          usuario_id: usuarioId,
          entidad: club.nombre,
          estado: AFILIACION_ESTADOS.PENDIENTE,
          fecha_vencimiento: fechaVencimientoDefault(),
          club_id: club.id,
          asociacion_id: club.asociacion_id || null,
        },
      ])
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    NotificacionService.notificarAdmins({
      titulo: "Nueva solicitud de afiliación",
      mensaje: `Un jugador solicitó afiliarse a ${club.nombre}.`,
      tipo: "info",
    }).catch((err) =>
      console.error("Error al notificar admins de afiliación:", err),
    );

    return data;
  }

  static async listarMias(usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("afiliaciones")
      .select(
        "*, clubes:club_id(id, nombre, provincia, localidad), asociaciones:asociacion_id(id, nombre, sigla)",
      )
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async cancelar(usuarioId: string, afiliacionId: string) {
    const { data: afil, error } = await supabaseAdmin
      .from("afiliaciones")
      .select("*")
      .eq("id", afiliacionId)
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !afil) {
      throw new Error("Afiliación no encontrada.");
    }

    const estado = (afil.estado || "").toLowerCase();

    if (estado === AFILIACION_ESTADOS.PENDIENTE) {
      const { error: delError } = await supabaseAdmin
        .from("afiliaciones")
        .delete()
        .eq("id", afiliacionId);
      if (delError) throw new Error(delError.message);
      return { id: afiliacionId, eliminada: true };
    }

    if (estado === AFILIACION_ESTADOS.ACTIVO) {
      const { data, error: upError } = await supabaseAdmin
        .from("afiliaciones")
        .update({ estado: AFILIACION_ESTADOS.BAJA })
        .eq("id", afiliacionId)
        .select("*")
        .single();
      if (upError) throw new Error(upError.message);
      return data;
    }

    throw new Error("Solo podés cancelar solicitudes pendientes o dar de baja afiliaciones activas.");
  }

  static async listarAdmin(options: {
    page?: number;
    limit?: number;
    estado?: string;
    search?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("afiliaciones")
      .select(
        `*, perfiles:usuario_id(id, nombre, apellido, email, dni), clubes:club_id(id, nombre, provincia)`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (options.estado) {
      query = query.eq("estado", options.estado);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    let rows = data || [];
    if (options.search?.trim()) {
      const term = options.search.trim().toLowerCase();
      rows = rows.filter((row) => {
        const p = row.perfiles as {
          nombre?: string;
          apellido?: string;
          email?: string;
          dni?: string;
        } | null;
        const haystack = [
          row.entidad,
          p?.nombre,
          p?.apellido,
          p?.email,
          p?.dni,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    return { data: rows, total: count || 0 };
  }

  static async cambiarEstado(
    afiliacionId: string,
    nuevoEstado: string,
    adminId: string,
  ) {
    const estado = nuevoEstado.toLowerCase();
    if (
      !(
        [
          AFILIACION_ESTADOS.ACTIVO,
          AFILIACION_ESTADOS.RECHAZADO,
          AFILIACION_ESTADOS.BAJA,
          AFILIACION_ESTADOS.SUSPENDIDO,
        ] as string[]
      ).includes(estado)
    ) {
      throw new Error("Estado de afiliación no válido.");
    }

    const { data: afil, error } = await supabaseAdmin
      .from("afiliaciones")
      .select("*")
      .eq("id", afiliacionId)
      .single();

    if (error || !afil) throw new Error("Afiliación no encontrada.");

    if (estado === AFILIACION_ESTADOS.ACTIVO) {
      if (!afil.club_id) {
        throw new Error(
          "No se puede aprobar una afiliación sin club_id. Pedile al jugador que vuelva a solicitar.",
        );
      }
      const data = await AfiliacionService.upsertActivaPorClub({
        usuarioId: afil.usuario_id,
        clubId: afil.club_id,
        fechaVencimiento: afil.fecha_vencimiento,
      });

      await NotificacionService.crearNotificacion({
        usuario_id: afil.usuario_id,
        titulo: "Afiliación aprobada",
        mensaje: `Tu solicitud de afiliación a ${afil.entidad} fue aprobada.`,
        tipo: "success",
      });

      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: adminId,
        accion: "AFILIACION_APROBADA",
        entidad_afectada: `afiliaciones_id: ${afiliacionId}`,
        detalles: { club_id: afil.club_id, entidad: afil.entidad },
      });

      return data;
    }

    const { data, error: upError } = await supabaseAdmin
      .from("afiliaciones")
      .update({ estado })
      .eq("id", afiliacionId)
      .select("*")
      .single();

    if (upError) throw new Error(upError.message);

    if (estado === AFILIACION_ESTADOS.RECHAZADO) {
      await NotificacionService.crearNotificacion({
        usuario_id: afil.usuario_id,
        titulo: "Afiliación rechazada",
        mensaje: `Tu solicitud de afiliación a ${afil.entidad} fue rechazada.`,
        tipo: "error",
      });
    }

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: `AFILIACION_${estado.toUpperCase()}`,
      entidad_afectada: `afiliaciones_id: ${afiliacionId}`,
      detalles: { estado },
    });

    return data;
  }
}
