import jsPDF from "jspdf";
import igedesLogo from "@/assets/igedes.png";
import prefeituraLogo from "@/assets/prefeitura-angra.png";
import ilpiLogo from "@/assets/ilpi-symbol.png";
import {
  MONTH_LABELS,
  SHIFT_OPTIONS,
  WEEKDAY_LABELS,
  formatDateBR,
  isDiarista,
  medicalLeaveOn,
  medicalLeaveName,
  medicalLeaveOverlapsMonth,
  isWeekend,
  holidayName,
  isWorkDay,
  memberShiftOn,
  monthDates,
  toISODate,
  vacationOn,
  vacationOverlapsMonth,
  type Shift,
  type ShiftMember,
  type ShiftMedicalLeave,
  type ShiftRotation,
  type ShiftVacation,
} from "./work-schedule";

/** Cores em RGB para o PDF (mesmo padrão visual da planilha). */
const NAVY: [number, number, number] = [91, 155, 213];
const WORK: [number, number, number] = [255, 192, 0];
const DIARISTA_COLOR: [number, number, number] = [157, 195, 230];
const VACATION: [number, number, number] = [217, 217, 217];
const MEDICAL_LEAVE: [number, number, number] = [248, 200, 200];
const COVER: [number, number, number] = [169, 208, 142];
const WEEKEND: [number, number, number] = [244, 245, 248];
const HOLIDAY: [number, number, number] = [253, 230, 138];
const GROUP: [number, number, number] = [226, 232, 240];
const LINE: [number, number, number] = [120, 128, 145];

const INSTITUTION_HEADER = [
  "ESTADO DO RIO DE JANEIRO",
  "PREFEITURA MUNICIPAL DE ANGRA DOS REIS",
  "SECRETARIA MUNICIPAL DE DESENVOLVIMENTO SOCIAL E PROMOÇÃO DA CIDADANIA",
  "INSTITUIÇÃO DE LONGA PERMANÊNCIA PARA IDOSO — LUIZA OLINDINA DA SILVA ALVES",
];

export type WorkSchedulePdfExport = {
  year: number;
  month: number;
  anchorDate: string;
  members: ShiftMember[];
  rotations: ShiftRotation[];
  vacations?: ShiftVacation[];
  medicalLeaves?: ShiftMedicalLeave[];
  notes?: string | null;
  title?: string;
  fileSlug?: string;
  /** Inclui as colunas de matrícula e horário (escalas Técnica e Administrativa). */
  extended?: boolean;
};

type LoadedImage = { data: string; width: number; height: number };

async function loadImage(url: string): Promise<LoadedImage> {
  const response = await fetch(url);
  const blob = await response.blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível carregar os logos."));
    reader.readAsDataURL(blob);
  });
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Não foi possível ler os logos."));
    image.src = data;
  });
  return { data, ...size };
}

