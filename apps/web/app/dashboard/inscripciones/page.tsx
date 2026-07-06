"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Users,
  User,
  Trophy,
  Check,
  X,
  Clock,
  CreditCard,
  ChevronRight,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { InscripcionesService } from "@/utils/services/inscripciones";
import ConfirmarPagoModal from "@/components/inscripciones/ConfirmarPagoModal";
import { Inscripcion, Torneo } from "../../../utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "../../../components/ui/FeedbackModal";
import InscripcionDetalleModal from "../../../components/inscripciones/InscripcionDetalleModal";
import CustomDropdown from "../../../components/ui/CustomDropdown";
import Pagination from "../../../components/ui/Pagination";
import { TorneosService, PagosService } from "@/utils/services";
import { FAP_ESTADOS_PAGO } from "@/utils/constants/fap";
import InscripcionManualModal from "@/components/inscripciones/InscripcionManualModal";

const TABS = ["Todas", "Pendientes", "Confirmadas", "Rechazadas"];

const PAGE_SIZE = 5;

const cleanName = (name?: string | null) => {
  if (!name) return "Desconocido";
  let cleaned = name.trim().replace(/^[\s,]+/, "").replace(/[\s,]+$/, "");
  if (cleaned === "," || cleaned === "") return "Desconocido";
  return cleaned;
};

