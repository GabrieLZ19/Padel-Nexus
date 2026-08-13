import jsPDF from "jspdf";
import type { IncidenciaFiscal, FichaJugadorFiscal, FiscalTorneo } from "@/utils/services/fiscal-panel";
import { MOTIVOS_INFORME_LABELS, nombreSedeFiscal } from "@/utils/services/fiscal-panel";
import { formatFechaCalendario } from "@/utils/formatFecha";

const NAVY: [number, number, number] = [15, 23, 42];
const LIME: [number, number, number] = [163, 230, 53];
const SLATE: [number, number, number] = [71, 85, 105];

function labelPosicion(pos?: string | null): string {
  if (pos === "drive") return "Drive";
  if (pos === "reves") return "Revés";
  return "—";
}

export function generarInformePreliminarPdf(opts: {
  torneo: Pick<FiscalTorneo, "nombre" | "fecha" | "sede_nombre" | "lugar" | "clubes">;
  jugador: Pick<
    FichaJugadorFiscal,
    "nombre" | "apellido" | "dni" | "categoria_padel" | "asociacion_o_club" | "lugar_residencia"
  >;
  informe: Pick<
    IncidenciaFiscal,
    | "created_at"
    | "motivo_informe"
    | "posicion_juego"
    | "asociacion_jugador"
    | "descripcion"
    | "motivo"
    | "categoria_anterior"
    | "categoria_nueva"
  >;
  fiscalNombre: string;
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { torneo, jugador, informe, fiscalNombre } = opts;

  const fechaHora = informe.created_at
    ? new Date(informe.created_at).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setFillColor(...LIME);
  doc.rect(0, 30, pageWidth, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("INFORME PRELIMINAR DE FISCAL", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(186, 198, 214);
  doc.text("PADEL NEXUS  ·  Uso interno — Colegio de Fiscales", 14, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text((torneo.nombre || "TORNEO").toUpperCase(), 14, 27);

  let y = 40;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Datos del informe", 14, y);
  y += 7;

  const rows: [string, string][] = [
    ["Fecha / Hora", fechaHora],
    ["Torneo", torneo.nombre || "—"],
    ["Sede", nombreSedeFiscal(torneo)],
    ["Fecha competencia", formatFechaCalendario(torneo.fecha) || "—"],
    ["Fiscal actuante", fiscalNombre],
    [
      "Jugador",
      [jugador.apellido, jugador.nombre].filter(Boolean).join(", ") || "—",
    ],
    ["DNI", jugador.dni || "—"],
    [
      "Asociación / Agrupación",
      informe.asociacion_jugador ||
        jugador.asociacion_o_club ||
        jugador.lugar_residencia ||
        "—",
    ],
    ["Posición de juego", labelPosicion(informe.posicion_juego)],
    [
      "Motivo",
      informe.motivo_informe
        ? MOTIVOS_INFORME_LABELS[informe.motivo_informe]
        : "—",
    ],
    ["Traza / auditoría", informe.motivo || "—"],
    ["Categoría actual", informe.categoria_anterior || jugador.categoria_padel || "—"],
  ];

  if (informe.categoria_nueva) {
    rows.push(["Categoría sugerida", informe.categoria_nueva]);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const [label, value] of rows) {
    doc.setTextColor(...SLATE);
    doc.text(label, 14, y);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(String(value), pageWidth - 70);
    doc.text(lines, 60, y);
    y += Math.max(6, lines.length * 5);
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Observaciones", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const body = doc.splitTextToSize(informe.descripcion || "—", pageWidth - 28);
  doc.text(body, 14, y);
  y += body.length * 5 + 10;

  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    "Documento interno. No se comunica al jugador durante la competencia. Destinado al Fiscal General / autoridad actuante.",
    14,
    Math.min(y, 280),
  );

  const apellido = (jugador.apellido || "jugador").replace(/\s+/g, "_");
  doc.save(`informe_preliminar_${apellido}_${Date.now()}.pdf`);
}
