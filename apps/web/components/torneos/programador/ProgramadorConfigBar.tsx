"use client";

import CustomDropdown from "@/components/ui/CustomDropdown";
import type {
  DistribucionProgramacion,
  ModoDescansoProgramador,
  ProgramadorConfig,
} from "./useProgramadorBoard";

interface Props {
  config: ProgramadorConfig;
  dias: string[];
  activeDay: string;
  sugerencia?: string;
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
  { value: "tras_fin_60", label: "60 min desde el final" },
  { value: "tras_fin_120", label: "120 min desde el final" },
  { value: "entre_inicios_240", label: "4 h entre inicios" },
] as const;

const DISTRIBUCION_OPTS = [
  { value: "zonas_primero", label: "Zonas primero y llaves al final" },
  { value: "continua", label: "Cronológica continua" },
] as const;

const JORNADA_OPTS = [
  { value: "0", label: "Fechas del torneo" },
  { value: "1", label: "1 día" },
  { value: "2", label: "2 días" },
  { value: "3", label: "3 días" },
  { value: "4", label: "4 días" },
] as const;

function horasOpciones(desde?: string): { value: string; label: string }[] {
  const piso = desde ? Number(desde.slice(0, 2)) * 60 + Number(desde.slice(3, 5)) : 8 * 60;
  const opts: { value: string; label: string }[] = [];
  for (let min = 8 * 60; min <= 21 * 60; min += 30) {
    if (desde && min < piso) continue;
    const h = String(Math.floor(min / 60)).padStart(2, "0");
    const m = String(min % 60).padStart(2, "0");
    opts.push({ value: `${h}:${m}`, label: `${h}:${m}` });
  }
  return opts;
}

export function ProgramadorConfigBar({
  config,
  dias,
  activeDay,
  sugerencia,
  disabled,
  syncing,
  onDayChange,
  onChange,
}: Props) {
  const diaOptions = dias.map((d) => ({
    value: d,
    label: formatDia(d),
  }));
  const finOpts = [
    { value: "", label: "Sin hora de fin" },
    ...horasOpciones(config.horaInicio),
  ];

  return (
    <div className="flex shrink-0 flex-col gap-1.5 rounded-2xl border border-white/10 bg-[#161616] px-2.5 py-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {dias.length === 0 ? (
          <p className="text-xs text-amber-200/90">
            Sin canchas. Agregá un club y sus canchas desde el programador.
          </p>
        ) : dias.length <= 6 ? (
          <div className="flex flex-wrap gap-1.5">
            {dias.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDayChange(d)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize cursor-pointer ${
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
              className="!px-2.5 !py-1.5 !text-xs"
            />
          </div>
        )}
        {sugerencia ? (
          <p
            className="min-w-0 flex-1 truncate text-xs text-brand-chartreuse"
            title={sugerencia}
          >
            {sugerencia}
          </p>
        ) : null}
        {syncing ? (
          <span className="text-xs text-brand-chartreuse/80 animate-pulse">
            Guardando…
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <div>
          <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
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
            className="!px-2.5 !py-1.5 !text-xs"
          />
        </div>
        <div>
          <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Descanso
          </span>
          <CustomDropdown
            value={config.descansoModo}
            onChange={(v) =>
              onChange({ descansoModo: v as ModoDescansoProgramador })
            }
            options={[...DESCANSO_OPTS]}
            placeholder="Descanso"
            disabled={disabled}
            className="!px-2.5 !py-1.5 !text-xs"
          />
        </div>
        <div>
          <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Distribución
          </span>
          <CustomDropdown
            value={config.distribucion}
            onChange={(v) =>
              onChange({ distribucion: v as DistribucionProgramacion })
            }
            options={[...DISTRIBUCION_OPTS]}
            placeholder="Distribución"
            disabled={disabled}
            className="!px-2.5 !py-1.5 !text-xs"
          />
        </div>
        <div>
          <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Jornadas
          </span>
          <CustomDropdown
            value={String(config.jornadas)}
            onChange={(v) =>
              onChange({ jornadas: Number(v) as ProgramadorConfig["jornadas"] })
            }
            options={[...JORNADA_OPTS]}
            placeholder="Jornadas"
            disabled={disabled}
            className="!px-2.5 !py-1.5 !text-xs"
          />
        </div>
        <div>
          <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Inicio
          </span>
          <CustomDropdown
            value={config.horaInicio}
            onChange={(v) => onChange({ horaInicio: v })}
            options={horasOpciones()}
            placeholder="Inicio"
            disabled={disabled}
            className="!px-2.5 !py-1.5 !text-xs"
          />
        </div>
        <div>
          <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
            Fin
          </span>
          <CustomDropdown
            value={config.horaFin}
            onChange={(v) => onChange({ horaFin: v })}
            options={finOpts}
            placeholder="Fin"
            disabled={disabled}
            className="!px-2.5 !py-1.5 !text-xs"
          />
        </div>
      </div>
    </div>
  );
}
