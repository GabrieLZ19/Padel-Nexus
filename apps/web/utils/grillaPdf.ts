import jsPDF from "jspdf";
import { esModalidadIndividual } from "@/utils/formatFecha";
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
    `INFORME DE RESULTADOS  —  ${(torneo.nombre || "TORNEO").toUpperCase()}`,
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
  doc.save(`Informe_Resultados_${cleanNombre}.pdf`);
}

/**
 * Grilla de Partidos | Coordinadores / Auxiliares de Cancha.
 * Formato tabular (estilo planillero): cada partido en dos filas
 * (P1/P2), con resultado por set y firma de cada pareja.
 */
export function generarPdfHojaRuta(
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
  const PRIMARY_DARK = [15, 23, 42] as const;
  const BRAND_ACCENT = [163, 230, 53] as const;
  const SLATE_100 = [241, 245, 249] as const;
  const SLATE_200 = [226, 232, 240] as const;
  const SLATE_500 = [100, 116, 139] as const;
  const isIndividual = esModalidadIndividual(torneo.modalidad);

  const shortName = (full?: string | null) => {
    if (!full || full === "-" || full === "Libre") return "—";
    const cleaned = full.trim();
    const idx = cleaned.indexOf(",");
    if (idx === -1) {
      const parts = cleaned.split(/\s+/);
      const ap = (parts[0] || "—").toUpperCase();
      const nom = parts.slice(1).join(" ");
      return nom ? `${ap}, ${nom}` : ap;
    }
    const ap = cleaned.slice(0, idx).trim().toUpperCase();
    const nom = cleaned.slice(idx + 1).trim();
    return nom ? `${ap}, ${nom}` : ap;
  };

  const sideLabel = (j1?: string | null, j2?: string | null) => {
    if (isIndividual) return shortName(j1);
    const a = shortName(j1);
    const b = shortName(j2);
    if (a === "—" && b === "—") return "A definir";
    if (b === "—") return a;
    return `${a} / ${b}`;
  };

  const formatDateTime = (fechaIso?: string | null) => {
    if (!fechaIso) return "Sin horario";
    try {
      const d = new Date(fechaIso);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      const dayName = d.toLocaleDateString("es-AR", { weekday: "short" });
      const capDay =
        dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
      return `${capDay} ${dd}/${mm} ${hh}:${mins}`;
    } catch {
      return "Sin horario";
    }
  };

  const matchCode = (p: Partido) =>
    p.orden != null
      ? String(p.orden).padStart(2, "0")
      : p.id && !p.id.startsWith("empty-")
        ? p.id.slice(0, 6).toUpperCase()
        : "—";

  const sorted = [...partidos]
    .filter((p) => p.equipo_a_id || p.equipo_b_id)
    .sort((a, b) => {
      const fa = a.fecha_partido
        ? new Date(a.fecha_partido).getTime()
        : Number.MAX_SAFE_INTEGER;
      const fb = b.fecha_partido
        ? new Date(b.fecha_partido).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (fa !== fb) return fa - fb;
      const ca = String(a.cancha_asignada || "");
      const cb = String(b.cancha_asignada || "");
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.orden ?? 0) - (b.orden ?? 0);
    });

  const fileSlug = torneo.nombre
    ? torneo.nombre.replace(/\s+/g, "_")
    : "Padel_Nexus";

  const detalleCompetencia = [
    (torneo.nombre || "TORNEO").toUpperCase(),
    isIndividual ? "Individual" : "Duplas",
    torneo.categoria || null,
    torneo.rama || null,
    torneo.lugar || null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const pairLines = (j1?: string | null, j2?: string | null): string[] => {
    if (isIndividual) return [sideLabel(j1, j2)];
    const a = shortName(j1);
    const b = shortName(j2);
    if (a === "—" && b === "—") return ["A definir"];
    if (b === "—") return [a];
    return [a, b];
  };

  const marginX = 12;
  const contentW = pageWidth - marginX * 2;
  const cols = {
    complejo: 30,
    pareja: 58,
    horario: 28,
    resultado: 42,
    firma: contentW - 30 - 58 - 28 - 42,
  };
  const boxW = 8;
  const boxGap = 3;
  const boxesTotal = boxW * 3 + boxGap * 2;

  const drawHeader = (startY: number) => {
    doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.rect(0, 28, pageWidth, 1.5, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.text("PADEL NEXUS", marginX, 8);
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("Grilla de Partidos | Auxiliares de Cancha", marginX, 14.5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.text(detalleCompetencia.slice(0, 90), marginX, 20.5);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(186, 198, 214);
    doc.text(
      `Impreso: ${new Date().toLocaleString("es-AR")}  ·  Games de cada set en la fila de cada pareja (ej. 6 / 3 / 6).`,
      marginX,
      25.5,
    );

    const y = startY;
    doc.setFillColor(SLATE_100[0], SLATE_100[1], SLATE_100[2]);
    doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentW, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);

    const parejaHeader = isIndividual ? "Jugador" : "Pareja";
    const headers: Array<[string, number]> = [
      ["Complejo", cols.complejo],
      [parejaHeader, cols.pareja],
      ["Dia / Hora", cols.horario],
      ["Resultado", cols.resultado],
      ["Firmas", cols.firma],
    ];
    let x = marginX;
    headers.forEach(([label, w]) => {
      if (label === "Resultado") {
        const boxStart = x + (w - boxesTotal) / 2;
        doc.text("Resultado", x + 2, y + 3.2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
        [0, 1, 2].forEach((i) => {
          const bx = boxStart + i * (boxW + boxGap);
          doc.text(`Set ${i + 1}`, bx + boxW / 2, y + 6.6, { align: "center" });
        });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
      } else {
        doc.text(label, x + 2, y + 5);
      }
      x += w;
    });
    return y + 8;
  };

  let y = drawHeader(32);

  if (sorted.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("No hay partidos asignados para imprimir.", marginX, y + 8);
    doc.save(`Grilla_Partidos_${fileSlug}.pdf`);
    return;
  }

  const subH = isIndividual ? 10 : 12;
  const rowH = subH * 2;
  const tagW = 8;

  const drawSetBoxes = (colX: number, rowY: number) => {
    const boxStart = colX + (cols.resultado - boxesTotal) / 2;
    const boxY = rowY + (subH - 7) / 2;
    [0, 1, 2].forEach((i) => {
      const bx = boxStart + i * (boxW + boxGap);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.setFillColor(255, 255, 255);
      doc.rect(bx, boxY, boxW, 7, "FD");
    });
  };

  const drawPairRow = (
    colX: number,
    rowY: number,
    tag: string,
    names: string[],
  ) => {
    doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
    doc.roundedRect(colX + 1.5, rowY + (subH - 5.2) / 2, tagW, 5.2, 0.8, 0.8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.text(tag, colX + 1.5 + tagW / 2, rowY + subH / 2 + 1.4, {
      align: "center",
    });

    const nameX = colX + tagW + 3.5;
    const nameW = cols.pareja - tagW - 6;
    doc.setTextColor(15, 23, 42);
    if (names.length === 1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(names[0], nameW);
      doc.text(lines.slice(0, 2), nameX, rowY + (subH === 10 ? 6.2 : 7));
      return;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(names[0].slice(0, 42), nameX, rowY + 4.6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text(names[1].slice(0, 42), nameX, rowY + 9.2);
  };

  for (const p of sorted) {
    if (y + rowH > pageHeight - 12) {
      doc.addPage();
      y = drawHeader(32);
    }

    const code = matchCode(p);
    const cancha = p.cancha_asignada || "Cancha s/d";
    const ronda = String(p.ronda || "Ronda").toUpperCase();
    const cat = torneo.categoria || "Libres";
    const namesA = pairLines(p.equipo_a_j1, p.equipo_a_j2);
    const namesB = pairLines(p.equipo_b_j1, p.equipo_b_j2);
    const horario = formatDateTime(p.fecha_partido);
    const tagA = isIndividual ? "J1" : "P1";
    const tagB = isIndividual ? "J2" : "P2";
    const midY = y + subH;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, contentW, rowH, "FD");

    let gx = marginX;
    const widths = [
      cols.complejo,
      cols.pareja,
      cols.horario,
      cols.resultado,
      cols.firma,
    ];
    for (let i = 0; i < widths.length - 1; i++) {
      gx += widths[i];
      doc.line(gx, y, gx, y + rowH);
    }

    const pairStartX = marginX + cols.complejo;
    doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
    doc.setLineWidth(0.25);
    doc.line(pairStartX, midY, marginX + contentW, midY);

    let cx = marginX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text(`#${code}`, cx + 2, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text(`${cat} · ${ronda}`.slice(0, 28), cx + 2, y + 10.2);
    doc.setFontSize(6);
    doc.setTextColor(51, 65, 85);
    const canchaLines = doc.splitTextToSize(cancha, cols.complejo - 4);
    doc.text(canchaLines.slice(0, 2), cx + 2, y + 14.4);

    cx += cols.complejo;
    drawPairRow(cx, y, tagA, namesA);
    drawPairRow(cx, midY, tagB, namesB);

    cx += cols.pareja;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(37, 99, 235);
    const horaLines = doc.splitTextToSize(horario, cols.horario - 4);
    const horaBlockH = horaLines.length * 3.4;
    doc.text(horaLines.slice(0, 3), cx + 2, y + (rowH - horaBlockH) / 2 + 3.2);

    cx += cols.horario;
    drawSetBoxes(cx, y);
    drawSetBoxes(cx, midY);

    cx += cols.resultado;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    const firmaPad = 2.5;
    doc.line(cx + firmaPad, y + subH - 3.2, cx + cols.firma - firmaPad, y + subH - 3.2);
    doc.line(
      cx + firmaPad,
      y + rowH - 3.2,
      cx + cols.firma - firmaPad,
      y + rowH - 3.2,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text(tagA, cx + firmaPad, y + 3.4);
    doc.text(tagB, cx + firmaPad, midY + 3.4);

    y += rowH;
  }

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Cada fila es una pareja: anotar games ganados por set (ej. P1: 6 3 6  /  P2: 3 6 4). Cruzar # con la carga del CRM.",
    marginX,
    pageHeight - 7,
  );

  doc.save(`Grilla_Partidos_${fileSlug}.pdf`);
}

export type ZonaPdfRow = {
  nombre: string;
  parejas: {
    id?: string;
    seed?: number | null;
    jugador1_nombre?: string | null;
    jugador2_nombre?: string | null;
    club?: string | null;
    cabezaDeSerie?: boolean;
  }[];
};

/** PDF de publicación de zonas (Reglamento FAP): composición + programación + posiciones. */
export function generarPdfZonas(
  torneo: Partial<Torneo>,
  zonas: ZonaPdfRow[],
  partidos: Partido[] = [],
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const PRIMARY_DARK = [15, 23, 42] as const;
  const BRAND_ACCENT = [163, 230, 53] as const;
  const SLATE_50 = [248, 250, 252] as const;
  const SLATE_100 = [241, 245, 249] as const;
  const SLATE_200 = [226, 232, 240] as const;
  const SLATE_500 = [100, 116, 139] as const;
  const WINNER_BG = [236, 252, 203] as const;
  const isIndividual = esModalidadIndividual(torneo.modalidad);
  const unidad = isIndividual ? "jugadores" : "parejas";

  const splitName = (full?: string | null) => {
    if (!full || full === "-" || full === "Libre") {
      return { apellido: "A definir", nombre: "" };
    }
    const cleaned = full.trim();
    const idxComma = cleaned.indexOf(",");
    if (idxComma === -1) {
      const parts = cleaned.split(/\s+/);
      return {
        apellido: parts[0] || "A definir",
        nombre: parts.slice(1).join(" "),
      };
    }
    return {
      apellido: cleaned.slice(0, idxComma).trim() || "A definir",
      nombre: cleaned.slice(idxComma + 1).trim(),
    };
  };

  const pairLabel = (j1?: string | null, j2?: string | null) => {
    const a = splitName(j1);
    if (isIndividual) {
      return {
        line1: `${a.apellido.toUpperCase()}${a.nombre ? `, ${a.nombre}` : ""}`,
        line2: "",
      };
    }
    const b = splitName(j2);
    return {
      line1: `${a.apellido.toUpperCase()}${a.nombre ? `, ${a.nombre}` : ""}`,
      line2: `${b.apellido.toUpperCase()}${b.nombre ? `, ${b.nombre}` : ""}`,
    };
  };

  const shortPair = (j1?: string | null, j2?: string | null) => {
    const a = splitName(j1).apellido.toUpperCase();
    if (isIndividual) return a;
    const b = splitName(j2).apellido.toUpperCase();
    return `${a} / ${b}`;
  };

  const formatProg = (fechaIso?: string | null) => {
    if (!fechaIso) return "Sin horario";
    try {
      const d = new Date(fechaIso);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${dd}/${mm} ${hh}:${mins}`;
    } catch {
      return "Sin horario";
    }
  };

  const normalizeRonda = (r?: string | null) =>
    String(r || "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();

  const isPlayoffRonda = (r: string) =>
    ["32AVOS", "16AVOS", "OCTAVOS", "CUARTOS", "SEMIS", "FINAL"].some(
      (x) => r === x || r.includes(x),
    );

  const byRondaSafe = (r: string, zn: string) =>
    r === zn || r.includes(zn) || zn.includes(r);

  const matchesZona = (zonaNombre: string, pairIds: Set<string>) => {
    const zn = normalizeRonda(zonaNombre);
    return partidos
      .filter((p) => {
        const r = normalizeRonda(p.ronda);
        if (isPlayoffRonda(r)) return false;
        const aIn = p.equipo_a_id ? pairIds.has(p.equipo_a_id) : false;
        const bIn = p.equipo_b_id ? pairIds.has(p.equipo_b_id) : false;
        if (pairIds.size > 0 && aIn && bIn) return true;
        return byRondaSafe(r, zn);
      })
      .sort((a, b) => {
        const fa = a.fecha_partido
          ? new Date(a.fecha_partido).getTime()
          : Number.MAX_SAFE_INTEGER;
        const fb = b.fecha_partido
          ? new Date(b.fecha_partido).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (fa !== fb) return fa - fb;
        return (a.orden ?? 0) - (b.orden ?? 0);
      });
  };

  type Standing = {
    id: string;
    seed: number | null;
    j1?: string | null;
    j2?: string | null;
    club?: string | null;
    cs: boolean;
    pj: number;
    pg: number;
    pp: number;
    sf: number;
    sc: number;
    gf: number;
    gc: number;
    pts: number;
  };

  const buildStandings = (
    zona: ZonaPdfRow,
    matches: Partido[],
  ): Standing[] => {
    const map = new Map<string, Standing>();
    for (const p of zona.parejas) {
      const id = p.id || `${p.jugador1_nombre}|${p.jugador2_nombre}`;
      map.set(id, {
        id,
        seed: p.seed ?? null,
        j1: p.jugador1_nombre,
        j2: p.jugador2_nombre,
        club: p.club,
        cs: Boolean(p.cabezaDeSerie),
        pj: 0,
        pg: 0,
        pp: 0,
        sf: 0,
        sc: 0,
        gf: 0,
        gc: 0,
        pts: 0,
      });
    }

    const resolveId = (
      equipoId?: string | null,
      j1?: string | null,
      j2?: string | null,
    ) => {
      if (equipoId && map.has(equipoId)) return equipoId;
      for (const [id, s] of map) {
        if (s.j1 === j1 && s.j2 === j2) return id;
      }
      return null;
    };

    for (const m of matches) {
      if (!m.ganador) continue;
      const idA = resolveId(m.equipo_a_id, m.equipo_a_j1, m.equipo_a_j2);
      const idB = resolveId(m.equipo_b_id, m.equipo_b_j1, m.equipo_b_j2);
      if (!idA || !idB) continue;
      const A = map.get(idA)!;
      const B = map.get(idB)!;
      A.pj += 1;
      B.pj += 1;

      let sA = 0;
      let sB = 0;
      const applySet = (a?: number | null, b?: number | null) => {
        if (a == null || b == null) return;
        A.gf += a;
        A.gc += b;
        B.gf += b;
        B.gc += a;
        if (a > b) sA += 1;
        else if (b > a) sB += 1;
      };

      if (m.es_wo) {
        const aWon = m.ganador === m.equipo_a_id;
        applySet(aWon ? 6 : 0, aWon ? 0 : 6);
        applySet(aWon ? 6 : 0, aWon ? 0 : 6);
        sA = aWon ? 2 : 0;
        sB = aWon ? 0 : 2;
      } else {
        applySet(m.set1_a, m.set1_b);
        applySet(m.set2_a, m.set2_b);
        applySet(m.set3_a, m.set3_b);
      }

      A.sf += sA;
      A.sc += sB;
      B.sf += sB;
      B.sc += sA;

      if (m.es_wo) {
        if (m.ganador === m.equipo_a_id) {
          A.pg += 1;
          A.pts += 2;
          B.pp += 1;
        } else {
          B.pg += 1;
          B.pts += 2;
          A.pp += 1;
        }
      } else if (m.ganador === m.equipo_a_id) {
        A.pg += 1;
        A.pts += 2;
        B.pp += 1;
        B.pts += 1;
      } else if (m.ganador === m.equipo_b_id) {
        B.pg += 1;
        B.pts += 2;
        A.pp += 1;
        A.pts += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const dsA = a.sf - a.sc;
      const dsB = b.sf - b.sc;
      if (dsB !== dsA) return dsB - dsA;
      const dgA = a.gf - a.gc;
      const dgB = b.gf - b.gc;
      if (dgB !== dgA) return dgB - dgA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      if (a.gc !== b.gc) return a.gc - b.gc;
      return (a.seed || 999) - (b.seed || 999);
    });
  };

  const reglaZona = (n: number) => {
    if (n <= 3) {
      return [
        "Modalidad: todos contra todos. Clasifican 1ro y 2do a la llave campeonato.",
        "Empate: dif. de sets, luego dif. de games, games a favor, games en contra, resultado en cancha.",
      ];
    }
    return [
      "Modalidad: 1ro vs 4to y 2do vs 3ro; luego ganadores entre si y perdedores entre si.",
      "Quien gana ambos partidos es 1ro; quien pierde ambos queda eliminado (salvo descalificacion).",
    ];
  };

  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.rect(0, 30, pageWidth, 1.2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.text("PADEL NEXUS  ·  REGLAMENTO FAP", 14, 8);
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Publicación de zonas de competencia", 14, 15);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
  doc.text((torneo.nombre || "TORNEO").toUpperCase(), 14, 21.5);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(186, 198, 214);
  doc.text(
    `Categoría: ${torneo.categoria || "Libres"}  ·  ${isIndividual ? "Individual" : "Duplas"}  ·  ${zonas.length} zona${zonas.length === 1 ? "" : "s"}  ·  Impreso: ${new Date().toLocaleString("es-AR")}`,
    14,
    27,
  );

  let y = 36;
  const marginX = 12;
  const contentW = pageWidth - marginX * 2;

  const sorted = [...zonas].sort((a, b) =>
    String(a.nombre).localeCompare(String(b.nombre), "es", { numeric: true }),
  );

  for (const zona of sorted) {
    const pairIds = new Set(
      zona.parejas.map((p) => p.id).filter((id): id is string => Boolean(id)),
    );
    const matches = matchesZona(zona.nombre, pairIds);
    const standings = buildStandings(zona, matches);
    const hasResults = matches.some((m) => m.ganador != null);
    const nParejas = zona.parejas.length;

    if (y + 55 > pageHeight - 14) {
      doc.addPage();
      y = 16;
    }

    doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.roundedRect(marginX, y, contentW, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${zona.nombre.toUpperCase()}  ·  ${nParejas} ${unidad}`,
      marginX + 4,
      y + 5.5,
    );
    y += 10;

    // Aclaracion FAP en caja legible (sin caracteres especiales)
    const reglas = reglaZona(nParejas);
    const reglaBoxH = 6 + reglas.length * 4.2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, y, contentW, reglaBoxH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Regla FAP · Zona de ${nParejas}`, marginX + 3.5, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    reglas.forEach((line, i) => {
      doc.text(line, marginX + 3.5, y + 8.2 + i * 4.2);
    });
    y += reglaBoxH + 5;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text("COMPOSICION (orden de ranking / seed)", marginX + 2, y);
    y += 4;

    const compCols = [
      { label: "#", w: 8 },
      { label: isIndividual ? "Jugador" : "Pareja", w: 62 },
      { label: "Institución / Club", w: 55 },
      { label: "Seed", w: 14 },
      { label: "Cabeza de serie", w: contentW - 8 - 62 - 55 - 14 },
    ];
    let cx = marginX;
    doc.setFillColor(SLATE_100[0], SLATE_100[1], SLATE_100[2]);
    doc.roundedRect(marginX, y, contentW, 6, 1, 1, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    compCols.forEach((c) => {
      doc.text(c.label, cx + 2, y + 4);
      cx += c.w;
    });
    y += 7;

    const composicion = [...zona.parejas].sort(
      (a, b) => (a.seed || 999) - (b.seed || 999),
    );

    composicion.forEach((p, i) => {
      if (y + 10 > pageHeight - 14) {
        doc.addPage();
        y = 16;
      }
      const rowH = isIndividual ? 7 : 9;
      if (i % 2 === 0) {
        doc.setFillColor(SLATE_50[0], SLATE_50[1], SLATE_50[2]);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(marginX, y, contentW, rowH, 1, 1, "FD");

      let x = marginX;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(String(i + 1), x + 4, y + (isIndividual ? 4.5 : 5.5));
      x += compCols[0].w;

      const names = pairLabel(p.jugador1_nombre, p.jugador2_nombre);
      doc.setFontSize(7);
      doc.text(names.line1.slice(0, 40), x + 2, y + (isIndividual ? 4.5 : 3.8));
      if (!isIndividual && names.line2) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
        doc.text(names.line2.slice(0, 40), x + 2, y + 7.2);
      }
      x += compCols[1].w;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(
        String(p.club || "—").slice(0, 36),
        x + 2,
        y + (isIndividual ? 4.5 : 5.5),
      );
      x += compCols[2].w;

      doc.setFont("helvetica", "bold");
      doc.text(
        p.seed != null ? String(p.seed) : "—",
        x + compCols[3].w / 2,
        y + (isIndividual ? 4.5 : 5.5),
        { align: "center" },
      );
      x += compCols[3].w;

      if (p.cabezaDeSerie) {
        doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
        doc.roundedRect(x + 1, y + (isIndividual ? 1.2 : 2), 26, 5, 1, 1, "F");
        doc.setFontSize(5.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Cabeza de serie", x + 14, y + (isIndividual ? 4.5 : 5.3), {
          align: "center",
        });
      }

      y += rowH + 1;
    });

    y += 3;
    if (y + 20 > pageHeight - 14) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text("PROGRAMACION (horario y complejo)", marginX + 2, y);
    y += 4;

    if (matches.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sin partidos programados aún en esta zona.", marginX + 2, y + 4);
      y += 12;
    } else {
      for (const m of matches) {
        if (y + 14 > pageHeight - 14) {
          doc.addPage();
          y = 16;
        }
        const done = m.ganador != null;
        const winnerA = Boolean(done && m.ganador === m.equipo_a_id);
        const winnerB = Boolean(done && m.ganador === m.equipo_b_id);

        doc.setFillColor(SLATE_50[0], SLATE_50[1], SLATE_50[2]);
        doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(marginX, y, contentW, 12, 1.5, 1.5, "FD");

        const code =
          m.orden != null
            ? String(m.orden).padStart(2, "0")
            : m.id.slice(0, 4).toUpperCase();
        doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
        doc.roundedRect(marginX + 2, y + 2.5, 12, 7, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`#${code}`, marginX + 8, y + 7, { align: "center" });

        doc.setFontSize(6.5);
        doc.setTextColor(37, 99, 235);
        doc.text(formatProg(m.fecha_partido), marginX + 16, y + 4.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(
          String(m.cancha_asignada || "Complejo s/d").slice(0, 42),
          marginX + 16,
          y + 9,
        );

        const vsX = marginX + 58;
        const boxW = (contentW - 100) / 2;
        if (winnerA) {
          doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
        doc.roundedRect(vsX, y + 2, boxW, 8, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text(
          shortPair(m.equipo_a_j1, m.equipo_a_j2).slice(0, 28),
          vsX + 2,
          y + 7,
        );

        doc.setFontSize(6);
        doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
        doc.text("VS", vsX + boxW + 4, y + 7, { align: "center" });

        const bx = vsX + boxW + 8;
        if (winnerB) {
          doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
        doc.roundedRect(bx, y + 2, boxW, 8, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text(
          shortPair(m.equipo_b_j1, m.equipo_b_j2).slice(0, 28),
          bx + 2,
          y + 7,
        );

        const scoreX = marginX + contentW - 28;
        const setPairs: Array<
          [number | null | undefined, number | null | undefined]
        > = done
          ? m.es_wo
            ? [
                [winnerA ? 6 : 0, winnerB ? 6 : 0],
                [winnerA ? 6 : 0, winnerB ? 6 : 0],
                [null, null],
              ]
            : [
                [m.set1_a, m.set1_b],
                [m.set2_a, m.set2_b],
                [m.set3_a, m.set3_b],
              ]
          : [
              [null, null],
              [null, null],
              [null, null],
            ];
        setPairs.forEach(([va, vb], i) => {
          const sx = scoreX + i * 9;
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.25);
          doc.setFillColor(255, 255, 255);
          doc.rect(sx, y + 2, 7.5, 8, "FD");
          if (va != null && vb != null) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6);
            doc.setTextColor(15, 23, 42);
            doc.text(`${va}-${vb}`, sx + 3.75, y + 7, { align: "center" });
          }
        });

        y += 14;
      }
    }

    if (hasResults) {
      y += 2;
      if (y + 30 > pageHeight - 14) {
        doc.addPage();
        y = 16;
      }
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text("TABLA DE POSICIONES", marginX + 2, y);
      y += 3;

      const cols = [
        { label: "#", w: 7 },
        { label: isIndividual ? "Jugador" : "Dupla", w: 48 },
        { label: "PJ", w: 9 },
        { label: "PG", w: 9 },
        { label: "PP", w: 9 },
        { label: "Sets", w: 14 },
        { label: "Juegos", w: 16 },
        { label: "Pts", w: 10 },
        {
          label: "Institución",
          w: contentW - 7 - 48 - 9 - 9 - 9 - 14 - 16 - 10,
        },
      ];
      let hx = marginX;
      doc.setFillColor(SLATE_100[0], SLATE_100[1], SLATE_100[2]);
      doc.roundedRect(marginX, y, contentW, 6, 1, 1, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      cols.forEach((c) => {
        doc.text(c.label, hx + 2, y + 4);
        hx += c.w;
      });
      y += 7;

      standings.forEach((s, i) => {
        if (y + 9 > pageHeight - 14) {
          doc.addPage();
          y = 16;
        }
        const rowH = 8;
        if (i % 2 === 0) {
          doc.setFillColor(SLATE_50[0], SLATE_50[1], SLATE_50[2]);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
        doc.roundedRect(marginX, y, contentW, rowH, 1, 1, "FD");

        let x = marginX;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(String(i + 1), x + 3.5, y + 5.2);
        x += cols[0].w;
        doc.setFontSize(6.5);
        doc.text(shortPair(s.j1, s.j2).slice(0, 32), x + 2, y + 5.2);
        x += cols[1].w;
        const vals = [
          String(s.pj),
          String(s.pg),
          String(s.pp),
          `${s.sf}-${s.sc}`,
          `${s.gf}-${s.gc}`,
          String(s.pts),
        ];
        vals.forEach((v, vi) => {
          doc.text(v, x + cols[vi + 2].w / 2, y + 5.2, { align: "center" });
          x += cols[vi + 2].w;
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(String(s.club || "—").slice(0, 22), x + 2, y + 5.2);
        y += rowH + 1;
      });
    }

    y += 8;
  }

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const footer = doc.splitTextToSize(
    "Pts FAP: ganado 2 / jugado-perdido 1 / W.O. 0 · Zonas y draws no se modifican salvo error o fuerza mayor (Fiscal General) · Clasifican a llave campeonato según reglamento · Padel Nexus",
    pageWidth - 28,
  );
  doc.text(footer, 14, pageHeight - 10);

  const cleanNombre = torneo.nombre
    ? torneo.nombre.replace(/\s+/g, "_")
    : "Padel_Nexus";
  doc.save(`Publicacion_Zonas_${cleanNombre}.pdf`);
}

/**
 * Grillas imprimibles por cancha para planilleros / largadores.
 * Una sección (página nueva) por cancha_asignada, orden horario, ID de partido visible.
 */
export function generarPdfGrillasPorCancha(
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
  const PRIMARY_DARK = [15, 23, 42] as const;
  const BRAND_ACCENT = [163, 230, 53] as const;

  const formatNames = (j1?: string | null, j2?: string | null) => {
    const list = [j1, j2].filter((n) => n && n !== "-" && n !== "Libre");
    return list.length > 0 ? list.join(" / ") : "A definir";
  };

  const formatMatchDateTimeStr = (fechaIso?: string | null) => {
    if (!fechaIso) return "Sin horario";
    try {
      const d = new Date(fechaIso);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${dd}/${mm} · ${hh}:${mins}`;
    } catch {
      return "Sin horario";
    }
  };

  const matchCode = (p: Partido) =>
    p.orden != null
      ? String(p.orden).padStart(2, "0")
      : p.id && !String(p.id).startsWith("empty-")
        ? String(p.id).slice(0, 8).toUpperCase()
        : "—";

  const canchaKey = (p: Partido) => {
    const raw = String(p.cancha_asignada || "").trim();
    return raw || "Sin cancha";
  };

  const definidos = partidos.filter((p) => {
    const a = formatNames(p.equipo_a_j1, p.equipo_a_j2);
    const b = formatNames(p.equipo_b_j1, p.equipo_b_j2);
    return a !== "A definir" || b !== "A definir";
  });

  const porCancha = new Map<string, Partido[]>();
  for (const p of definidos) {
    const key = canchaKey(p);
    const list = porCancha.get(key) || [];
    list.push(p);
    porCancha.set(key, list);
  }

  const canchas = Array.from(porCancha.keys()).sort((a, b) =>
    a.localeCompare(b, "es"),
  );

  if (canchas.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Sin partidos asignados a canchas.", 14, 20);
    doc.save(
      `Grillas_Cancha_${(torneo.nombre || "Torneo").replace(/\s+/g, "_")}.pdf`,
    );
    return;
  }

  canchas.forEach((cancha, idx) => {
    if (idx > 0) doc.addPage();

    const lista = (porCancha.get(cancha) || []).slice().sort((a, b) => {
      const ta = a.fecha_partido ? new Date(a.fecha_partido).getTime() : 0;
      const tb = b.fecha_partido ? new Date(b.fecha_partido).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return Number(a.orden || 0) - Number(b.orden || 0);
    });

    doc.setFillColor(...PRIMARY_DARK);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setFillColor(...BRAND_ACCENT);
    doc.rect(0, 28, pageWidth, 1.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PLANILLERO — GRILLA POR CANCHA", 14, 12);
    doc.setFontSize(9);
    doc.text((torneo.nombre || "TORNEO").toUpperCase(), 14, 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(186, 198, 214);
    doc.text(
      `Cancha: ${cancha}  ·  ${lista.length} partidos  ·  Impreso ${new Date().toLocaleString("es-AR")}`,
      14,
      25,
    );

    let y = 36;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...PRIMARY_DARK);
    doc.text("ID", 14, y);
    doc.text("Horario", 28, y);
    doc.text("Parejas / jugadores", 58, y);
    doc.text("Ctrl.", pageWidth - 28, y);
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, pageWidth - 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (const p of lista) {
      if (y > pageHeight - 18) {
        doc.addPage();
        y = 20;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...PRIMARY_DARK);
        doc.text(`${cancha} (cont.)`, 14, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      const idPartido = matchCode(p);
      const horario = formatMatchDateTimeStr(p.fecha_partido);
      const a = formatNames(p.equipo_a_j1, p.equipo_a_j2);
      const b = formatNames(p.equipo_b_j1, p.equipo_b_j2);
      const cruce = `${a}  vs  ${b}`;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y - 3.5, pageWidth - 28, 12, 1.5, 1.5, "F");

      doc.setTextColor(...PRIMARY_DARK);
      doc.setFont("helvetica", "bold");
      doc.text(idPartido, 16, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(horario, 28, y + 2);
      const lines = doc.splitTextToSize(cruce, pageWidth - 95);
      doc.setTextColor(...PRIMARY_DARK);
      doc.text(lines, 58, y + 2);
      doc.setDrawColor(203, 213, 225);
      doc.rect(pageWidth - 28, y - 1, 10, 6);

      y += Math.max(14, lines.length * 4 + 8);
    }

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Verificar identidad de quienes juegan. Anotar resultado y pasar a organización para carga.",
      14,
      pageHeight - 8,
    );
  });

  const cleanNombre = torneo.nombre
    ? torneo.nombre.replace(/\s+/g, "_")
    : "Padel_Nexus";
  doc.save(`Grillas_Cancha_${cleanNombre}.pdf`);
}
