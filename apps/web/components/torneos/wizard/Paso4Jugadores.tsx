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
import {
  descargarPlantillaInscripcion,
  leerPlanillaDesdeArchivo,
} from "@/utils/inscripcionPlanilla";
import { esModalidadIndividual } from "@/utils/formatFecha";

function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return (
    e.response?.data?.error ||
    e.response?.data?.message ||
    e.message ||
    fallback
  );
}

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
    descargarPlantillaInscripcion({
      alcance: torneo.alcance,
      reglamento: (torneo as { reglamento?: string }).reglamento,
      asociacion: (torneo as { asociacion?: string }).asociacion,
    });
  };

  const handleSubirPlanilla = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingCSV(true);
    try {
      const { filas } = await leerPlanillaDesdeArchivo(file);
      if (filas.length === 0) {
        setFeedbackModal((prev: { isOpen?: boolean }) => ({
          ...prev,
          isOpen: true,
          type: "error",
          title: "Planilla vacía",
          description:
            "No se encontraron jugadores con DNI o nombre en la planilla.",
        }));
        return;
      }

      const resultado = await InscripcionesService.importarPlanilla({
        torneo_id: torneo.id,
        filas,
        modalidad: torneo.modalidad,
      });

      triggerRefresh();
      const isIndiv = esModalidadIndividual(torneo.modalidad);

      if (resultado.errores.length === 0) {
        setFeedbackModal((prev: { isOpen?: boolean }) => ({
          ...prev,
          isOpen: true,
          type: "success",
          title: "Importación completada",
          description: `Se importaron ${resultado.inscripcionesOk} ${isIndiv ? "jugadores" : "parejas"}.${resultado.jugadoresCreados > 0 ? ` Se crearon ${resultado.jugadoresCreados} ficha(s) de jugador nuevas con los datos de la planilla.` : ""}`,
        }));
      } else {
        setFeedbackModal((prev: { isOpen?: boolean }) => ({
          ...prev,
          isOpen: true,
          type: "warning",
          title: "Importación con advertencias",
          description: `Éxitos: ${resultado.inscripcionesOk}. Perfiles nuevos: ${resultado.jugadoresCreados}. Errores:\n${resultado.errores.slice(0, 5).join("\n")}`,
        }));
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "No se pudo procesar la planilla.";
      setFeedbackModal((prev: { isOpen?: boolean }) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al importar",
        description: msg,
      }));
    } finally {
      setImportingCSV(false);
      e.target.value = "";
    }
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
      isLoading: false,
      onConfirm: async () => {
        setFeedbackModal((prevModal: any) => ({
          ...prevModal,
          isLoading: true,
        }));
        try {
          await InscripcionesService.eliminar(inscripcionId);
          triggerRefresh();
          setFeedbackModal((prevModal: any) => ({
            ...prevModal,
            isOpen: true,
            isLoading: false,
            type: "success",
            title: "Eliminada",
            description: "Cupo liberado.",
            onConfirm: undefined,
            confirmText: undefined,
            cancelText: undefined,
          }));
        } catch (error: unknown) {
          setFeedbackModal((prevModal: any) => ({
            ...prevModal,
            isOpen: true,
            isLoading: false,
            type: "error",
            title: "Error",
            description: apiErrorMessage(
              error,
              "No se pudo eliminar la inscripción.",
            ),
            onConfirm: undefined,
            confirmText: undefined,
            cancelText: undefined,
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
              accept=".xls,.xlsx"
              onChange={handleSubirPlanilla}
              disabled={importingCSV}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              disabled={importingCSV}
              className="w-full flex justify-center items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/10 disabled:opacity-50"
            >
              <Upload className="size-3.5" />{" "}
              {importingCSV ? "Importando..." : "Subir Planilla"}
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
                    className={`hover:bg-white/5 transition-colors ${
                      isConfirmed ? "bg-green-500/5" : ""
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
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                            isConfirmed
                              ? "bg-brand-chartreuse/10 text-brand-chartreuse"
                              : "bg-white/5 text-gray-500"
                          }`}
                        >
                          <User className="size-4" />
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
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
                            : "Pendiente de pago"}
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
              description: apiErrorMessage(
                error,
                "No se pudo confirmar el pago.",
              ),
              onConfirm: undefined,
              confirmText: undefined,
              cancelText: undefined,
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
