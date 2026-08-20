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
import { useProfileStore } from "@/store/useProfileStore";
import { esTorneoContextoFederacion } from "@/utils/constants/fapApaRules";
import type { RolUsuario } from "@/utils/types/user.types";
import {
  PairDisplay,
  esAlcanceNacional,
} from "@/components/torneos/PairDisplay";

interface Paso4JugadoresProps {
  torneo: Torneo;
  torneoId: string;
  inscripciones: Inscripcion[];
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  readOnly?: boolean;
}

export const Paso4Jugadores = ({
  torneo,
  torneoId,
  inscripciones,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  readOnly = false,
}: Paso4JugadoresProps) => {
  const profile = useProfileStore((s) => s.profile);
  const userRole = (profile?.rol || "admin") as RolUsuario;
  const modoFederacion = esTorneoContextoFederacion(
    {
      alcance: torneo.alcance,
      reglamento: (torneo as { reglamento?: string }).reglamento,
      asociacion: (torneo as { asociacion?: string }).asociacion,
    },
    userRole,
  );
  const nacional = esAlcanceNacional(torneo.alcance);

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
    const esNacional = /nacional/i.test(String(torneo.alcance || ""));
    const headers = isIndiv
      ? [
          "Jugador (DNI o Email)",
          ...(esNacional ? ["Letra (A-Z)"] : []),
          "Metodo de Pago (Efectivo / Transferencia / Dejar vacio)",
        ]
      : [
          "Jugador 1 (DNI o Email)",
          "Jugador 2 (DNI o Email)",
          ...(esNacional ? ["Letra (A-Z)"] : []),
          "Metodo de Pago",
        ];

    const exampleRows = isIndiv
      ? esNacional
        ? [
            ["jugador@email.com", "A", "Efectivo"],
            ["40123456", "B", "Transferencia"],
          ]
        : [
            ["jugador@email.com", "Efectivo"],
            ["40123456", "Transferencia"],
          ]
      : esNacional
        ? [
            ["j1@email.com", "j2@email.com", "A", "Efectivo"],
            ["40123456", "41765432", "B", "Transferencia"],
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
      const esNacional = /nacional/i.test(String(torneo.alcance || ""));
      const metodosPago = [
        "efectivo",
        "transferencia",
        "mercado_pago",
        "mercadopago",
        "confirmado",
      ];

      for (let i = 0; i < dataRows.length; i++) {
        const parts = dataRows[i]
          .split(dataRows[i].includes(";") ? ";" : ",")
          .map((p) => p.trim().replace(/^["']|["']$/g, ""));

        try {
          if (isIndiv) {
            if (!parts[0]) continue;
            let letra: string | undefined;
            let metodo: string | undefined;
            if (esNacional) {
              letra = parts[1] || undefined;
              metodo = parts[2] || undefined;
            } else {
              metodo = parts[1] || undefined;
            }
            await InscripcionesService.inscribirManual({
              torneo_id: torneo.id,
              jugador1_identificador: parts[0],
              monto: Number(torneo.precio_inscripcion || 0),
              metodo_pago: metodo || undefined,
              letra_prioridad: letra,
            });
          } else {
            if (!parts[0]) continue;
            let j1 = parts[0];
            let j2 = parts[1] || "";
            let letra: string | undefined;
            let metodo: string | undefined;

            if (esNacional) {
              // j1, j2, letra, metodo — o j1, j2, letra
              if (
                parts.length >= 3 &&
                parts[2] &&
                !metodosPago.includes(parts[2].toLowerCase())
              ) {
                letra = parts[2];
                metodo = parts[3] || undefined;
              } else if (
                parts.length === 2 &&
                j2 &&
                metodosPago.includes(j2.toLowerCase())
              ) {
                metodo = j2;
                j2 = "";
              } else {
                letra = parts[2] || undefined;
                metodo = parts[3] || undefined;
              }
            } else if (
              parts.length === 2 &&
              j2 &&
              metodosPago.includes(j2.toLowerCase())
            ) {
              metodo = j2;
              j2 = "";
            } else {
              metodo = parts[2] || undefined;
            }

            await InscripcionesService.inscribirManual({
              torneo_id: torneo.id,
              jugador1_identificador: j1,
              jugador2_identificador: j2 || undefined,
              monto: Number(torneo.precio_inscripcion || 0),
              metodo_pago: metodo || undefined,
              letra_prioridad: letra,
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
    <div className={`bg-[#111111] rounded-3xl border border-white/5 overflow-hidden shadow-xl ${readOnly ? "pointer-events-none opacity-60 select-none" : ""}`}>
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
                const isPendienteRegistro = ins.estado_pago === "Pendiente" || (ins as any).registrado === false;
                return (
                  <tr
                    key={ins.id}
                    className={`hover:bg-white/5 transition-colors ${
                      isPendienteRegistro
                        ? "opacity-50 bg-black/40 grayscale"
                        : isConfirmed
                        ? "bg-green-500/5"
                        : ""
                    }`}
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
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isPendienteRegistro
                              ? "bg-gray-800 text-gray-400"
                              : "bg-brand-chartreuse/10 text-brand-chartreuse"
                          }`}
                        >
                          <User className="size-4" />
                        </div>
                        <div>
                          <PairDisplay
                            j1={ins.jugador1_nombre}
                            j2={ins.jugador2_nombre}
                            usuarioId={ins.usuario_id}
                            usuario2Id={ins.usuario2_id}
                            denominacion={ins.denominacion_nacional}
                            alcanceNacional={nacional}
                            showAvatars={false}
                            variant="inline"
                          />
                          {isPendienteRegistro && (
                            <span className="block text-[10px] text-amber-400/80 font-bold mt-0.5">
                              ⚠️ Jugador no registrado en App (Pendiente)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          isConfirmed
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {isConfirmed
                          ? modoFederacion
                            ? "Pagó"
                            : "Confirmado"
                          : modoFederacion
                            ? "No pagó"
                            : "Pendiente en App"}
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
        modoFederacion={modoFederacion}
        onClose={() => setPagoModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async (monto: number, metodo: string) => {
          setPagoModal((prev) => ({ ...prev, isLoading: true }));
          try {
            await PagosService.confirmarPagoManual({
              entidad_tipo: "inscripcion",
              entidad_id: pagoModal.inscripcionId,
              monto,
              metodo_pago: modoFederacion
                ? "Confirmado"
                : metodo || "Efectivo",
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
