import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Partido } from "@/utils/types";
import type { IncidenciaFiscal, ParejaFiscal, ReporteFiscal } from "@/utils/services/fiscal-panel";
import { nombreSedeFiscal } from "@/utils/services/fiscal-panel";
import { esModalidadIndividual, formatFechaCalendario, nombreJugadorVisible } from "@/utils/formatFecha";
import {
  agruparPartidosPorRonda,
  etiquetaCanchaAsignada,
  etiquetaCruce,
  partidosDefinidosOrdenados,
} from "@/utils/fiscalPartidos";

const NAVY: [number, number, number] = [15, 23, 42];
const LIME: [number, number, number] = [163, 230, 53];
const SLATE: [number, number, number] = [71, 85, 105];
const LINE: [number, number, number] = [226, 232, 240];
const ROW: [number, number, number] = [248, 250, 252];

function formatFechaHora(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function labelTipo(tipo: IncidenciaFiscal["tipo"]): string {
  switch (tipo) {
    case "incidencia":
      return "Incidencia";
    case "sancion":
      return "Sanción";
    case "descalificacion":
      return "Descalificación";
    case "cambio_categoria":
      return "Cambio de categoría";
    case "informe_preliminar":
      return "Informe preliminar";
    default:
      return tipo;
  }
}

function esCompanero(
  j: ParejaFiscal["jugador2"],
): j is NonNullable<ParejaFiscal["jugador2"]> {
  if (!j) return false;
  return Boolean(
    j.id ||
      j.dni ||
      nombreJugadorVisible(j.nombre_completo) ||
      nombreJugadorVisible(j.nombre),
  );
}

export function generarActaFiscalPdf(reporte: ReporteFiscal) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const individual = esModalidadIndividual(reporte.torneo.modalidad);
  const sede = nombreSedeFiscal(reporte.torneo);
  const partidos = partidosDefinidosOrdenados(reporte.partidos || []);
  const grupos = agruparPartidosPorRonda(reporte.partidos || []);

  const fiscalNombre = reporte.fiscal
    ? `${reporte.fiscal.apellido}, ${reporte.fiscal.nombre}`
    : "Sin ficha";
  const rol =
    reporte.torneo.rol_torneo === "general" ? "Fiscal general" : "Fiscal auxiliar";

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setFillColor(...LIME);
  doc.rect(0, 32, pageWidth, 1.6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ACTA DE FISCAL", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(186, 198, 214);
  doc.text("PADEL NEXUS  ·  Colegio de Fiscales", 14, 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text((reporte.torneo.nombre || "TORNEO").toUpperCase(), 14, 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(186, 198, 214);
  const meta = [
    formatFechaCalendario(reporte.torneo.fecha),
    sede,
    reporte.torneo.estado || "",
    individual ? "Individual" : "Duplas",
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(meta, pageWidth - 14, 27, { align: "right" });

  let y = 40;
  doc.setFillColor(...ROW);
  doc.setDrawColor(...LINE);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, "FD");

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text("AUTORIDAD ACTUANTE", 18, y + 6);
  doc.setTextColor(...NAVY);
  doc.setFontSize(11);
  doc.text(fiscalNombre, 18, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(
    `DNI ${reporte.fiscal?.dni || "—"}  ·  Alcance ${reporte.fiscal?.rango || "—"}  ·  ${rol}`,
    18,
    y + 18,
  );
  doc.text(`Emitido ${formatFechaHora(reporte.generado_en)}`, pageWidth - 18, y + 12, {
    align: "right",
  });

  y += 30;

  const drawSection = (title: string, subtitle?: string) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 16;
    }
    doc.setFillColor(...NAVY);
    doc.rect(14, y, pageWidth - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), 17, y + 5.4);
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.text(subtitle, pageWidth - 17, y + 5.4, { align: "right" });
    }
    y += 8;
  };

  drawSection(
    "Partidos definidos",
    `${partidos.length} cruce${partidos.length === 1 ? "" : "s"}  ·  sin pendientes`,
  );

  if (partidos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text("No hay partidos con ambos lados definidos.", 16, y + 6);
    y += 14;
  } else {
    grupos.forEach((grupo) => {
      autoTable(doc, {
        startY: y,
        margin: { left: 14, right: 14 },
        head: [
          [
            grupo.label.toUpperCase(),
            individual ? "Jugadores" : "Parejas",
            "Cancha",
            "Horario",
            "Estado",
          ],
        ],
        body: grupo.partidos.map((p: Partido) => [
          p.orden ? `#${p.orden}` : "—",
          `${etiquetaCruce(p.equipo_a_j1, p.equipo_a_j2)}  vs  ${etiquetaCruce(p.equipo_b_j1, p.equipo_b_j2)}`,
          etiquetaCanchaAsignada(p.cancha_asignada),
          formatFechaHora(p.fecha_partido),
          p.estado_partido || "Programado",
        ]),
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: 2.2,
          textColor: NAVY,
          lineColor: LINE,
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: SLATE,
          fontStyle: "bold",
          fontSize: 7,
        },
        alternateRowStyles: { fillColor: ROW },
        columnStyles: {
          0: { cellWidth: 16 },
          2: { cellWidth: 42 },
          3: { cellWidth: 28 },
          4: { cellWidth: 22 },
        },
      });
      y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 5;
    });
  }

  const jugadoresRows: string[][] = [];
  (reporte.jugadores || []).forEach((par: ParejaFiscal, idx: number) => {
    const pushJ = (j: ParejaFiscal["jugador1"], extra: string) => {
      if (!j) return;
      jugadoresRows.push([
        individual ? String(idx + 1) : extra,
        j.nombre_completo || "—",
        j.dni || "—",
        j.categoria_padel || "—",
        j.licencia?.estado || "Sin carnet",
        j.licencia?.nro_licencia || "—",
      ]);
    };
    if (individual) {
      pushJ(par.jugador1, "");
    } else {
      pushJ(par.jugador1, `P${idx + 1} · J1`);
      if (esCompanero(par.jugador2)) pushJ(par.jugador2, `P${idx + 1} · J2`);
    }
  });

  drawSection(
    individual ? "Jugadores" : "Parejas / jugadores",
    `${jugadoresRows.length} ficha${jugadoresRows.length === 1 ? "" : "s"}  ·  DNI y carnet`,
  );

  if (jugadoresRows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text("No hay inscripciones.", 16, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [[individual ? "#" : "Rol", "Nombre", "DNI", "Cat.", "Carnet", "N°"]],
      body: jugadoresRows,
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: 2.2,
        textColor: NAVY,
        lineColor: LINE,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: ROW },
      columnStyles: {
        0: { cellWidth: individual ? 10 : 22 },
        2: { cellWidth: 26 },
        3: { cellWidth: 16 },
        4: { cellWidth: 24 },
        5: { cellWidth: 28 },
      },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;
  }

  const incidencias: IncidenciaFiscal[] = reporte.incidencias || [];
  drawSection("Incidencias y sanciones", `${incidencias.length} registro${incidencias.length === 1 ? "" : "s"}`);

  if (incidencias.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text("Sin registros en el acta.", 16, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Tipo", "Estado", "Jugador", "Hecho / motivo", "Fecha"]],
      body: incidencias.map((inc) => {
        const jugador = inc.perfiles
          ? `${inc.perfiles.apellido}, ${inc.perfiles.nombre}`
          : "—";
        return [
          labelTipo(inc.tipo),
          inc.estado,
          `${jugador}${inc.perfiles?.dni ? `\nDNI ${inc.perfiles.dni}` : ""}`,
          `${inc.descripcion}\nMotivo: ${inc.motivo}`,
          formatFechaHora(inc.created_at),
        ];
      }),
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: 2.4,
        textColor: NAVY,
        lineColor: LINE,
        lineWidth: 0.2,
        valign: "top",
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: ROW },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 36 },
        4: { cellWidth: 28 },
      },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 10;
  }

  if (y > pageHeight - 22) {
    doc.addPage();
    y = 16;
  }
  doc.setDrawColor(...LINE);
  doc.line(14, y, pageWidth - 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text(
    "Documento de trabajo del fiscal. Las sanciones y descalificaciones quedan registradas en acta; el efecto competitivo se confirma con la federación.",
    14,
    y,
    { maxWidth: pageWidth - 28 },
  );
  y += 8;
  doc.text("Firma y aclaración: ________________________________", 14, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: "right" },
    );
  }

  const slug = (reporte.torneo.nombre || "torneo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`acta-fiscal-${slug}.pdf`);
}