/** Ajusta a imagem dentro de uma caixa preservando a proporção original. */
function fit(image: LoadedImage, maxW: number, maxH: number) {
  const scale = Math.min(maxW / image.width, maxH / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

type Row =
  | { kind: "group"; shift: Shift }
  | { kind: "member"; member: ShiftMember }
  | { kind: "cover"; member: ShiftMember; vacation: ShiftVacation };

function truncate(doc: jsPDF, text: string, maxWidth: number) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && doc.getTextWidth(`${value}…`) > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

export async function buildWorkSchedulePdf(data: WorkSchedulePdfExport) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;

  const days = monthDates(data.year, data.month);
  const vacations = data.vacations ?? [];
  const medicalLeaves = data.medicalLeaves ?? [];
  const extended = data.extended ?? false;
  const firstISO = toISODate(days[0]!);

  const leadHeaders = extended
    ? ["COLABORADOR", "PROFISSÃO", "CONSELHO", "MATRÍCULA", "HORÁRIO", "PLANTÃO"]
    : ["COLABORADOR", "PROFISSÃO", "PLANTÃO"];
  const leadWidthsRaw = extended ? [42, 26, 18, 18, 18, 14] : [52, 34, 15];
  const dayW = Math.max(5.2, (usableW - leadWidthsRaw.reduce((a, b) => a + b, 0)) / days.length);
  // Reescala as colunas iniciais para o conteúdo caber exatamente na largura da página.
  const leadTotal = usableW - dayW * days.length;
  const scale = leadTotal / leadWidthsRaw.reduce((a, b) => a + b, 0);
  const leadWidths = leadWidthsRaw.map((width) => width * scale);
  const leadX: number[] = [];
  let cursor = margin;
  for (const width of leadWidths) {
    leadX.push(cursor);
    cursor += width;
  }
  const daysX = cursor;

  const [prefeitura, ilpi, igedes] = await Promise.all([
    loadImage(prefeituraLogo),
    loadImage(ilpiLogo),
    loadImage(igedesLogo),
  ]);

  const rows: Row[] = [];
  const grouped = SHIFT_OPTIONS.map((shift) => ({
    shift,
    members: data.members.filter(
      (member) => memberShiftOn(member, data.rotations, firstISO) === shift,
    ),
  })).filter((group) => group.members.length > 0);
  for (const group of grouped) {
    rows.push({ kind: "group", shift: group.shift });
    for (const member of group.members) {
      rows.push({ kind: "member", member });
      for (const vacation of vacations.filter(
        (item) =>
          item.member_id === member.id && vacationOverlapsMonth(item, data.year, data.month),
      )) {
        rows.push({ kind: "cover", member, vacation });
      }
    }
  }

  const headerH = 8;
  const footerTop = pageH - 42;
  const tableTop = margin + 36;
  // Linhas de divisória de plantão recebem mais altura para destacar o nome do SD.
  const GROUP_FACTOR = 1.8;
  const groupCount = rows.filter((row) => row.kind === "group").length;
  const rowH = Math.min(
    5.6,
    (footerTop - tableTop - headerH) /
      Math.max(rows.length - groupCount + groupCount * GROUP_FACTOR, 1),
  );
  const groupH = Math.min(8, rowH * GROUP_FACTOR);
  const bodyFont = Math.max(3.5, Math.min(6.4, rowH * 1.05));

  function drawPageHeader() {
    const logoBox = 28;
    const gapLogoTexto = 6; // folga mínima entre cada logo e o bloco de texto central
    const gapEntreLogos = 8; // folga entre o símbolo da ILPI e o logo da IGEDES

    // Mede o texto institucional para reservar o espaço central e evitar colisão.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const widestLine = Math.max(...INSTITUTION_HEADER.map((line) => doc.getTextWidth(line)));
    const centerHalf = widestLine / 2 + gapLogoTexto;
    const sideZone = Math.max(40, pageW / 2 - centerHalf - margin);

    // Logotipo da Prefeitura à esquerda, dentro da zona livre.
    const left = fit(prefeitura, Math.min(92, sideZone), logoBox);
    doc.addImage(
      prefeitura.data,
      "PNG",
      margin,
      margin + (logoBox - left.height) / 2,
      left.width,
      left.height,
    );

    // IGEDES encostada na margem direita e ILPI ao lado, com folga entre elas.
    const igedesSize = fit(igedes, Math.min(32, sideZone - 15 - gapEntreLogos), logoBox);
    const ilpiSize = fit(ilpi, Math.min(15, sideZone - igedesSize.width - gapEntreLogos), logoBox);
    const rightX = pageW - margin - igedesSize.width;
    doc.addImage(
      igedes.data,
      "PNG",
      rightX,
      margin + (logoBox - igedesSize.height) / 2,
      igedesSize.width,
      igedesSize.height,
    );
    doc.addImage(
      ilpi.data,
      "PNG",
      rightX - gapEntreLogos - ilpiSize.width,
      margin + (logoBox - ilpiSize.height) / 2,
      ilpiSize.width,
      ilpiSize.height,
    );

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    INSTITUTION_HEADER.forEach((line, index) => {
      doc.text(line, pageW / 2, margin + 3.2 + index * 3.1, { align: "center" });
    });

    doc.setFontSize(13);
    doc.text(
      `${data.title ?? "ESCALA DE TRABALHO 24x72"} — ${MONTH_LABELS[data.month]?.toUpperCase()} / ${data.year}`,
      pageW / 2,
      margin + logoBox + 6,
      { align: "center" },
    );
    return tableTop;
  }

  function drawTableHeader(top: number) {
    // O azul ciano fica apenas na faixa de identificação das colunas.
    doc.setFillColor(...NAVY);
    doc.rect(margin, top, usableW, headerH, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    leadHeaders.forEach((label, index) => {
      doc.text(label, leadX[index]! + leadWidths[index]! / 2, top + headerH / 2 + 1, {
        align: "center",
      });
    });
    doc.setFontSize(6);
    days.forEach((date, index) => {
      const x = daysX + dayW * index + dayW / 2;
      if (holidayName(toISODate(date))) {
        doc.setFillColor(...HOLIDAY);
        doc.rect(daysX + dayW * index, top, dayW, headerH, "F");
        doc.setTextColor(0, 0, 0);
      }
      doc.text(String(date.getDate()), x, top + 3.6, { align: "center" });
      doc.text(WEEKDAY_LABELS[date.getDay()]!.toUpperCase(), x, top + 7.4, { align: "center" });
    });
    return top + headerH;
  }

  function drawCell(
    x: number,
    y: number,
    width: number,
    label: string,
    fill?: [number, number, number],
  ) {
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(x, y, width, rowH, "F");
    }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.1);
    doc.rect(x, y, width, rowH);
    if (label) {
      doc.text(label, x + width / 2, y + rowH / 2 + 1.1, { align: "center" });
    }
  }

  let y = drawTableHeader(drawPageHeader());
  for (const row of rows) {
    if (row.kind === "group") {
      // Divisória de plantão: faixa com o nome do SD separando os grupos.
      doc.setFillColor(...GROUP);
      doc.rect(margin, y, usableW, groupH, "F");
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.6);
      doc.line(margin, y, margin + usableW, y);
      doc.line(margin, y + groupH, margin + usableW, y + groupH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(Math.max(6.5, Math.min(10, groupH * 1.3)));
      doc.setTextColor(0, 0, 0);
      doc.text(
        isDiarista(row.shift)
          ? "DIARISTAS — SEGUNDA A SEXTA"
          : `PLANTÃO ${row.shift} — 24 HORAS (24x72)`,
        margin + 2,
        y + groupH / 2 + 1.4,
      );
      y += groupH;
      continue;
    }

    if (row.kind === "member") {
      const member = row.member;
      const monthShift = memberShiftOn(member, data.rotations, firstISO);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(bodyFont);
      const values = extended
        ? [
            member.name,
            member.job_title ?? "",
            member.council ?? "",
            member.registry_number ?? "",
            member.work_hours ?? "",
            isDiarista(monthShift) ? "DIAR." : monthShift,
          ]
        : [member.name, member.job_title ?? "", isDiarista(monthShift) ? "DIAR." : monthShift];
      values.forEach((value, index) => {
        drawCell(
          leadX[index]!,
          y,
          leadWidths[index]!,
          truncate(doc, value, leadWidths[index]! - 2),
          index === 0 ? [242, 242, 242] : undefined,
        );
      });

      doc.setFontSize(5.6);
      days.forEach((date, index) => {
        const dayISO = toISODate(date);
        const shift = memberShiftOn(member, data.rotations, dayISO);
        const onVacation = vacationOn(member.id, vacations, dayISO) !== null;
        const onMedicalLeave = medicalLeaveOn(member, medicalLeaves, dayISO) !== null;
        const works = !onVacation && !onMedicalLeave && isWorkDay(shift, data.anchorDate, dayISO);
        const diarista = isDiarista(shift);
        const fill = onMedicalLeave
          ? MEDICAL_LEAVE
          : onVacation
            ? VACATION
            : works
              ? diarista
                ? DIARISTA_COLOR
                : WORK
              : isWeekend(dayISO)
                ? WEEKEND
                : undefined;
        drawCell(
          daysX + dayW * index,
          y,
          dayW,
          onMedicalLeave ? "AFT" : onVacation ? "FÉR" : works ? (diarista ? "T" : "24h") : "",
          fill,
        );
      });
      y += rowH;
      continue;
    }

    const { member, vacation } = row;
    const monthShift = memberShiftOn(member, data.rotations, firstISO);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.2);
    const coverLabel = `Cobertura: ${vacation.cover_name}${
      vacation.cover_job_title ? ` — ${vacation.cover_job_title}` : ""
    } (${formatDateBR(vacation.start_date)} a ${formatDateBR(vacation.end_date)})`;
    drawCell(
      leadX[0]!,
      y,
      leadWidths[0]!,
      truncate(doc, coverLabel, leadWidths[0]! - 2),
      [242, 242, 242],
    );
    const rest = extended
      ? [vacation.cover_job_title ?? "", "", "", "", isDiarista(monthShift) ? "DIAR." : monthShift]
      : [vacation.cover_job_title ?? "", isDiarista(monthShift) ? "DIAR." : monthShift];
    rest.forEach((value, index) => {
      drawCell(
        leadX[index + 1]!,
        y,
        leadWidths[index + 1]!,
        truncate(doc, value, leadWidths[index + 1]! - 2),
      );
    });
    doc.setFontSize(5.6);
    days.forEach((date, index) => {
      const dayISO = toISODate(date);
      const shift = memberShiftOn(member, data.rotations, dayISO);
      const inRange = vacation.start_date <= dayISO && dayISO <= vacation.end_date;
      const works = inRange && isWorkDay(shift, data.anchorDate, dayISO);
      drawCell(
        daysX + dayW * index,
        y,
        dayW,
        works ? (isDiarista(shift) ? "T" : "24h") : "",
        works ? COVER : isWeekend(dayISO) ? WEEKEND : undefined,
      );
    });
    y += rowH;
  }

  const monthVacations = vacations.filter((item) =>
    vacationOverlapsMonth(item, data.year, data.month),
  );
  const monthLeaves = medicalLeaves.filter((item) =>
    medicalLeaveOverlapsMonth(item, data.year, data.month),
  );
  const memberName = (memberId: string) =>
    data.members.find((item) => item.id === memberId)?.name ?? "Colaborador";
  const vacationNames = monthVacations.length
    ? monthVacations
        .map(
          (item) =>
            `${memberName(item.member_id)} (${formatDateBR(item.start_date)} a ${formatDateBR(item.end_date)})`,
        )
        .join("; ")
    : "Nenhum";
  const leaveNames = monthLeaves.length
    ? monthLeaves
        .map((item) =>
          item.end_date
            ? `${medicalLeaveName(item, data.members)} (${formatDateBR(item.start_date)} a ${formatDateBR(item.end_date)})`
            : `${medicalLeaveName(item, data.members)} (desde ${formatDateBR(item.start_date)} — retorno em aberto)`,
        )
        .join("; ")
    : "Nenhum";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.7);
  doc.setTextColor(0, 0, 0);
  const legendY = footerTop + 3;
  doc.setFont("helvetica", "bold");
  doc.text("LEGENDA", margin, legendY);
  doc.setFont("helvetica", "normal");
  doc.text(
    "24h = plantão 24x72  |  T = diarista  |  FÉR = férias  |  AFT = afastamento médico  |  Verde = cobertura de férias  |  Amarelo claro no cabeçalho = feriado (Angra dos Reis / RJ / nacional)",
    margin + 18,
    legendY,
  );
  const monthHolidays = days
    .map((date) => ({ dayISO: toISODate(date), name: holidayName(toISODate(date)) }))
    .filter((item): item is { dayISO: string; name: string } => item.name !== null);
  doc.setFont("helvetica", "bold");
  doc.text("Férias:", margin, legendY + 4);
  doc.setFont("helvetica", "normal");
  doc.text(truncate(doc, vacationNames, usableW - 17), margin + 17, legendY + 4);
  doc.setFont("helvetica", "bold");
  doc.text("Afastamento médico:", margin, legendY + 8.5);
  doc.setFont("helvetica", "normal");
  doc.text(truncate(doc, leaveNames, usableW - 42), margin + 42, legendY + 8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Feriados do mês:", margin, legendY + 13);
  doc.setFont("helvetica", "normal");
  doc.text(
    truncate(
      doc,
      monthHolidays.length > 0
        ? monthHolidays.map((item) => `${formatDateBR(item.dayISO)} - ${item.name}`).join("; ")
        : "Nenhum feriado neste mês",
      usableW - 34,
    ),
    margin + 34,
    legendY + 13,
  );
  if (data.notes) {
    doc.setFont("helvetica", "italic");
    doc.text(truncate(doc, `Observações: ${data.notes}`, usableW), margin, legendY + 17.5);
  }

  const signatureY = pageH - 14;
  const signatureW = 76;
  const signatureGap = 30;
  const signaturesStart = (pageW - signatureW * 2 - signatureGap) / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(signaturesStart, signatureY, signaturesStart + signatureW, signatureY);
  doc.line(
    signaturesStart + signatureW + signatureGap,
    signatureY,
    signaturesStart + signatureW * 2 + signatureGap,
    signatureY,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Responsável pela elaboração", signaturesStart + signatureW / 2, signatureY + 3.5, {
    align: "center",
  });
  doc.text(
    "Responsável pela aprovação",
    signaturesStart + signatureW + signatureGap + signatureW / 2,
    signatureY + 3.5,
    { align: "center" },
  );

  return doc;
}

export async function downloadWorkSchedulePdf(data: WorkSchedulePdfExport) {
  const doc = await buildWorkSchedulePdf(data);
  doc.save(
    `${data.fileSlug ?? "escala-trabalho"}_${data.year}-${String(data.month + 1).padStart(2, "0")}.pdf`,
  );
}
