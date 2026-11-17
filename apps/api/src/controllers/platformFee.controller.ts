import { Request, Response } from "express";
import { PlatformFeeService } from "../services/platformFee.service";
import { acreditarSaldoTorneoMercadoPago } from "../services/platformFeeWebhook.service";
import { verifyMercadoPagoWebhookSignature } from "../config/mercadopago";
import { supabaseAdmin } from "../config/supabase";
import type {
  PlatformFeeCanal,
  PlatformFeeOrgRef,
  PlatformFeeModo,
  PlatformFeeTipo,
} from "../constants/platformFee";

async function orgDesdeUsuario(req: Request): Promise<PlatformFeeOrgRef | null> {
  const userId = req.user?.id;
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from("perfiles")
    .select("club_id, asociacion_id")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  if (data.club_id) {
    return { org_tipo: "club", org_id: data.club_id };
  }
  if (data.asociacion_id) {
    return { org_tipo: "asociacion", org_id: data.asociacion_id };
  }
  if (req.user?.rol === "admin_federacion") {
    const { data: fed } = await supabaseAdmin
      .from("federaciones")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (fed?.id) return { org_tipo: "federacion", org_id: fed.id };
  }
  return null;
}

export const PlatformFeeController = {
  async listarCanales(_req: Request, res: Response) {
    try {
      const data = await PlatformFeeService.listarCanales();
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async actualizarCanal(req: Request, res: Response) {
    try {
      const canal = req.params.canal as PlatformFeeCanal;
      const { tipo, valor, activo } = req.body as {
        tipo: PlatformFeeTipo;
        valor: number;
        activo: boolean;
      };
      const data = await PlatformFeeService.actualizarCanal(canal, {
        tipo,
        valor: Number(valor),
        activo: Boolean(activo),
      });
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async obtenerPreferenciasOrg(req: Request, res: Response) {
    try {
      const orgQuery = req.query as {
        org_tipo?: string;
        org_id?: string;
      };
      let org: PlatformFeeOrgRef | null = null;
      if (orgQuery.org_tipo && orgQuery.org_id) {
        org = {
          org_tipo: orgQuery.org_tipo as PlatformFeeOrgRef["org_tipo"],
          org_id: orgQuery.org_id,
        };
      } else {
        org = await orgDesdeUsuario(req);
      }
      if (!org) {
        return res.status(400).json({
          exito: false,
          error: "No se pudo resolver la organización del usuario.",
        });
      }
      const data = await PlatformFeeService.obtenerPreferenciasOrg(org);
      return res.json({ exito: true, data, org });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async guardarPreferenciasOrg(req: Request, res: Response) {
    try {
      const bodyOrg = req.body.org as PlatformFeeOrgRef | undefined;
      const org = bodyOrg ?? (await orgDesdeUsuario(req));
      if (!org) {
        return res.status(400).json({
          exito: false,
          error: "No se pudo resolver la organización.",
        });
      }
      const preferencias = (req.body.preferencias || []) as Array<{
        canal: PlatformFeeCanal;
        modo: PlatformFeeModo;
      }>;
      const data = await PlatformFeeService.guardarPreferenciasOrg(
        org,
        preferencias,
      );
      return res.json({ exito: true, data, org });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async saldoTorneo(req: Request, res: Response) {
    try {
      const { torneoId } = req.params;
      const data = await PlatformFeeService.obtenerSaldoTorneo(torneoId);
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async preferenciaSaldoTorneo(req: Request, res: Response) {
    try {
      const { torneoId } = req.params;
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ exito: false, error: "No autenticado." });
      }
      const data = await PlatformFeeService.crearPreferenciaSaldoTorneo(
        torneoId,
        usuarioId,
        { mobile: req.body?.mobile === true },
      );
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async reporteMensual(req: Request, res: Response) {
    try {
      const anio = Number(req.query.anio || new Date().getFullYear());
      const mes = Number(req.query.mes || new Date().getMonth() + 1);
      const data = await PlatformFeeService.reporteMensual(anio, mes);
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async resumenLiquidaciones(_req: Request, res: Response) {
    try {
      const data = await PlatformFeeService.resumenLiquidacionesOrganizadores();
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async historialLiquidaciones(_req: Request, res: Response) {
    try {
      const data = await PlatformFeeService.historialLiquidaciones();
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async liquidacionesPendientes(_req: Request, res: Response) {
    try {
      const data = await PlatformFeeService.listarLiquidacionesPendientes();
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async marcarLiquidacion(req: Request, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({ exito: false, error: "No autenticado." });
      }
      const {
        org,
        periodo_mes,
        monto_neto,
        monto_bruto,
        monto_fees,
        cbu,
        alias_cuenta,
        notas,
      } = req.body;
      const data = await PlatformFeeService.marcarLiquidacionTransferida({
        org,
        periodoMes: periodo_mes,
        montoNeto: Number(monto_neto),
        montoBruto: Number(monto_bruto),
        montoFees: Number(monto_fees),
        cbu,
        aliasCuenta: alias_cuenta,
        adminId,
        notas,
      });
      return res.json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async webhookMercadoPago(req: Request, res: Response) {
    try {
      if (!verifyMercadoPagoWebhookSignature(req)) {
        return res.status(401).json({ exito: false, error: "Firma inválida." });
      }
      const body = req.body as {
        type?: string;
        data?: { id?: string };
        action?: string;
      };
      if (body.type !== "payment" && body.action !== "payment.created") {
        return res.status(200).json({ exito: true, ignored: true });
      }
      const paymentId = body.data?.id;
      if (!paymentId) {
        return res.status(200).json({ exito: true, ignored: true });
      }
      await acreditarSaldoTorneoMercadoPago(String(paymentId));
      return res.status(200).json({ exito: true });
    } catch (error: unknown) {
      console.error("Webhook MP saldo torneo:", error);
      return res.status(200).json({ exito: true });
    }
  },
};