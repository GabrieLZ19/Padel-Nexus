import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Partido, Torneo } from "@/utils/types";

export function generarPdfGrillaPartidos(
  torneo: Partial<Torneo>,
  partidos: Partido[],
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- PALETA DE COLORES ---
  const PRIMARY_DARK = [15, 23, 42]; // Slate 900
  const BRAND_ACCENT = [163, 230, 53]; // Chartreuse / Lime
  const CARD_BG = [248, 250, 252]; // Slate 50
  const CARD_BORDER = [226, 232, 240]; // Slate 200
  const WINNER_BG = [236, 252, 203]; // Lime 100
  const WINNER_TEXT = [77, 124, 15]; // Lime 700

  // Helper para formatear nombres limpios
  const formatNames = (j1?: string | null, j2?: string | null) => {
    const list = [j1, j2].filter((n) => n && n !== "-" && n !== "Libre");
    return list.length > 0 ? list.join(" / ") : "A definir";
  };

  // --- ENCABEZADO PRINCIPAL ---
  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(
    `PADEL NEXUS  —  ${(torneo.nombre || "TORNEO").toUpperCase()}`,
    14,
    14,
  );

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(
    `Categoría: ${torneo.categoria || "Libres"}  |  Alcance: ${torneo.alcance || "Nacional"}  |  Impreso: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`,
    14,
    22,
  );

  let currentY = 36;

  // --- SECCIÓN 1: TARJETAS DE PARTIDOS (MATCH CARDS RANKEDIN STYLE) ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.text("RESULTADOS Y DETALLE DE PARTIDOS", 14, currentY);
  currentY += 6;

  const marginX = 14;
  const colGap = 6;
  const cardWidth = (pageWidth - marginX * 2 - colGap) / 2; // 2 tarjetas por fila
  const cardHeight = 34;

  partidos.forEach((p, idx) => {
    // Si sobrepasa la página, añadir nueva página
    if (currentY + cardHeight > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }

    const colIndex = idx % 2;
    const x = marginX + colIndex * (cardWidth + colGap);
    const y = currentY;

    const isGanadorA = p.ganador && p.ganador === p.equipo_a_id;
    const isGanadorB = p.ganador && p.ganador === p.equipo_b_id;

    const nameA = formatNames(p.equipo_a_j1, p.equipo_a_j2);
    const nameB = formatNames(p.equipo_b_j1, p.equipo_b_j2);

    const s1A = p.set1_a ?? (p as any).set1_a ?? null;
    const s1B = p.set1_b ?? (p as any).set1_b ?? null;
    const s2A = (p as any).set2_a ?? null;
    const s2B = (p as any).set2_b ?? null;
    const s3A = (p as any).set3_a ?? null;
    const s3B = (p as any).set3_b ?? null;

    // Fondo Tarjeta
    doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
    doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

    // Cabecera Tarjeta (Ronda y Cancha)
    doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
    doc.roundedRect(x, y, cardWidth, 6, 2, 2, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.text((p.ronda || "RONDA").toUpperCase(), x + 3, y + 4.2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    const infoCancha = `${p.cancha_asignada || "Cancha Principal"} ${p.fecha_partido ? `- ${new Date(p.fecha_partido).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs` : ""}`;
    doc.text(infoCancha, x + cardWidth - 3, y + 4.2, { align: "right" });

    // Fila Equipo A
    const yRowA = y + 8;
    if (isGanadorA) {
      doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
      doc.rect(x + 1, yRowA, cardWidth - 2, 11, "F");
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", isGanadorA ? "bold" : "normal");
    doc.setTextColor(
      isGanadorA ? WINNER_TEXT[0] : 30,
      isGanadorA ? WINNER_TEXT[1] : 30,
      isGanadorA ? WINNER_TEXT[2] : 30,
    );
    const labelA = `${nameA} ${isGanadorA ? " (GANADOR)" : ""}`;
    doc.text(labelA, x + 3, yRowA + 7, { maxWidth: cardWidth - 35 });

    // Sets Equipo A
    const xScore = x + cardWidth - 32;
    if (s1A !== null) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(String(s1A), xScore + 4, yRowA + 7, { align: "center" });
    }
    if (s2A !== null) {
      doc.text(String(s2A), xScore + 14, yRowA + 7, { align: "center" });
    }
    if (s3A !== null) {
      doc.text(String(s3A), xScore + 24, yRowA + 7, { align: "center" });
    }

    // Línea divisoria interna
    doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
    doc.line(x + 2, y + 20, x + cardWidth - 2, y + 20);

    // Fila Equipo B
    const yRowB = y + 21;
    if (isGanadorB) {
      doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
      doc.rect(x + 1, yRowB, cardWidth - 2, 11, "F");
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", isGanadorB ? "bold" : "normal");
    doc.setTextColor(
      isGanadorB ? WINNER_TEXT[0] : 30,
      isGanadorB ? WINNER_TEXT[1] : 30,
      isGanadorB ? WINNER_TEXT[2] : 30,
    );
    const labelB = `${nameB} ${isGanadorB ? " (GANADOR)" : ""}`;
    doc.text(labelB, x + 3, yRowB + 7, { maxWidth: cardWidth - 35 });

    // Sets Equipo B
    if (s1B !== null) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(String(s1B), xScore + 4, yRowB + 7, { align: "center" });
    }
    if (s2B !== null) {
      doc.text(String(s2B), xScore + 14, yRowB + 7, { align: "center" });
    }
    if (s3B !== null) {
      doc.text(String(s3B), xScore + 24, yRowB + 7, { align: "center" });
    }

    if (colIndex === 1 || idx === partidos.length - 1) {
      currentY += cardHeight + 5;
    }
  });

  // --- SECCIÓN 2: ESQUEMA DE LLAVES DE ELIMINATORIA (BRACKET SUMMARY) ---
  if (currentY + 60 > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 8;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.text("ESQUEMA DE CUADRO Y PROGRESIÓN DE LLAVES", 14, currentY);
  currentY += 8;

  // Agrupar partidos por rondas
  const rondasOrdenadas = ["CUARTOS", "SEMIS", "FINAL"];
  const rondasDisponibles = rondasOrdenadas.filter((r) =>
    partidos.some((p) => (p.ronda || "").toUpperCase().includes(r)),
  );

  const rondasAMostrar =
    rondasDisponibles.length > 0
      ? rondasDisponibles
      : Array.from(new Set(partidos.map((p) => p.ronda || "Partidos")));

  const numCols = rondasAMostrar.length;
  const bColWidth = (pageWidth - marginX * 2) / numCols;

  rondasAMostrar.forEach((ronda, rIdx) => {
    const rx = marginX + rIdx * bColWidth;
    const partidosRonda = partidos.filter((p) =>
      (p.ronda || "").toUpperCase().includes(ronda),
    );

    // Titulo Ronda
    doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
    doc.rect(rx + 2, currentY, bColWidth - 4, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(ronda, rx + bColWidth / 2, currentY + 4.2, { align: "center" });

    let bY = currentY + 10;
    partidosRonda.forEach((p) => {
      const isGanadorA = p.ganador && p.ganador === p.equipo_a_id;
      const isGanadorB = p.ganador && p.ganador === p.equipo_b_id;

      const nameA = formatNames(p.equipo_a_j1, p.equipo_a_j2);
      const nameB = formatNames(p.equipo_b_j1, p.equipo_b_j2);

      const resText =
        p.set1_a !== null && p.set1_b !== null
          ? `${p.set1_a}-${p.set1_b}${p.set2_a !== null ? ` ${p.set2_a}-${p.set2_b}` : ""}${p.set3_a !== null ? ` ${p.set3_a}-${p.set3_b}` : ""}`
          : "";

      doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
      doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
      doc.roundedRect(rx + 2, bY, bColWidth - 4, 16, 1, 1, "FD");

      // Pareja A
      doc.setFontSize(7);
      doc.setFont("helvetica", isGanadorA ? "bold" : "normal");
      doc.setTextColor(isGanadorA ? WINNER_TEXT[0] : 40, isGanadorA ? WINNER_TEXT[1] : 40, isGanadorA ? WINNER_TEXT[2] : 40);
      doc.text(nameA, rx + 4, bY + 5, { maxWidth: bColWidth - 8 });

      // Pareja B
      doc.setFont("helvetica", isGanadorB ? "bold" : "normal");
      doc.setTextColor(isGanadorB ? WINNER_TEXT[0] : 40, isGanadorB ? WINNER_TEXT[1] : 40, isGanadorB ? WINNER_TEXT[2] : 40);
      doc.text(nameB, rx + 4, bY + 10, { maxWidth: bColWidth - 8 });

      // Resultado resumido abajo
      if (resText) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(resText, rx + bColWidth - 5, bY + 14.5, { align: "right" });
      }

      bY += 20;
    });
  });

  doc.save(
    `Informe_Torneo_${torneo.nombre ? torneo.nombre.replace(/\s+/g, "_") : "Padel_Nexus"}.pdf`,
  );
}