export default function GestionInscripcionesPage() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [page, setPage] = useState<number>(1);
  const [filterTorneo, setFilterTorneo] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [selectedInscripcion, setSelectedInscripcion] =
    useState<Inscripcion | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const selectedTorneo = torneos.find((t) => t.id === filterTorneo);

  const [importingCSV, setImportingCSV] = useState(false);

  const handleDescargarPlantilla = () => {
    if (!selectedTorneo) return;
    const isIndiv = selectedTorneo.modalidad === "Individual";
    const headers = isIndiv
      ? ["Jugador (DNI o Email)", "Metodo de Pago (Efectivo / Transferencia / Dejar vacio)"]
      : ["Jugador 1 (DNI o Email)", "Jugador 2 (DNI o Email)", "Metodo de Pago (Efectivo / Transferencia / Dejar vacio)"];
      
    const exampleRows = isIndiv
      ? [
          ["jugador@email.com", "Efectivo"],
          ["40123456", "Transferencia"],
          ["otro_jugador@email.com", ""],
        ]
      : [
          ["jugador1@email.com", "jugador2@email.com", "Efectivo"],
          ["40123456", "41765432", "Transferencia"],
          ["otro_j1@email.com", "otro_j2@email.com", ""],
        ];

    // UTF-8 BOM so Excel opens accents correctly
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...exampleRows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `plantilla_inscripcion_${selectedTorneo.modalidad.toLowerCase()}_${selectedTorneo.nombre.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubirCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTorneo) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setFeedbackModal({
          isOpen: true,
          type: "error",
          title: "Archivo vacío",
          description: "El archivo no contiene filas de datos (solo cabecera o vacío).",
          onClose: () => setFeedbackModal(prev => ({ ...prev, isOpen: false })),
        });
        return;
      }

      setImportingCSV(true);
      let successCount = 0;
      let errors: string[] = [];

      const dataRows = lines.slice(1);
      const isIndiv = selectedTorneo.modalidad === "Individual";

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const delimiter = row.includes(";") ? ";" : ",";
        const parts = row.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ""));
        
        if (isIndiv) {
          const identificador = parts[0];
          const metodo = parts[1] || "";
          if (!identificador) continue;

          try {
            await InscripcionesService.inscribirManual({
              torneo_id: selectedTorneo.id,
              jugador1_identificador: identificador,
              monto: Number(selectedTorneo.precio_inscripcion || 0),
              metodo_pago: metodo || undefined,
            });
            successCount++;
          } catch (err: any) {
            const errMsg = err.response?.data?.error || err.message || "Error desconocido";
            errors.push(`Fila ${i + 2} (${identificador}): ${errMsg}`);
          }
        } else {
          // Duplas
          const j1 = parts[0];
          const j2 = parts[1];
          const metodo = parts[2] || "";
          if (!j1) continue;

          try {
            await InscripcionesService.inscribirManual({
              torneo_id: selectedTorneo.id,
              jugador1_identificador: j1,
              jugador2_identificador: j2 || undefined,
              monto: Number(selectedTorneo.precio_inscripcion || 0),
              metodo_pago: metodo || undefined,
            });
            successCount++;
          } catch (err: any) {
            const errMsg = err.response?.data?.error || err.message || "Error desconocido";
            errors.push(`Fila ${i + 2} (${j1}/${j2 || 'N/A'}): ${errMsg}`);
          }
        }
      }

      setImportingCSV(false);
      setRefreshKey((prev) => prev + 1);

      if (errors.length === 0) {
        setFeedbackModal({
          isOpen: true,
          type: "success",
          title: "Inscripción Masiva Completada",
          description: `Se inscribieron exitosamente ${successCount} ${isIndiv ? 'jugadores' : 'parejas'}.`,
          onClose: () => setFeedbackModal(prev => ({ ...prev, isOpen: false })),
        });
      } else {
        setFeedbackModal({
          isOpen: true,
          type: "warning",
          title: "Inscripción con Advertencias",
          description: `Se inscribieron ${successCount} participantes. Fallaron ${errors.length}:\n\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? "\n... entre otros." : ""}`,
          onClose: () => setFeedbackModal(prev => ({ ...prev, isOpen: false })),
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  useEffect(() => {
    TorneosService.getAll().then(setTorneos).catch(console.error);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await InscripcionesService.getByPage(
          filterTorneo,
          page,
          PAGE_SIZE,
        );
        setInscripciones(Array.isArray(res.data) ? res.data : []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error("Error al cargar:", err);
        setInscripciones([]);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [filterTorneo, page, refreshKey]);

  const [pagoModal, setPagoModal] = useState<{
    isOpen: boolean;
    inscripcionId: string;
    montoDefecto: number;
    isLoading: boolean;
  }>({
    isOpen: false,
    inscripcionId: "",
    montoDefecto: 0,
    isLoading: false,
  });

  const handleCambiarEstado = (
    id: string,
    nuevoEstado: "Confirmado" | "Rechazado",
    montoDefecto?: number,
  ) => {
    if (nuevoEstado === "Confirmado") {
      setPagoModal({
        isOpen: true,
        inscripcionId: id,
        montoDefecto: montoDefecto || 0,
        isLoading: false,
      });
    } else {
      setFeedbackModal({
        isOpen: true,
        type: "danger",
        title: `¿Rechazar inscripción?`,
        description: `Estás a punto de rechazar esta inscripción.`,
        confirmText: `Sí, rechazar`,
        cancelText: "Cancelar",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        onConfirm: () => {
          setFeedbackModal((prev) => ({ ...prev, isLoading: true }));

          InscripcionesService.updateEstado(id, nuevoEstado)
            .then(() => {
              setFeedbackModal({
                isOpen: true,
                type: "success",
                title: "Estado actualizado",
                description: `La inscripción ahora figura como ${nuevoEstado}.`,
                onClose: () =>
                  setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
              });
              setRefreshKey((prev) => prev + 1);
            })
            .catch((error: unknown) => {
              let mensajeError =
                "Ocurrió un error inesperado al procesar la solicitud.";
              if (error instanceof Error) {
                mensajeError = error.message;
              }

              interface ApiError {
                response?: { data?: { message?: string } };
              }
              const apiError = error as ApiError;
              if (apiError.response?.data?.message) {
                mensajeError = apiError.response.data.message;
              }

              setFeedbackModal({
                isOpen: true,
                type: "warning",
                title: "Hubo un problema",
                description: "No pudimos actualizar el estado: " + mensajeError,
                onClose: () =>
                  setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
              });
            });
        },
      });
    }
  };

  const handleOpenDetalle = (inscripcion: Inscripcion) => {
    setSelectedInscripcion(inscripcion);
    setDetalleModalOpen(true);
  };

  const filteredInscripciones = inscripciones.filter((i) => {
    const term = search.toLowerCase();
    const nombreJ1 = (i.jugador1_nombre || "").toLowerCase();
    const nombreJ2 = (i.jugador2_nombre || "").toLowerCase();
    const nombreTorneo = (
      i.torneo_nombre ||
      i.cancha_nombre ||
      ""
    ).toLowerCase();

    const matchSearch =
      nombreJ1.includes(term) ||
      nombreJ2.includes(term) ||
      nombreTorneo.includes(term);

    const matchTab =
      activeTab === "Todas" ||
      (activeTab === "Pendientes" &&
        i.estado_pago === FAP_ESTADOS_PAGO.PENDIENTE) ||
      (activeTab === "Confirmadas" &&
        i.estado_pago === FAP_ESTADOS_PAGO.CONFIRMADO) ||
      (activeTab === "Rechazadas" &&
        i.estado_pago === FAP_ESTADOS_PAGO.RECHAZADO);

    return matchSearch && matchTab;
  });

  // --- CÁLCULO DE MÉTRICAS REALES ---
  const kpiPendientes = inscripciones.filter(
    (i) => i.estado_pago === FAP_ESTADOS_PAGO.PENDIENTE,
  ).length;
  const kpiConfirmadas = inscripciones.filter(
    (i) => i.estado_pago === FAP_ESTADOS_PAGO.CONFIRMADO,
  ).length;
  const kpiRechazadas = inscripciones.filter(
    (i) => i.estado_pago === FAP_ESTADOS_PAGO.RECHAZADO,
  ).length;
  const recaudacionTotal = inscripciones
    .filter((i) => i.estado_pago === FAP_ESTADOS_PAGO.CONFIRMADO)
    .reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

  const formatMoney = (amount: number) => {
    if (amount >= 1000000)
      return `$ ${(amount / 1000000).toFixed(1).replace(".0", "")}M`;
    if (amount >= 1000)
      return `$ ${(amount / 1000).toFixed(1).replace(".0", "")}K`;
    return `$ ${amount.toLocaleString("es-AR")}`;
  };

  // --- EXPORTAR A EXCEL (CSV) BLINDADO ---
  const handleExportarExcel = () => {
    const headers = [
      "ID",
      "Jugador 1",
      "Jugador 2",
      "Torneo/Cancha",
      "Categoría",
      "Fecha",
      "Monto",
      "Estado",
    ];
    // Aseguramos que si viene un null/undefined, lo convierta a string vacío
    const escapeCSV = (str: string | number | undefined | null) =>
      `"${String(str || "").replace(/"/g, '""')}"`;

    const csvData = filteredInscripciones.map((ins) => [
      escapeCSV(ins.id),
      escapeCSV(ins.jugador1_nombre),
      escapeCSV(ins.jugador2_nombre || "-"),
      escapeCSV(ins.torneo_nombre || ins.cancha_nombre),
      escapeCSV(ins.categoria),
      escapeCSV(
        new Date(ins.created_at || new Date()).toLocaleDateString("es-AR"),
      ),
      escapeCSV(ins.monto),
      escapeCSV(ins.estado_pago),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Inscripciones_PadelNexus_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Inscripciones y reservas
          </h1>
          <p className="text-gray-400 mt-1">Control de pagos y validaciones</p>
        </div>
        <div className="flex gap-2">
          {selectedTorneo && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDescargarPlantilla}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/10 cursor-pointer animate-in fade-in"
                title="Descargar plantilla CSV para carga masiva"
              >
                <Download className="size-3.5" /> Descargar Plantilla
              </button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleSubirCSV}
                  disabled={importingCSV}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button
                  disabled={importingCSV}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/10 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="size-3.5" /> {importingCSV ? "Importando..." : "Subir CSV"}
                </button>
              </div>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center gap-2 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
              >
                Inscribir {selectedTorneo.modalidad === "Individual" ? "Jugador" : "Pareja"}
              </button>
            </div>
          )}
          <button
            onClick={handleExportarExcel}
            disabled={loading || filteredInscripciones.length === 0}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="size-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-[#ffb800]/30 transition-all">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#ffb800]/10 rounded-full blur-3xl group-hover:bg-[#ffb800]/20 transition-all"></div>
          <AlertCircle className="size-6 text-[#ffb800] mb-4 opacity-80" />
          <div className="text-4xl font-black text-[#ffb800] leading-none mb-2">
            {kpiPendientes}
          </div>
          <div className="text-sm font-medium text-gray-400">
            Pendientes de validación
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-[#00ff88]/30 transition-all">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#00ff88]/10 rounded-full blur-3xl group-hover:bg-[#00ff88]/20 transition-all"></div>
          <CheckCircle2 className="size-6 text-[#00ff88] mb-4 opacity-80" />
          <div className="text-4xl font-black text-[#00ff88] leading-none mb-2">
            {kpiConfirmadas}
          </div>
          <div className="text-sm font-medium text-gray-400">
            Pagos confirmados
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-[#ff4444]/30 transition-all">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#ff4444]/10 rounded-full blur-3xl group-hover:bg-[#ff4444]/20 transition-all"></div>
          <XCircle className="size-6 text-[#ff4444] mb-4 opacity-80" />
          <div className="text-4xl font-black text-[#ff4444] leading-none mb-2">
            {kpiRechazadas}
          </div>
          <div className="text-sm font-medium text-gray-400">
            Pagos rechazados
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-brand-chartreuse/30 transition-all">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-chartreuse/10 rounded-full blur-3xl group-hover:bg-brand-chartreuse/20 transition-all"></div>
          <TrendingUp className="size-6 text-brand-chartreuse mb-4 opacity-80" />
          <div className="text-4xl font-black text-brand-chartreuse leading-none mb-2">
            {formatMoney(recaudacionTotal)}
          </div>
          <div className="text-sm font-medium text-gray-400">
            Recaudado (Aprobado)
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pt-4">
        <div className="w-full xl:w-[320px]">
          <CustomDropdown
            value={filterTorneo}
            onChange={(value) => {
              setFilterTorneo(value);
              setPage(1);
            }}
            placeholder="Todos los torneos"
            options={[
              { value: "", label: "Todos los torneos" },
              ...torneos.map((t) => ({ value: t.id, label: t.nombre })),
            ]}
            disabled={loading}
          />
        </div>

        <div className="inline-flex bg-[#111111] p-1.5 rounded-xl border border-white/5 overflow-x-auto w-full sm:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-brand-chartreuse text-[#111] shadow-[0_0_10px_rgba(204,255,0,0.15)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
          <input
            type="text"
            placeholder="Buscar dupla o torneo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#111111] rounded-xl border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL DE INSCRIPCIONES */}
      <div className="bg-[#111111] rounded-3xl border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-250">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="py-5 px-8">
                    <div className="h-3 w-24 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-20 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-20 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-24 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-8">
                    <div className="h-3 w-20 bg-white/10 rounded ml-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-5 px-8">
                      <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-white/5 rounded"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-4 w-40 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-4 w-24 bg-white/10 rounded"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-6 w-24 bg-white/10 rounded-full"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-4 w-20 bg-white/10 rounded"></div>
                    </td>
                    <td className="py-5 px-8">
                      <div className="h-9 w-24 bg-white/5 rounded-lg ml-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredInscripciones.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-500">
              <Search className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No hay inscripciones
            </h3>
            <p className="text-gray-500 text-sm max-w-sm">
              No se encontraron registros que coincidan con la búsqueda o el
              filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider bg-black/20">
                  <th className="py-4 px-8">Jugador / Dupla</th>
                  <th className="py-4 px-6">Torneo / Cancha</th>
                  <th className="py-4 px-6">Fecha Req.</th>
                  <th className="py-4 px-6">Estado del Pago</th>
                  <th className="py-4 px-6">Monto</th>
                  <th className="py-4 px-8 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInscripciones.map((ins) => {
                  const esDupla =
                    ins.jugador2_nombre &&
                    ins.jugador2_nombre.trim() !== "" &&
                    ins.jugador2_nombre !== "-";

                  return (
                    <tr
                      key={ins.id}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3 mb-1">
                          {esDupla ? (
                            <Users className="size-4 text-brand-chartreuse" />
                          ) : (
                            <User className="size-4 text-brand-chartreuse" />
                          )}
                          <div>
                            <div className="font-bold text-white text-[14px]">
                              {/* Eliminamos ins.perfiles porque el backend ya inyectó el nombre dentro de jugador1_nombre */}
                              {cleanName(ins.jugador1_nombre)}
                              {esDupla && ins.jugador2_nombre && (
                                <span className="text-gray-400 font-medium">
                                  {" "}
                                  / {cleanName(ins.jugador2_nombre)}
                                </span>
                              )}
                            </div>
                            <div className="text-[13px] text-gray-500 mt-0.5">
                              {ins.tipo || "Inscripción torneo"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-brand-white mb-1 flex items-center gap-2 text-[14px]">
                          {ins.tipo === "Reserva cancha" ? (
                            <MapPin className="size-3.5 text-gray-500" />
                          ) : (
                            <Trophy className="size-3.5 text-gray-500" />
                          )}
                          {ins.tipo === "Reserva cancha"
                            ? ins.cancha_nombre || "Cancha no asignada"
                            : ins.torneo_nombre || "Torneo no asignado"}
                        </div>
                        {ins.categoria && ins.categoria !== "-" && (
                          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                            {ins.categoria}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-[13px] text-gray-400 flex items-center gap-2">
                        <Clock className="size-3.5" />
                        {new Date(
                          ins.created_at || new Date(),
                        ).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </td>

                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              ins.estado_pago === "Confirmado"
                                ? "bg-[#00ff88]"
                                : ins.estado_pago === "Pendiente"
                                  ? "bg-[#ffb800]"
                                  : "bg-[#ff4444]"
                            }`}
                          />
                          {ins.estado_pago}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-bold text-brand-white flex items-center gap-1.5 text-[14px]">
                        <CreditCard className="size-4 text-gray-500" />$
                        {Number(ins.monto || 0).toLocaleString("es-AR")}
                      </td>

                      <td className="py-4 px-8 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {ins.estado_pago === FAP_ESTADOS_PAGO.PENDIENTE ? (
                            <>
                              <button
                                onClick={() =>
                                  handleCambiarEstado(
                                    String(ins.id),
                                    FAP_ESTADOS_PAGO.CONFIRMADO,
                                    Number(ins.monto || 0),
                                  )
                                }
                                className="p-2.5 bg-green-500/10 hover:bg-green-500/20 text-[#00ff88] rounded-xl transition-all border border-green-500/20"
                                title="Aprobar Inscripción"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleCambiarEstado(
                                    String(ins.id),
                                    FAP_ESTADOS_PAGO.RECHAZADO,
                                  )
                                }
                                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-[#ff4444] rounded-xl transition-all border border-red-500/20"
                                title="Rechazar Inscripción"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenDetalle(ins)}
                              className="flex items-center gap-1 text-gray-400 hover:text-brand-chartreuse font-semibold text-[13px] transition-colors"
                            >
                              Detalles <ChevronRight className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        currentCount={filteredInscripciones.length}
        onPageChange={setPage}
      />
      <div className="relative z-50">
        <FeedbackModal {...feedbackModal} />
      </div>

      <InscripcionDetalleModal
        isOpen={detalleModalOpen}
        onClose={() => setDetalleModalOpen(false)}
        inscripcion={selectedInscripcion}
      />

      {isManualModalOpen && selectedTorneo && (
        <InscripcionManualModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onSuccess={() => setRefreshKey((prev) => prev + 1)}
          torneo={selectedTorneo}
        />
      )}

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
              monto: monto,
              metodo_pago: metodo || "Efectivo",
            });
            setPagoModal((prev) => ({ ...prev, isOpen: false }));
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "Pago Confirmado",
              description: `El pago ha sido registrado y la inscripción está confirmada.`,
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
            setRefreshKey((prev) => prev + 1);
          } catch (error: any) {
            setPagoModal((prev) => ({
              ...prev,
              isLoading: false,
              isOpen: false,
            }));
            setFeedbackModal({
              isOpen: true,
              type: "error",
              title: "Error al procesar pago",
              description:
                error.response?.data?.error ||
                error.message ||
                "Error al registrar el pago manual.",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          }
        }}
      />
    </div>
  );
}
