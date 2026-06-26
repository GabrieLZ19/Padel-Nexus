import { api } from "../api";

export const PagosService = {
  async confirmarPagoManual(data: {
    entidad_tipo: "inscripcion" | "licencia";
    entidad_id: string;
    monto: number;
    metodo_pago: string;
  }) {
    const response = await api.patch("/pagos/confirmar-manual", data);
    return response.data;
  },
};
