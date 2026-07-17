import React, { useState } from "react";
import {
  CheckCircle2,
  Download,
  Upload,
  Plus,
  Users,
  User,
  Trash2,
} from "lucide-react";
import { Torneo, Inscripcion } from "@/utils/types";
import { InscripcionesService } from "@/utils/services/inscripciones";
import { PagosService } from "@/utils/services/pagos";
import ConfirmarPagoModal from "@/components/inscripciones/ConfirmarPagoModal";
import InscripcionManualModal from "@/components/inscripciones/InscripcionManualModal";

interface Paso4JugadoresProps {
  torneo: Torneo;
  torneoId: string;
  inscripciones: Inscripcion[];
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
}

const cleanName = (name?: string | null) => {
  if (!name) return "Desconocido";
  let cleaned = name
    .trim()
    .replace(/^[\s,]+/, "")
    .replace(/[\s,]+$/, "");
  if (cleaned === "," || cleaned === "") return "Desconocido";
  return cleaned;
};

export const Paso4Jugadores = ({
  torneo,
  torneoId,
  inscripciones,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
}: Paso4JugadoresProps) => {
  const [importingCSV, setImportingCSV] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [pagoModal, setPagoModal] = useState({
    isOpen: false,
    inscripcionId: "",
    montoDefecto: 0,
    isLoading: false,
  });

  const confirmadasCount = inscripciones.filter(
    (i) => i.estado_pago === "Confirmado",
  ).length;

  const handleDescargarPlantilla = () => {
    const isIndiv = torneo.modalidad === "Individual";
    const headers = isIndiv
      ? [
          "Jugador (DNI o Email)",
          "Metodo de Pago (Efectivo / Transferencia / Dejar vacio)",
        ]
      : [
          "Jugador 1 (DNI o Email)",
          "Jugador 2 (DNI o Email)",
          "Metodo de Pago",
        ];

    const exampleRows = isIndiv
      ? [
          ["jugador@email.com", "Efectivo"],
          ["40123456", "Transferencia"],
        ]
      : [
          ["j1@email.com", "j2@email.com", "Efectivo"],
          ["40123456", "41765432", "Transferencia"],
        ];

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...exampleRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `plantilla_inscripcion_${torneo.modalidad.toLowerCase()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubirCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // La lógica de procesado del CSV se mantiene idéntica a tu código original
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length <= 1) {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "error",
          title: "Archivo vacío",
          description: "El archivo no contiene filas válidas.",
        }));
        return;
      }

      setImportingCSV(true);
      let successCount = 0;
      let errors: string[] = [];
      const dataRows = lines.slice(1);
      const isIndiv = torneo.modalidad === "Individual";

      for (let i = 0; i < dataRows.length; i++) {
        const parts = dataRows[i]
          .split(dataRows[i].includes(";") ? ";" : ",")
          .map((p) => p.trim().replace(/^["']|["']$/g, ""));

        try {
          if (isIndiv) {
            if (!parts[0]) continue;
            await InscripcionesService.inscribirManual({
              torneo_id: torneo.id,
              jugador1_identificador: parts[0],
              monto: Number(torneo.precio_inscripcion || 0),
              metodo_pago: parts[1] || undefined,
            });
          } else {
            if (!parts[0]) continue;
            let [j1, j2, metodo] = parts;
            if (
              parts.length === 2 &&
              j2 &&
              [
                "efectivo",
                "transferencia",
                "mercado_pago",
                "mercadopago",
              ].includes(j2.toLowerCase())
            ) {
              metodo = j2;
              j2 = "";
            }
            await InscripcionesService.inscribirManual({
              torneo_id: torneo.id,
              jugador1_identificador: j1,
              jugador2_identificador: j2 || undefined,
              monto: Number(torneo.precio_inscripcion || 0),
              metodo_pago: metodo || undefined,
            });
          }
          successCount++;
        } catch (err: any) {
          errors.push(
            `Fila ${i + 2}: ${err.response?.data?.error || err.message}`,
          );
        }
      }

      setImportingCSV(false);
      triggerRefresh();

      if (errors.length === 0) {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "success",
          title: "Completado",
          description: `Se inscribieron ${successCount} correctamente.`,
        }));
      } else {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "warning",
          title: "Con Advertencias",
          description: `Éxitos: ${successCount}. Fallos:\n${errors.slice(0, 5).join("\n")}`,
        }));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleEliminarInscripcion = (inscripcionId: string | number) => {
    setFeedbackModal((prev: any) => ({
      ...prev,
      isOpen: true,
      type: "danger",
      title: "¿Eliminar inscripción?",
      description: "Esta acción liberará los cupos del torneo. ¿Estás seguro?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          await InscripcionesService.eliminar(inscripcionId);
          triggerRefresh();
          setFeedbackModal((prevModal: any) => ({
            ...prevModal,
            isOpen: true,
            type: "success",
            title: "Eliminada",
            description: "Cupo liberado.",
          }));
        } catch (error: any) {
          setFeedbackModal((prevModal: any) => ({
            ...prevModal,
            isOpen: true,
            type: "error",
            title: "Error",
            description: error.message,
          }));
        }
      },
    }));
  };

  return (
    <div className="bg-[#111111] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
      {/* Cabecera y botones de acción */}
      <div className="p-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-black/20">
        <h3 className="font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="size-5 text-[#00ff88]" />
          Inscripciones ({confirmadasCount} confirmadas de{" "}
          {torneo.cupos_maximos || 16})
        </h3>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleDescargarPlantilla}
            className="flex-1 lg:flex-none justify-center flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/10"
          >
            <Download className="size-3.5" /> Plantilla
          </button>
          <div className="relative flex-1 lg:flex-none">
            <input
              type="file"
              accept=".csv"
              onChange={handleSubirCSV}
              disabled={importingCSV}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              disabled={importingCSV}
              className="w-full flex justify-center items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/10 disabled:opacity-50"
            >
              <Upload className="size-3.5" />{" "}
              {importingCSV ? "Importando..." : "Subir CSV"}
            </button>
          </div>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="w-full lg:w-auto flex justify-center items-center gap-1.5 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-black px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
          >
            <Plus className="size-3.5" /> Nueva Inscripción
          </button>
        </div>
      </div>

      {/* Tabla de Inscritos */}
      {inscripciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
          <Users className="size-12 text-gray-700 mb-3" />
          <p className="font-bold text-sm">No hay inscripciones registradas.</p>
        </div>
      ) : (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase font-black tracking-wider">
                <th className="px-8 py-4 text-center w-16">PAGO</th>
                <th className="px-8 py-4">ID</th>
                <th className="px-6 py-4">PAREJA / JUGADOR</th>
                <th className="px-6 py-4 text-center">ESTADO</th>
                <th className="px-8 py-4 text-right">MONTO</th>
                <th className="px-8 py-4 text-center w-24">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inscripciones.map((ins) => {
                const isConfirmed = ins.estado_pago === "Confirmado";
                return (
                  <tr
                    key={ins.id}
                    className={`hover:bg-white/2 transition-colors ${isConfirmed ? "bg-green-500/2" : ""}`}
                  >
                    <td className="px-8 py-5 text-center">
                      <input
                        type="checkbox"
                        checked={isConfirmed}
                        disabled={isConfirmed}
                        onChange={() => {
                          if (!isConfirmed) {
                            setPagoModal({
                              isOpen: true,
                              inscripcionId: String(ins.id),
                              montoDefecto: Number(
                                ins.monto || torneo.precio_inscripcion || 0,
                              ),
                              isLoading: false,
                            });
                          }
                        }}
                        className="size-4 rounded border-white/10 text-brand-chartreuse cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-8 py-5 font-mono text-gray-500 text-sm">
                      {String(ins.id).slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-chartreuse/10 flex items-center justify-center shrink-0">
                          <User className="size-4 text-brand-chartreuse" />
                        </div>
                        <div>
                          {cleanName(ins.jugador1_nombre)}
                          {ins.jugador2_nombre &&
                            ins.jugador2_nombre !== "-" && (
                              <span className="text-gray-400 font-medium">
                                {" "}
                                / {cleanName(ins.jugador2_nombre)}
                              </span>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${isConfirmed ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}
                      >
                        {ins.estado_pago || "Pendiente"}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-semibold text-sm">
                      ${Number(ins.monto || 0).toLocaleString("es-AR")}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button
                        onClick={() => handleEliminarInscripcion(ins.id)}
                        className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between p-6 bg-black/10 border-t border-white/5">
        <button
          onClick={() => setActiveTab("categories")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <button
          onClick={() => setActiveTab("times")}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Siguiente Paso: Sedes
        </button>
      </div>

      <ConfirmarPagoModal
        isOpen={pagoModal.isOpen}
        montoSugerido={pagoModal.montoDefecto}
        isLoading={pagoModal.isLoading}
        onClose={() => setPagoModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async (monto: number, metodo: string) => {
          setPagoModal((prev) => ({ ...prev, isLoading: true }));
          try {
            await PagosService.confirmarPagoManual({
              entidad_tipo: "inscripcion",
              entidad_id: pagoModal.inscripcionId,
              monto,
              metodo_pago: metodo || "Efectivo",
            });
            setPagoModal((prev) => ({ ...prev, isOpen: false }));
            triggerRefresh();
          } catch (error: any) {
            setPagoModal((prev) => ({
              ...prev,
              isLoading: false,
              isOpen: false,
            }));
            setFeedbackModal((prevModal: any) => ({
              ...prevModal,
              isOpen: true,
              type: "error",
              title: "Error",
              description: error.message,
            }));
          }
        }}
      />

      {isManualModalOpen && (
        <InscripcionManualModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSuccess={triggerRefresh}
          torneo={torneo}
        />
      )}
    </div>
  );
};
