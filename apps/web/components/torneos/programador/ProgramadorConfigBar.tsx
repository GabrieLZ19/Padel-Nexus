"use client";

import CustomDropdown from "@/components/ui/CustomDropdown";
import type { ProgramadorConfig, EstrategiaAuto } from "./useProgramadorBoard";

interface Props {
  config: ProgramadorConfig;
  dias: string[];
  activeDay: string;
  disabled?: boolean;
  syncing?: boolean;
  onDayChange: (day: string) => void;
  onChange: (next: Partial<ProgramadorConfig>) => void;
}

function formatDia(iso: string): string {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

const TURNO_OPTS = [
  { value: "60", label: "60 min" },
  { value: "75", label: "75 min" },
  { value: "90", label: "90 min" },
] as const;

const DESCANSO_OPTS = [
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "120 min" },
] as const;

const ESTRATEGIA_OPTS = [
  { value: "smart", label: "Smart (jornadas)" },
  { value: "continuous", label: "Continuo" },
] as const;

export function ProgramadorConfigBar({
  config,
  dias,
  activeDay,
  disabled,
  syncing,
  onDayChange,
  onChange,
}: Props) {
  const diaOptions = dias.map((d) => ({
    value: d,
    label: formatDia(d),
  }));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#161616] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Jornada
        </p>
        {syncing ? (
          <span className="text-[11px] text-brand-chartreuse/80 animate-pulse">
            Guardando…
          </span>
        ) : null}
      </div>

      {dias.length === 0 ? (
        <p className="text-sm text-amber-200/90">
          Sin canchas. Configurá sedes y canchas en Paso 5.
        </p>
      ) : dias.length <= 6 ? (
        <div className="flex flex-wrap gap-2">
          {dias.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDayChange(d)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize cursor-pointer ${
                activeDay === d
                  ? "bg-brand-chartreuse text-black"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              {formatDia(d)}
            </button>
          ))}
        </div>
      ) : (
        <div className="max-w-xs">
          <CustomDropdown
            value={activeDay}
            onChange={onDayChange}
            options={diaOptions}
            placeholder="Elegí jornada…"
            disabled={disabled}
            className="!py-2.5 !text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Turno
          </span>
          <CustomDropdown
            value={String(config.duracion)}
            onChange={(v) =>
              onChange({ duracion: Number(v) as 60 | 75 | 90 })
            }
            options={[...TURNO_OPTS]}
            placeholder="Duración"
            disabled={disabled}
            className="!py-2.5 !text-sm"
          />
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Descanso
          </span>
          <CustomDropdown
            value={String(config.descanso)}
            onChange={(v) => onChange({ descanso: Number(v) })}
            options={[...DESCANSO_OPTS]}
            placeholder="Descanso"
            disabled={disabled}
            className="!py-2.5 !text-sm"
          />
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Estrategia auto
          </span>
          <CustomDropdown
            value={config.estrategia}
            onChange={(v) =>
              onChange({ estrategia: v as EstrategiaAuto })
            }
            options={[...ESTRATEGIA_OPTS]}
            placeholder="Estrategia"
            disabled={disabled}
            className="!py-2.5 !text-sm"
          />
        </div>
      </div>
    </div>
  );
}
