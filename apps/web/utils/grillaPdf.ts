import jsPDF from "jspdf";
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
  const BRACKET_LINE_COLOR = [148, 163, 184]; // Slate 400

  // Helper para formatear nombres limpios (sin sufijo extra)
  const formatNames = (j1?: string | null, j2?: string | null) => {
    const list = [j1, j2].filter((n) => n && n !== "-" && n !== "Libre");
    return list.length > 0 ? list.join(" / ") : "A definir";
  };

  // Helper para formatear Fecha y Hora
  const formatMatchDateTimeStr = (fechaIso?: string | null) => {
    if (!fechaIso) return "";
    try {
      const d = new Date(fechaIso);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dayName = d.toLocaleDateString("es-AR", { weekday: "short" });
      const capDay =
        dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
      const hh = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${capDay} ${dd}/${mm} · ${hh}:${mins} hs`;
    } catch {
      return "";
    }
  };

  // Helper para acortar string de cancha y evitar encimado con la ronda
  const formatCanchaShort = (canchaName?: string | null) => {
    if (!canchaName) return "Cancha Principal";
    if (canchaName.includes(" - ")) {
      const parts = canchaName.split(" - ");
      return parts[parts.length - 1];
    }
    return canchaName.length > 18 ? canchaName.slice(0, 18) + "..." : canchaName;
  };

  // --- ENCABEZADO PRINCIPAL DE PADEL NEXUS ---
  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(
    `PADEL NEXUS  —  ${(torneo.nombre || "TORNEO").toUpperCase()}`,
    14,
    14,
  );

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(
    `Categoría: ${torneo.categoria || "Libres"}  |  Modalidad: ${torneo.modalidad || "Parejas"}  |  Impreso: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`,
    14,
    22,
  );

  let currentY = 34;

  // --- TARJETA DE CAMPEÓN DEL TORNEO (SI EL TORNEO FINALIZÓ) ---
  const finalMatch = partidos.find(
    (p) =>
      (p.ronda || "").toUpperCase().includes("FINAL") &&
      p.ganador !== null &&
      !p.ronda.toUpperCase().includes("CUARTOS") &&
      !p.ronda.toUpperCase().includes("SEMIS"),
  );

  if (finalMatch && finalMatch.ganador) {
    const isGanadorA = finalMatch.ganador === finalMatch.equipo_a_id;
    const championName = isGanadorA
      ? formatNames(finalMatch.equipo_a_j1, finalMatch.equipo_a_j2)
      : formatNames(finalMatch.equipo_b_j1, finalMatch.equipo_b_j2);
    const runnerUpName = isGanadorA
      ? formatNames(finalMatch.equipo_b_j1, finalMatch.equipo_b_j2)
      : formatNames(finalMatch.equipo_a_j1, finalMatch.equipo_a_j2);

    const s1A = finalMatch.set1_a ?? (finalMatch as any).set1_a;
    const s1B = finalMatch.set1_b ?? (finalMatch as any).set1_b;
    const s2A = (finalMatch as any).set2_a;
    const s2B = (finalMatch as any).set2_b;
    const s3A = (finalMatch as any).set3_a;
    const s3B = (finalMatch as any).set3_b;

    const setsStr = [
      s1A !== null && s1B !== null ? `${s1A}-${s1B}` : null,
      s2A !== null && s2B !== null ? `${s2A}-${s2B}` : null,
      s3A !== null && s3B !== null ? `${s3A}-${s3B}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    doc.setFillColor(254, 240, 138); // Soft Gold
    doc.setDrawColor(202, 138, 4); // Dark Gold
    doc.setLineWidth(0.5);
    doc.roundedRect(14, currentY, pageWidth - 28, 18, 3, 3, "FD");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(161, 98, 7);
    doc.text(`CAMPEÓN DEL TORNEO: ${championName.toUpperCase()}`, 18, currentY + 7);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(
      `Subcampeón: ${runnerUpName}   |   Resultado Final: ${setsStr || "Victoria"}`,
      18,
      currentY + 13,
    );

    currentY += 24;
  }

  // --- SECCIÓN 1: DETALLE INDIVIDUAL DE PARTIDOS (RANKEDIN STYLE) ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.text("RESULTADOS Y DETALLE DE PARTIDOS", 14, currentY);
  currentY += 6;

  const marginX = 14;
  const colGap = 6;
  const cardWidth = (pageWidth - marginX * 2 - colGap) / 2;
  const cardHeight = 34;

  partidos.forEach((p, idx) => {
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

    // Cabecera Tarjeta (Ronda a la izquierda, Cancha + Fecha/Hora a la derecha sin solaparse)
    doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
    doc.roundedRect(x, y, cardWidth, 6, 2, 2, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.text((p.ronda || "RONDA").toUpperCase(), x + 3, y + 4.2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    const fechaHoraStr = formatMatchDateTimeStr(p.fecha_partido);
    const infoCancha = `${formatCanchaShort(p.cancha_asignada)}${fechaHoraStr ? ` · ${fechaHoraStr}` : ""}`;
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
    doc.text(nameA, x + 3, yRowA + 7, { maxWidth: cardWidth - 32 });

    // Sets Equipo A
    const xScore = x + cardWidth - 28;
    if (s1A !== null) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(String(s1A), xScore + 2, yRowA + 7, { align: "center" });
    }
    if (s2A !== null) {
      doc.text(String(s2A), xScore + 11, yRowA + 7, { align: "center" });
    }
    if (s3A !== null) {
      doc.text(String(s3A), xScore + 20, yRowA + 7, { align: "center" });
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
    doc.text(nameB, x + 3, yRowB + 7, { maxWidth: cardWidth - 32 });

    // Sets Equipo B
    if (s1B !== null) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(String(s1B), xScore + 2, yRowB + 7, { align: "center" });
    }
    if (s2B !== null) {
      doc.text(String(s2B), xScore + 11, yRowB + 7, { align: "center" });
    }
    if (s3B !== null) {
      doc.text(String(s3B), xScore + 20, yRowB + 7, { align: "center" });
    }

    if (colIndex === 1 || idx === partidos.length - 1) {
      currentY += cardHeight + 5;
    }
  });

  // --- SECCIÓN 2: ESQUEMA VISUAL DE CUADRO Y PROGRESIÓN DE LLAVES ---
  if (currentY + 80 > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 8;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.text("ESQUEMA DE CUADRO Y PROGRESIÓN DE LLAVES", 14, currentY);
  currentY += 8;

  // Rondas en orden cronológico
  const rondasOrdenadas = ["CUARTOS", "SEMIS", "FINAL"];
  const rondasDisponibles = rondasOrdenadas.filter((r) =>
    partidos.some((p) => (p.ronda || "").toUpperCase().includes(r)),
  );

  const rondasAMostrar =
    rondasDisponibles.length > 0
      ? rondasDisponibles
      : Array.from(new Set(partidos.map((p) => (p.ronda || "Partidos").toUpperCase())));

  const numCols = rondasAMostrar.length;
  const bracketGapX = 14; // Espacio para las líneas ortogonales
  const bColWidth =
    (pageWidth - marginX * 2 - (numCols - 1) * bracketGapX) / numCols;
  const boxHeight = 22;

  // Mapa para guardar las posiciones (Y) de cada partido de la llave
  const roundMatchCoords = new Map<
    string,
    { id: string; x: number; y: number; width: number; height: number; midY: number }
  >();

  // Calculamos la disposición vertical balanceada para cada ronda
  // 1. Primera ronda (Cuartos / Semis según disponibilidad)
  const firstRoundName = rondasAMostrar[0];
  const firstMatches = partidos.filter((p) =>
    (p.ronda || "").toUpperCase().includes(firstRoundName),
  );

  let currentRoundY = currentY + 10;
  firstMatches.forEach((p, idx) => {
    const rx = marginX;
    const ry = currentRoundY + idx * (boxHeight + 14);
    roundMatchCoords.set(p.id, {
      id: p.id,
      x: rx,
      y: ry,
      width: bColWidth,
      height: boxHeight,
      midY: ry + boxHeight / 2,
    });
  });

  // 2. Rondas subsiguientes (Centradas verticalmente entre sus partidos previos)
  for (let rIdx = 1; rIdx < rondasAMostrar.length; rIdx++) {
    const prevRoundName = rondasAMostrar[rIdx - 1];
    const currentRoundName = rondasAMostrar[rIdx];

    const prevMatches = partidos.filter((p) =>
      (p.ronda || "").toUpperCase().includes(prevRoundName),
    );
    const currMatches = partidos.filter((p) =>
      (p.ronda || "").toUpperCase().includes(currentRoundName),
    );

    const rx = marginX + rIdx * (bColWidth + bracketGapX);

    currMatches.forEach((p, idx) => {
      const match1 = prevMatches[idx * 2];
      const match2 = prevMatches[idx * 2 + 1];

      const c1 = match1 ? roundMatchCoords.get(match1.id) : null;
      const c2 = match2 ? roundMatchCoords.get(match2.id) : null;

      let ry = currentY + 10 + idx * (boxHeight + 20);
      if (c1 && c2) {
        const midPointY = (c1.midY + c2.midY) / 2;
        ry = midPointY - boxHeight / 2;
      } else if (c1) {
        ry = c1.y;
      }

      roundMatchCoords.set(p.id, {
        id: p.id,
        x: rx,
        y: ry,
        width: bColWidth,
        height: boxHeight,
        midY: ry + boxHeight / 2,
      });
    });
  }

  // Renderizado de Cajas y Textos de los Partidos en la Llave
  rondasAMostrar.forEach((ronda, rIdx) => {
    const rx = marginX + rIdx * (bColWidth + bracketGapX);
    const partidosRonda = partidos.filter((p) =>
      (p.ronda || "").toUpperCase().includes(ronda),
    );

    // Titulo Ronda
    doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
    doc.rect(rx, currentY, bColWidth, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(ronda, rx + bColWidth / 2, currentY + 4.2, { align: "center" });

    partidosRonda.forEach((p) => {
      const coords = roundMatchCoords.get(p.id);
      if (!coords) return;

      const { x: bX, y: bY } = coords;

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

      // Caja Partido
      doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
      doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(bX, bY, bColWidth, boxHeight, 1.5, 1.5, "FD");

      // Fecha y hora sutil arriba
      const dtStr = formatMatchDateTimeStr(p.fecha_partido);
      if (dtStr) {
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);
        doc.text(dtStr, bX + bColWidth - 2, bY + 3.8, { align: "right" });
      }

      // Fila A
      const yA = bY + 5;
      if (isGanadorA) {
        doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
        doc.rect(bX + 0.5, yA, bColWidth - 1, 7.5, "F");
      }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", isGanadorA ? "bold" : "normal");
      doc.setTextColor(
        isGanadorA ? WINNER_TEXT[0] : 40,
        isGanadorA ? WINNER_TEXT[1] : 40,
        isGanadorA ? WINNER_TEXT[2] : 40,
      );
      doc.text(nameA, bX + 3, yA + 5.5, { maxWidth: bColWidth - 18 });

      // Sets A alineados
      const xSetScore = bX + bColWidth - 16;
      if (s1A !== null) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(String(s1A), xSetScore, yA + 5.5, { align: "center" });
      }
      if (s2A !== null) {
        doc.text(String(s2A), xSetScore + 5, yA + 5.5, { align: "center" });
      }
      if (s3A !== null) {
        doc.text(String(s3A), xSetScore + 10, yA + 5.5, { align: "center" });
      }

      // Divider interno
      doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
      doc.line(bX + 1, bY + 13, bX + bColWidth - 1, bY + 13);

      // Fila B
      const yB = bY + 13.5;
      if (isGanadorB) {
        doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
        doc.rect(bX + 0.5, yB, bColWidth - 1, 7.5, "F");
      }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", isGanadorB ? "bold" : "normal");
      doc.setTextColor(
        isGanadorB ? WINNER_TEXT[0] : 40,
        isGanadorB ? WINNER_TEXT[1] : 40,
        isGanadorB ? WINNER_TEXT[2] : 40,
      );
      doc.text(nameB, bX + 3, yB + 5.5, { maxWidth: bColWidth - 18 });

      // Sets B alineados
      if (s1B !== null) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(String(s1B), xSetScore, yB + 5.5, { align: "center" });
      }
      if (s2B !== null) {
        doc.text(String(s2B), xSetScore + 5, yB + 5.5, { align: "center" });
      }
      if (s3B !== null) {
        doc.text(String(s3B), xSetScore + 10, yB + 5.5, { align: "center" });
      }
    });
  });

  // --- DIBUJO DE LÍNEAS CONECTORAS DE LA LLAVE (LÍNEAS ORTOGONALES A 90 GRADOS) ---
  doc.setDrawColor(BRACKET_LINE_COLOR[0], BRACKET_LINE_COLOR[1], BRACKET_LINE_COLOR[2]);
  doc.setLineWidth(0.4);

  for (let rIdx = 0; rIdx < rondasAMostrar.length - 1; rIdx++) {
    const currentRoundName = rondasAMostrar[rIdx];
    const nextRoundName = rondasAMostrar[rIdx + 1];

    const currentMatches = partidos.filter((p) =>
      (p.ronda || "").toUpperCase().includes(currentRoundName),
    );
    const nextMatches = partidos.filter((p) =>
      (p.ronda || "").toUpperCase().includes(nextRoundName),
    );

    for (let i = 0; i < currentMatches.length; i += 2) {
      const match1 = currentMatches[i];
      const match2 = currentMatches[i + 1];
      const nextMatch = nextMatches[Math.floor(i / 2)];

      const c1 = match1 ? roundMatchCoords.get(match1.id) : null;
      const c2 = match2 ? roundMatchCoords.get(match2.id) : null;
      const cNext = nextMatch ? roundMatchCoords.get(nextMatch.id) : null;

      if (c1 && cNext) {
        const xRight1 = c1.x + c1.width;
        const midX = xRight1 + bracketGapX / 2;

        if (c2) {
          const xRight2 = c2.x + c2.width;
          const y1 = c1.midY;
          const y2 = c2.midY;
          const yMidNext = cNext.midY;

          // 1. Salidas horizontales desde cada partido previo a la mitad del espacio
          doc.line(xRight1, y1, midX, y1);
          doc.line(xRight2, y2, midX, y2);
          // 2. Línea vertical perfecta uniendo ambas salidas
          doc.line(midX, y1, midX, y2);
          // 3. Línea horizontal directa al centro del partido de la siguiente ronda
          doc.line(midX, yMidNext, cNext.x, cNext.midY);
        } else {
          // Salida directa si es partido único o BYE
          doc.line(xRight1, c1.midY, cNext.x, cNext.midY);
        }
      }
    }
  }

  // Guardar archivo PDF
  const cleanNombre = torneo.nombre ? torneo.nombre.replace(/\s+/g, "_") : "Padel_Nexus";
  doc.save(`Informe_Torneo_${cleanNombre}.pdf`);
}
