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

/**
 * Hoja de ruta / planillero para coordinadores de cancha.
 * Disponible con el torneo en curso (no requiere estado Finalizado).
 * Muestra duplas separadas + historial de resultado si el partido ya finalizó.
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
  const SLATE_700 = [51, 65, 85] as const;
  const WINNER_BG = [236, 252, 203] as const;

  const splitName = (full?: string | null) => {
    if (!full || full === "-" || full === "Libre") {
      return { apellido: "—", nombre: "" };
    }
    const cleaned = full.trim();
    const idx = cleaned.indexOf(",");
    if (idx === -1) {
      const parts = cleaned.split(/\s+/);
      return {
        apellido: parts[0] || "—",
        nombre: parts.slice(1).join(" "),
      };
    }
    return {
      apellido: cleaned.slice(0, idx).trim() || "—",
      nombre: cleaned.slice(idx + 1).trim(),
    };
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
      return `${capDay} ${dd}/${mm} · ${hh}:${mins}`;
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

  const drawDuplaBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    j1?: string | null,
    j2?: string | null,
    isWinner = false,
  ) => {
    if (isWinner) {
      doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");

    const p1 = splitName(j1);
    const p2 = splitName(j2);
    const mid = y + h / 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p1.apellido.toUpperCase().slice(0, 22), x + 2.5, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    if (p1.nombre) doc.text(p1.nombre.slice(0, 24), x + 2.5, y + 8.5);

    doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
    doc.setLineWidth(0.2);
    doc.line(x + 2, mid, x + w - 2, mid);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(p2.apellido.toUpperCase().slice(0, 22), x + 2.5, mid + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    if (p2.nombre) doc.text(p2.nombre.slice(0, 24), x + 2.5, mid + 8);
  };

  const sorted = [...partidos]
    .filter((p) => p.equipo_a_id || p.equipo_b_id)
    .sort((a, b) => {
      // Primero en curso / pendientes; al final los finalizados
      const doneA = a.ganador != null ? 1 : 0;
      const doneB = b.ganador != null ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
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

  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("HOJA DE RUTA — COORDINADORES", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(
    `${(torneo.nombre || "TORNEO").toUpperCase()}  |  ${torneo.categoria || "Libres"}  |  Impreso: ${new Date().toLocaleString("es-AR")}`,
    14,
    21,
  );

  let y = 34;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(SLATE_700[0], SLATE_700[1], SLATE_700[2]);
  doc.text(
    "Primero partidos en curso · al final los finalizados (marcador en casillas de sets).",
    14,
    y,
  );
  y += 7;

  if (sorted.length === 0) {
    doc.setTextColor(100, 100, 100);
    doc.text("No hay partidos asignados para imprimir.", 14, y);
    const cleanNombre = torneo.nombre
      ? torneo.nombre.replace(/\s+/g, "_")
      : "Padel_Nexus";
    doc.save(`Hoja_Ruta_${cleanNombre}.pdf`);
    return;
  }

  const marginX = 12;
  const cardW = pageWidth - marginX * 2;
  const rowH = 40;

  for (const p of sorted) {
    if (y + rowH > pageHeight - 14) {
      doc.addPage();
      y = 16;
    }

    const finalizado = p.ganador != null;
    const winnerA = finalizado && p.ganador === p.equipo_a_id;
    const winnerB = finalizado && p.ganador === p.equipo_b_id;

    doc.setFillColor(SLATE_100[0], SLATE_100[1], SLATE_100[2]);
    doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, y, cardW, rowH - 2, 2, 2, "FD");

    // Badge código
    doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.roundedRect(marginX + 2.5, y + 2.5, 14, 6.5, 1.2, 1.2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`#${matchCode(p)}`, marginX + 9.5, y + 6.8, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text(
      `${String(p.ronda || "Ronda").toUpperCase()} · Orden ${p.orden ?? "—"}`,
      marginX + 19,
      y + 6.5,
    );

    if (finalizado) {
      doc.setFillColor(163, 230, 53);
      doc.roundedRect(marginX + 72, y + 2.5, 18, 6.5, 1.2, 1.2, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text("FINALIZADO", marginX + 81, y + 6.8, { align: "center" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${formatDateTime(p.fecha_partido)}  |  ${p.cancha_asignada || "Cancha s/d"}`,
      pageWidth - marginX - 3,
      y + 6.5,
      { align: "right" },
    );

    const boxY = y + 11;
    const boxH = 20;
    const boxW = (cardW - 48) / 2;
    const leftX = marginX + 3;
    const rightX = marginX + 3 + boxW + 14;

    drawDuplaBox(
      leftX,
      boxY,
      boxW,
      boxH,
      p.equipo_a_j1,
      p.equipo_a_j2,
      Boolean(winnerA),
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text("VS", leftX + boxW + 7, boxY + boxH / 2 + 1, { align: "center" });

    drawDuplaBox(
      rightX,
      boxY,
      boxW,
      boxH,
      p.equipo_b_j1,
      p.equipo_b_j2,
      Boolean(winnerB),
    );

    // Score area — casillas de sets (rellenas si hay resultado)
    const scoreX = marginX + cardW - 28;
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text("SETS", scoreX + 10, boxY + 2, { align: "center" });

    const setPairs: Array<[number | null | undefined, number | null | undefined]> =
      p.es_wo
        ? [
            [winnerA ? 6 : 0, winnerB ? 6 : 0],
            [winnerA ? 6 : 0, winnerB ? 6 : 0],
            [null, null],
          ]
        : [
            [p.set1_a, p.set1_b],
            [p.set2_a, p.set2_b],
            [p.set3_a, p.set3_b],
          ];

    const labels = ["1", "2", "3"];
    labels.forEach((lab, i) => {
      const sy = boxY + 4 + i * 5.5;
      const [va, vb] = setPairs[i];
      const hasA = va !== null && va !== undefined;
      const hasB = vb !== null && vb !== undefined;
      const aWins = hasA && hasB && Number(va) > Number(vb);
      const bWins = hasA && hasB && Number(vb) > Number(va);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      if (hasA && aWins) {
        doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
        doc.rect(scoreX, sy, 7, 4.5, "FD");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(scoreX, sy, 7, 4.5, "FD");
      }
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text(lab, scoreX - 2.5, sy + 3.2);
      doc.text("-", scoreX + 9, sy + 3.2);

      if (hasB && bWins) {
        doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
        doc.rect(scoreX + 12, sy, 7, 4.5, "FD");
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(scoreX + 12, sy, 7, 4.5, "FD");
      }

      if (hasA) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(aWins ? 15 : 30, aWins ? 23 : 41, aWins ? 42 : 59);
        doc.text(String(va), scoreX + 3.5, sy + 3.3, { align: "center" });
      }
      if (hasB) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(bWins ? 15 : 30, bWins ? 23 : 41, bWins ? 42 : 59);
        doc.text(String(vb), scoreX + 15.5, sy + 3.3, { align: "center" });
      }
    });

    if (finalizado && p.es_wo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.text("Resultado: W.O.", marginX + 4, y + rowH - 5);
    }

    y += rowH;
  }

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Hoja de ruta Padel Nexus — cruzar código # con la carga de resultados del CRM.",
    14,
    pageHeight - 8,
  );

  const cleanNombre = torneo.nombre
    ? torneo.nombre.replace(/\s+/g, "_")
    : "Padel_Nexus";
  doc.save(`Hoja_Ruta_${cleanNombre}.pdf`);
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

/** PDF de zonas: posiciones + partidos con marcador en cuadros de sets. */
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
    const b = splitName(j2);
    return {
      line1: `${a.apellido.toUpperCase()}${a.nombre ? `, ${a.nombre}` : ""}`,
      line2: `${b.apellido.toUpperCase()}${b.nombre ? `, ${b.nombre}` : ""}`,
    };
  };

  const shortPair = (j1?: string | null, j2?: string | null) => {
    const a = splitName(j1).apellido.toUpperCase();
    const b = splitName(j2).apellido.toUpperCase();
    return `${a} / ${b}`;
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
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
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

      if (m.ganador === m.equipo_a_id) {
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
      return (a.seed || 999) - (b.seed || 999);
    });
  };

  const drawSetBoxes = (
    x: number,
    y: number,
    m: Partido,
    winnerA: boolean,
    winnerB: boolean,
  ) => {
    const pairs: Array<[number | null | undefined, number | null | undefined]> =
      m.es_wo
        ? [
            [winnerA ? 6 : 0, winnerB ? 6 : 0],
            [winnerA ? 6 : 0, winnerB ? 6 : 0],
            [null, null],
          ]
        : [
            [m.set1_a, m.set1_b],
            [m.set2_a, m.set2_b],
            [m.set3_a, m.set3_b],
          ];

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text("S1", x + 3.5, y, { align: "center" });
    doc.text("S2", x + 12.5, y, { align: "center" });
    doc.text("S3", x + 21.5, y, { align: "center" });

    pairs.forEach(([va, vb], i) => {
      const bx = x + i * 9;
      const has = va != null && vb != null;
      const aW = has && Number(va) > Number(vb);
      const bW = has && Number(vb) > Number(va);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.setFillColor(
        aW ? BRAND_ACCENT[0] : 255,
        aW ? BRAND_ACCENT[1] : 255,
        aW ? BRAND_ACCENT[2] : 255,
      );
      doc.rect(bx, y + 1.5, 7, 5, "FD");
      doc.setFillColor(
        bW ? BRAND_ACCENT[0] : 255,
        bW ? BRAND_ACCENT[1] : 255,
        bW ? BRAND_ACCENT[2] : 255,
      );
      doc.rect(bx, y + 7, 7, 5, "FD");

      if (va != null) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(String(va), bx + 3.5, y + 5, { align: "center" });
      }
      if (vb != null) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(String(vb), bx + 3.5, y + 10.5, { align: "center" });
      }
    });
  };

  doc.setFillColor(PRIMARY_DARK[0], PRIMARY_DARK[1], PRIMARY_DARK[2]);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(
    `PADEL NEXUS  —  ZONAS  —  ${(torneo.nombre || "TORNEO").toUpperCase()}`,
    14,
    14,
  );
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(
    `Categoría: ${torneo.categoria || "Libres"}  |  ${zonas.length} zona${zonas.length === 1 ? "" : "s"}  |  Impreso: ${new Date().toLocaleDateString("es-AR")}`,
    14,
    22,
  );

  let y = 34;
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

    if (y + 50 > pageHeight - 12) {
      doc.addPage();
      y = 16;
    }

    doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
    doc.roundedRect(marginX, y, contentW, 9, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${zona.nombre.toUpperCase()}  ·  ${zona.parejas.length} parejas  ·  ${matches.length} partidos`,
      marginX + 4,
      y + 6,
    );
    y += 12;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text("POSICIONES", marginX + 2, y);
    y += 3;

    const cols = [
      { label: "#", w: 7 },
      { label: "DUPLA", w: 52 },
      { label: "PJ", w: 9 },
      { label: "PG", w: 9 },
      { label: "PP", w: 9 },
      { label: "Sets", w: 14 },
      { label: "Juegos", w: 16 },
      { label: "Pts", w: 10 },
      { label: "Cabeza de serie", w: 30 },
    ];
    let cx = marginX;
    doc.setFillColor(SLATE_100[0], SLATE_100[1], SLATE_100[2]);
    doc.roundedRect(marginX, y, contentW, 6, 1, 1, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    cols.forEach((c) => {
      doc.text(c.label, cx + 2, y + 4);
      cx += c.w;
    });
    y += 7;

    standings.forEach((s, i) => {
      if (y + 10 > pageHeight - 12) {
        doc.addPage();
        y = 16;
      }
      const rowH = 9;
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
      doc.text(String(i + 1), x + 4, y + 5.5);
      x += cols[0].w;

      const names = pairLabel(s.j1, s.j2);
      doc.setFontSize(7);
      doc.text(names.line1.slice(0, 34), x + 2, y + 3.8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
      doc.text(names.line2.slice(0, 34), x + 2, y + 7.2);
      x += cols[1].w;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const vals = [
        String(s.pj),
        String(s.pg),
        String(s.pp),
        `${s.sf}-${s.sc}`,
        `${s.gf}-${s.gc}`,
        String(s.pts),
      ];
      vals.forEach((v, vi) => {
        doc.text(v, x + cols[vi + 2].w / 2, y + 5.5, { align: "center" });
        x += cols[vi + 2].w;
      });

      if (s.cs) {
        doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
        doc.roundedRect(x + 1, y + 2, 26, 5, 1, 1, "F");
        doc.setFontSize(5.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Cabeza de serie", x + 14, y + 5.3, { align: "center" });
      }

      y += rowH + 1;
    });

    y += 4;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
    doc.text("RESULTADOS DE LA ZONA", marginX + 2, y);
    y += 4;

    if (matches.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Sin partidos cargados aún en esta zona.", marginX + 2, y + 4);
      y += 12;
    } else {
      for (const m of matches) {
        if (y + 18 > pageHeight - 12) {
          doc.addPage();
          y = 16;
        }
        const done = m.ganador != null;
        const winnerA = Boolean(done && m.ganador === m.equipo_a_id);
        const winnerB = Boolean(done && m.ganador === m.equipo_b_id);

        doc.setFillColor(SLATE_50[0], SLATE_50[1], SLATE_50[2]);
        doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(marginX, y, contentW, 16, 1.5, 1.5, "FD");

        const code =
          m.orden != null
            ? String(m.orden).padStart(2, "0")
            : m.id.slice(0, 4).toUpperCase();
        doc.setFillColor(BRAND_ACCENT[0], BRAND_ACCENT[1], BRAND_ACCENT[2]);
        doc.roundedRect(marginX + 2, y + 4.5, 12, 7, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`#${code}`, marginX + 8, y + 9, { align: "center" });

        const boxWA = (contentW - 55) / 2;
        const ax = marginX + 16;
        if (winnerA) {
          doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
        doc.roundedRect(ax, y + 2, boxWA, 12, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(
          shortPair(m.equipo_a_j1, m.equipo_a_j2).slice(0, 36),
          ax + 2,
          y + 9,
        );

        doc.setFontSize(7);
        doc.setTextColor(SLATE_500[0], SLATE_500[1], SLATE_500[2]);
        doc.text("VS", ax + boxWA + 5, y + 9, { align: "center" });

        const bx = ax + boxWA + 10;
        if (winnerB) {
          doc.setFillColor(WINNER_BG[0], WINNER_BG[1], WINNER_BG[2]);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.setDrawColor(SLATE_200[0], SLATE_200[1], SLATE_200[2]);
        doc.roundedRect(bx, y + 2, boxWA, 12, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(
          shortPair(m.equipo_b_j1, m.equipo_b_j2).slice(0, 36),
          bx + 2,
          y + 9,
        );

        drawSetBoxes(
          marginX + contentW - 30,
          y + 1.5,
          m,
          winnerA,
          winnerB,
        );

        if (m.es_wo && done) {
          doc.setFontSize(6);
          doc.setTextColor(180, 83, 9);
          doc.text("W.O.", marginX + contentW - 32, y + 14.5);
        }

        y += 18;
      }
    }

    y += 8;
  }

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Pts: ganado 2 / jugado-perdido 1 / W.O. 0  ·  Sets y Juegos = a favor-en contra (suma de games de cada set)  ·  Padel Nexus",
    14,
    pageHeight - 8,
  );

  const cleanNombre = torneo.nombre
    ? torneo.nombre.replace(/\s+/g, "_")
    : "Padel_Nexus";
  doc.save(`Zonas_${cleanNombre}.pdf`);
}
