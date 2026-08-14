import { api } from "@/utils/api";

export interface CrmMetricas {
  federaciones: number;
  asociaciones: number;
  clubes: number;
  jugadores: number;
  torneos_activos: number;
  torneos_finalizados: number;
  torneos_borrador: number;
  inscripciones_total: number;
  inscripciones_pagadas: number;
  inscripciones_pendientes: number;
  reservas_mes: number;
  ventas_marketplace: number;
  ventas_marketplace_count: number;
  ingresos_netos: number;
  ingresos_pendientes: number;
}

export const CrmDashboardService = {
  getMetricas: async (): Promise<CrmMetricas | null> => {
    try {
      const res = await api.get("/admin/crm-metricas");
      return res.data?.data || null;
    } catch (error) {
      console.warn("Error al obtener métricas del CRM:", error);
      return null;
    }
  },
};
