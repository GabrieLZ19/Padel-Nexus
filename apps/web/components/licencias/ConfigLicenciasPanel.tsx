"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Calendar,
  Save,
  ShieldCheck,
  Info,
  IdCard,
} from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import {
  LicenciasService,
  type LicenciaConfigData,
  type LicenciaFrecuenciaPago,
  type LicenciaVigenciaModo,
} from "@/utils/services/licencias";

interface ConfigLicenciasPanelProps {
  /** contexto = según rol del admin (recomendado en Jugadores y licencias) */
  scope?: "contexto" | "federacion" | "asociacion";
  entidadId?: string;
  titulo?: string;
  puedeEditar?: boolean;
  compact?: boolean;
}

const MESES = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
] as const;

const VIGENCIA_OPCIONES = [
  { value: "fecha_fija", label: "Fecha fija cada año (FAP: 31/12)" },
  { value: "meses_desde_emision", label: "Meses desde emisión" },
] as const;

const FRECUENCIA_OPCIONES = [
  { value: "anual", label: "Pago anual" },
  { value: "mensual", label: "Pago mensual" },
] as const;

const DIAS_OPCIONES = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const DIAS_COBRO_OPCIONES = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `Día ${i + 1}`,
}));

export function ConfigLicenciasPanel({
  scope = "contexto",
  entidadId,
  titulo,
  puedeEditar = true,
  compact = false,
}: ConfigLicenciasPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [hereda, setHereda] = useState(false);
  const [meta, setMeta] = useState<{
    entidad_nombre?: string;
    subtitulo?: string;
    puede_editar?: boolean;
  }>({});

  const [nombreCarne, setNombreCarne] = useState("");
  const [frecuencia, setFrecuencia] =
    useState<LicenciaFrecuenciaPago>("anual");
  const [precioAnualInput, setPrecioAnualInput] = useState("");
  const [precioMensualInput, setPrecioMensualInput] = useState("");
  const [diaCobro, setDiaCobro] = useState(1);
  const [modo, setModo] = useState<LicenciaVigenciaModo>("fecha_fija");
  const [mes, setMes] = useState(12);
  const [dia, setDia] = useState(31);
  const [mesesInput, setMesesInput] = useState("12");

  const editarHabilitado =
    puedeEditar && (scope !== "contexto" || meta.puede_editar !== false);

  useEffect(() => {
    if (scope !== "contexto" && !entidadId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        let data: LicenciaConfigData;
        if (scope === "contexto") {
          data = await LicenciasService.getConfigOrganizacion();
        } else if (scope === "federacion" && entidadId) {
          data = await LicenciasService.getConfigFederacion(entidadId);
        } else if (scope === "asociacion" && entidadId) {
          data = await LicenciasService.getConfigAsociacion(entidadId);
        } else {
          return;
        }
        if (!mounted || !data?.config) return;

        setNombreCarne(data.config.nombreCarne || "");
        setFrecuencia(data.config.frecuenciaPago || "anual");
        setPrecioAnualInput(String(data.config.precioAnual ?? ""));
        setPrecioMensualInput(String(data.config.precioMensual ?? ""));
        setDiaCobro(data.config.diaCobro ?? 1);
        setModo(data.config.vigenciaModo || "fecha_fija");
        setMes(data.config.vencimientoMes ?? 12);
        setDia(data.config.vencimientoDia ?? 31);
        setMesesInput(String(data.config.vigenciaMeses ?? 12));
        setDescripcion(data.descripcion_vigencia || "");
        setHereda(Boolean(data.hereda_de_federacion));
        setMeta({
          entidad_nombre: data.entidad_nombre,
          subtitulo: data.subtitulo,
          puede_editar: data.puede_editar,
        });
      } catch (err: unknown) {
        if (!mounted) return;
        const e = err as { response?: { data?: { error?: string } } };
        setError(
          e?.response?.data?.error ||
            "No se pudo cargar la configuración de licencias.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [scope, entidadId]);

  const guardar = async () => {
    setSaving(true);
    setMensaje(null);
    setError(null);
    try {
      const precioAnual =
        precioAnualInput.trim() === "" ? 0 : Number(precioAnualInput);
      const precioMensual =
        precioMensualInput.trim() === "" ? 0 : Number(precioMensualInput);
      const meses =
        mesesInput.trim() === "" ? 12 : Math.max(1, Number(mesesInput));

      const payload = {
        nombre_carne: nombreCarne.trim() || null,
        frecuencia_pago: frecuencia,
        precio_anual: precioAnual,
        precio_mensual: precioMensual,
        dia_cobro: frecuencia === "mensual" ? diaCobro : null,
        vigencia_modo: modo,
        vencimiento_mes: modo === "fecha_fija" ? mes : null,
        vencimiento_dia: modo === "fecha_fija" ? dia : null,
        vigencia_meses: modo === "meses_desde_emision" ? meses : 12,
      };

      let data: LicenciaConfigData;
      if (scope === "contexto") {
        data = await LicenciasService.updateConfigOrganizacion(payload);
      } else if (scope === "federacion" && entidadId) {
        data = await LicenciasService.updateConfigFederacion(
          entidadId,
          payload,
        );
      } else if (scope === "asociacion" && entidadId) {
        data = await LicenciasService.updateConfigAsociacion(
          entidadId,
          payload,
        );
      } else {
        throw new Error("Entidad no especificada.");
      }

      if (data?.config) {
        setNombreCarne(data.config.nombreCarne || "");
        setFrecuencia(data.config.frecuenciaPago || "anual");
        setPrecioAnualInput(String(data.config.precioAnual ?? ""));
        setPrecioMensualInput(String(data.config.precioMensual ?? ""));
        setDiaCobro(data.config.diaCobro ?? 1);
        setMesesInput(String(data.config.vigenciaMeses ?? 12));
      }
      setDescripcion(data.descripcion_vigencia || "");
      setHereda(Boolean(data.hereda_de_federacion));
      setMensaje("Guardado. Se aplica a nuevas activaciones y renovaciones.");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(
        e?.response?.data?.error ||
          e?.message ||
          "Error al guardar la configuración.",
      );
    } finally {
      setSaving(false);
    }
  };

  const tituloFinal =
    titulo || meta.entidad_nombre || "Configuración de carnets federativos";

  if (loading) {
    return (
      <div
        className={`bg-[#151515] border border-white/5 rounded-2xl p-6 text-sm text-gray-500 ${
          compact ? "" : "h-full"
        }`}
      >
        Cargando configuración...
      </div>
    );
  }

  if (error && !meta.entidad_nombre) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div
      className={`bg-[#151515] border border-white/5 rounded-2xl flex flex-col ${
        compact ? "p-5 space-y-4" : "p-6 space-y-5 h-full"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="size-5 text-brand-chartreuse" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-chartreuse mb-0.5">
            Parámetros del circuito
          </p>
          <h2 className="text-base font-bold text-white leading-tight">
            {tituloFinal}
          </h2>
          {meta.subtitulo && (
            <p className="text-xs text-gray-400 mt-1">{meta.subtitulo}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-black/30 border border-white/5 px-3 py-2.5 flex gap-2 text-[11px] text-gray-400">
        <Info className="size-4 text-brand-chartreuse shrink-0 mt-0.5" />
        <p>
          Estos valores se replican al aprobar o renovar licencias. Con pago
          mensual, la vigencia se extiende con cada pago registrado.
        </p>
      </div>

      {hereda && scope === "asociacion" && (
        <p className="text-[11px] text-amber-400/90">
          Sin override: hereda valores de la federación nacional.
        </p>
      )}

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
            <IdCard className="size-3" /> Nombre del carné
          </span>
          <input
            type="text"
            disabled={!editarHabilitado}
            value={nombreCarne}
            onChange={(e) => setNombreCarne(e.target.value)}
            placeholder="Ej: Licencia Federativa / Carné APA"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-50 placeholder:text-gray-600"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Frecuencia de pago
          </span>
          <CustomDropdown
            value={frecuencia}
            onChange={(val) =>
              setFrecuencia(val as LicenciaFrecuenciaPago)
            }
            options={FRECUENCIA_OPCIONES}
            placeholder="Frecuencia"
            disabled={!editarHabilitado}
          />
        </label>

        {frecuencia === "mensual" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                <DollarSign className="size-3" /> Precio mensual (ARS)
              </span>
              <input
                type="text"
                inputMode="numeric"
                disabled={!editarHabilitado}
                value={precioMensualInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d+$/.test(val)) {
                    setPrecioMensualInput(val);
                  }
                }}
                placeholder="Ej: 5000"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-50 placeholder:text-gray-600"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Día de cobro
              </span>
              <CustomDropdown
                value={String(diaCobro)}
                onChange={(val) => setDiaCobro(Number(val))}
                options={DIAS_COBRO_OPCIONES}
                placeholder="Día"
                disabled={!editarHabilitado}
              />
            </label>
          </div>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <DollarSign className="size-3" /> Costo anual (ARS)
            </span>
            <input
              type="text"
              inputMode="numeric"
              disabled={!editarHabilitado}
              value={precioAnualInput}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d+$/.test(val)) {
                  setPrecioAnualInput(val);
                }
              }}
              placeholder="Ej: 45000"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-50 placeholder:text-gray-600"
            />
          </label>
        )}

        {/* Vigencia anual clásica: solo relevante si frecuencia = anual */}
        {frecuencia === "anual" && (
          <>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Vigencia
              </span>
              <CustomDropdown
                value={modo}
                onChange={(val) => setModo(val as LicenciaVigenciaModo)}
                options={VIGENCIA_OPCIONES}
                placeholder="Seleccionar vigencia"
                disabled={!editarHabilitado}
              />
            </label>

            {modo === "fecha_fija" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Mes
                  </span>
                  <CustomDropdown
                    value={String(mes)}
                    onChange={(val) => setMes(Number(val))}
                    options={MESES}
                    placeholder="Mes"
                    disabled={!editarHabilitado}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Día
                  </span>
                  <CustomDropdown
                    value={String(dia)}
                    onChange={(val) => setDia(Number(val))}
                    options={DIAS_OPCIONES}
                    placeholder="Día"
                    disabled={!editarHabilitado}
                    haciaArriba
                  />
                </label>
              </div>
            ) : (
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Meses de vigencia
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!editarHabilitado}
                  value={mesesInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setMesesInput(val);
                    }
                  }}
                  placeholder="12"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white disabled:opacity-50 placeholder:text-gray-600"
                />
              </label>
            )}
          </>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-400 bg-black/20 border border-white/5 rounded-xl px-3 py-2.5 mt-auto">
        <Calendar className="size-4 text-brand-chartreuse shrink-0 mt-0.5" />
        <span>
          Vigencia configurada:{" "}
          <strong className="text-white">{descripcion}</strong>
        </span>
      </div>

      {mensaje && (
        <p className="text-xs text-brand-chartreuse">{mensaje}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {editarHabilitado ? (
        <button
          type="button"
          onClick={guardar}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 bg-brand-chartreuse text-brand-black px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-60 cursor-pointer"
        >
          <Save className="size-4" />
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      ) : (
        <p className="text-[11px] text-center text-gray-500 py-2">
          Solo la federación nacional puede editar estos valores.
        </p>
      )}
    </div>
  );
}
