import ExcelJS from "exceljs";
import igedesLogo from "@/assets/igedes.png";
import prefeituraLogo from "@/assets/prefeitura-angra.png";
import ilpiLogo from "@/assets/ilpi-symbol.png";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  formatDateBR,
  holidayName,
  isDiarista,
  isWorkDay,
  memberShiftOn,
  monthDates,
  toISODate,
  vacationOn,
  vacationOverlapsMonth,
  type ShiftMember,
  type ShiftRotation,
  type ShiftVacation,
} from "./work-schedule";

const HEADER_COLOR = "FF040C28";
const WORK_FILL = "FFFFC000";
const DIARISTA_FILL = "FF9DC3E6";
const NAME_FILL = "FFF2F2F2";
const VACATION_FILL = "FFD9D9D9";
const COVER_FILL = "FFA9D08E";
const HOLIDAY_FILL = "FFFDE68A";

const INSTITUTION_HEADER = [
  "ESTADO DO RIO DE JANEIRO",
  "PREFEITURA MUNICIPAL DE ANGRA DOS REIS",
  "SECRETARIA MUNICIPAL DE DESENVOLVIMENTO SOCIAL E PROMOÇÃO DA CIDADANIA",
  "INSTITUIÇÃO DE LONGA PERMANÊNCIA PARA IDOSO",
  "LUIZA OLINDINA DA SILVA ALVES",
].join("\n");

const border = {
  top: { style: "thin" as const },
  bottom: { style: "thin" as const },
  left: { style: "thin" as const },
  right: { style: "thin" as const },
};

async function loadImage(url: string) {
  const response = await fetch(url);
  return await response.arrayBuffer();
}

export type WorkScheduleExport = {
  year: number;
  month: number;
  anchorDate: string;
  members: ShiftMember[];
  rotations: ShiftRotation[];
  vacations?: ShiftVacation[];
  notes?: string | null;
  /** Título impresso na planilha. */
  title?: string;
  /** Prefixo do nome do arquivo baixado. */
  fileSlug?: string;
  /** Inclui as colunas de matrícula e horário (escalas Técnica e Administrativa). */
  extended?: boolean;
};

export async function buildWorkScheduleWorkbook(data: WorkScheduleExport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Interno ILPI";
  workbook.created = new Date();

  const days = monthDates(data.year, data.month);
  const sheet = workbook.addWorksheet(`${MONTH_LABELS[data.month]} ${data.year}`.slice(0, 31), {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  const extended = data.extended ?? false;
  const leadHeaders = extended
    ? ["COLABORADOR", "PROFISSÃO", "CONSELHO", "MATRÍCULA", "HORÁRIO", "PLANTÃO"]
    : ["COLABORADOR", "PROFISSÃO", "PLANTÃO"];
  const lead = leadHeaders.length;
  sheet.columns = [
    { width: 26 },
    { width: 18 },
    ...(extended ? [{ width: 12 }, { width: 12 }, { width: 12 }] : []),
    { width: 9 },
    ...days.map(() => ({ width: 4.2 })),
  ];
  const lastCol = lead + days.length;

  sheet.mergeCells(1, 1, 4, lastCol);
  const header = sheet.getCell(1, 1);
  header.value = INSTITUTION_HEADER;
  header.font = { name: "Arial", size: 9, bold: true, color: { argb: HEADER_COLOR } };
  header.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  for (let row = 1; row <= 4; row += 1) sheet.getRow(row).height = 15;

  const [prefeitura, ilpi, igedes] = await Promise.all([
    loadImage(prefeituraLogo),
    loadImage(ilpiLogo),
    loadImage(igedesLogo),
  ]);
  sheet.addImage(workbook.addImage({ buffer: prefeitura as ExcelJS.Buffer, extension: "png" }), {
    tl: { col: 0.15, row: 0.1 },
    ext: { width: 123, height: 58 },
  });
  sheet.addImage(workbook.addImage({ buffer: ilpi as ExcelJS.Buffer, extension: "png" }), {
    tl: { col: lastCol - 8.2, row: 0.1 },
    ext: { width: 58, height: 58 },
  });
  sheet.addImage(workbook.addImage({ buffer: igedes as ExcelJS.Buffer, extension: "png" }), {
    tl: { col: lastCol - 6.6, row: 0.2 },
    ext: { width: 137, height: 50 },
  });

  sheet.mergeCells(5, 1, 5, lastCol);
  const title = sheet.getCell(5, 1);
  title.value = `${data.title ?? "ESCALA DE TRABALHO 24x72"} — ${MONTH_LABELS[data.month]?.toUpperCase()} / ${data.year}`;
  title.font = { name: "Calibri", size: 16, bold: true };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(5).height = 21;

  // Linha 6: dias — linha 7: dia da semana
  const dayRow = sheet.getRow(6);
  const weekRow = sheet.getRow(7);
  leadHeaders.forEach((label, index) => {
    sheet.mergeCells(6, 1 + index, 7, 1 + index);
    const cell = sheet.getCell(6, 1 + index);
    cell.value = label;
    cell.font = { name: "Arial Black", size: 9 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });

  days.forEach((date, index) => {
    const dayCell = dayRow.getCell(lead + 1 + index);
    dayCell.value = date.getDate();
    dayCell.font = { name: "Arial Black", size: 9 };
    dayCell.alignment = { horizontal: "center", vertical: "middle" };
    dayCell.border = border;

    const weekCell = weekRow.getCell(lead + 1 + index);
    weekCell.value = WEEKDAY_LABELS[date.getDay()];
    weekCell.font = { name: "Calibri", size: 8, bold: true };
    weekCell.alignment = { horizontal: "center", vertical: "middle" };
    weekCell.border = border;

    const holiday = holidayName(toISODate(date));
    if (holiday) {
      const fill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: HOLIDAY_FILL } };
      dayCell.fill = fill;
      weekCell.fill = fill;
      dayCell.note = `Feriado: ${holiday}`;
    }
  });
  dayRow.height = 14;
  weekRow.height = 13;

  const vacations = data.vacations ?? [];
  let rowIndex = 8;

  for (const member of data.members) {
    const row = sheet.getRow(rowIndex);
    rowIndex += 1;
    const nameCell = row.getCell(1);
    nameCell.value = member.name;
    nameCell.font = { name: "Calibri", size: 9, bold: true };
    nameCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAME_FILL } };
    nameCell.border = border;

    const infoValues = extended
      ? [member.job_title ?? "", member.council ?? "", member.registry_number ?? "", member.work_hours ?? ""]
      : [member.job_title ?? ""];
    infoValues.forEach((value, index) => {
      const cell = row.getCell(2 + index);
      cell.value = value;
      cell.font = { name: "Calibri", size: 9 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = border;
    });

    const monthShift = memberShiftOn(member, data.rotations, toISODate(days[0]!));
    const shiftCell = row.getCell(lead);
    shiftCell.value = isDiarista(monthShift) ? "DIARISTA" : monthShift;
    shiftCell.font = { name: "Calibri", size: 9, bold: true };
    shiftCell.alignment = { horizontal: "center", vertical: "middle" };
    shiftCell.border = border;

    days.forEach((date, index) => {
      const dayISO = toISODate(date);
      const shift = memberShiftOn(member, data.rotations, dayISO);
      const cell = row.getCell(lead + 1 + index);
      const onVacation = vacationOn(member.id, vacations, dayISO) !== null;
      const works = !onVacation && isWorkDay(shift, data.anchorDate, dayISO);
      const diarista = isDiarista(shift);
      cell.value = onVacation ? "FÉR" : works ? (diarista ? "T" : "24h") : "";
      cell.font = { name: "Calibri", size: 8, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = border;
      if (onVacation) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VACATION_FILL } };
      } else if (works) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: diarista ? DIARISTA_FILL : WORK_FILL },
        };
      }
    });
    row.height = 20;

    const memberVacations = vacations.filter(
      (item) => item.member_id === member.id && vacationOverlapsMonth(item, data.year, data.month),
    );
    for (const vacation of memberVacations) {
      const coverRow = sheet.getRow(rowIndex);
      rowIndex += 1;
      const coverName = coverRow.getCell(1);
      coverName.value = `Cobertura de férias: ${vacation.cover_name}${
        vacation.cover_job_title ? ` — ${vacation.cover_job_title}` : ""
      } (${formatDateBR(vacation.start_date)} a ${formatDateBR(vacation.end_date)})`;
      coverName.font = { name: "Calibri", size: 9, italic: true };
      coverName.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      coverName.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAME_FILL } };
      coverName.border = border;

      const coverInfo = extended
        ? [vacation.cover_job_title ?? "", "", "", ""]
        : [vacation.cover_job_title ?? ""];
      coverInfo.forEach((value, index) => {
        const cell = coverRow.getCell(2 + index);
        cell.value = value;
        cell.font = { name: "Calibri", size: 9, italic: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = border;
      });

      const coverShift = coverRow.getCell(lead);
      coverShift.value = isDiarista(monthShift) ? "DIARISTA" : monthShift;
      coverShift.font = { name: "Calibri", size: 9, italic: true };
      coverShift.alignment = { horizontal: "center", vertical: "middle" };
      coverShift.border = border;

      days.forEach((date, index) => {
        const dayISO = toISODate(date);
        const shift = memberShiftOn(member, data.rotations, dayISO);
        const cell = coverRow.getCell(lead + 1 + index);
        const inRange = vacation.start_date <= dayISO && dayISO <= vacation.end_date;
        const works = inRange && isWorkDay(shift, data.anchorDate, dayISO);
        cell.value = works ? (isDiarista(shift) ? "T" : "24h") : "";
        cell.font = { name: "Calibri", size: 8, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = border;
        if (works) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COVER_FILL } };
      });
      coverRow.height = 20;
    }
  }

  const legendRow = rowIndex + 1;
  sheet.mergeCells(legendRow, 1, legendRow, lastCol);
  const legend = sheet.getCell(legendRow, 1);
  const monthHolidays = days
    .map((date) => ({ dayISO: toISODate(date), name: holidayName(toISODate(date)) }))
    .filter((item): item is { dayISO: string; name: string } => item.name !== null);
  legend.value = `Legenda: "24h" = plantão de 24 horas (escala 24x72, plantões SD1, SD2, SD3 e SD4). "T" = diarista, trabalho de segunda a sexta, sem fins de semana nem feriados. "FÉR" = colaborador em férias; a linha em verde mostra o profissional que cobre o período. Cabeçalho do dia em amarelo claro = feriado (Angra dos Reis / Rio de Janeiro / nacional). Feriados do mês: ${
    monthHolidays.length > 0
      ? monthHolidays.map((item) => `${formatDateBR(item.dayISO)} - ${item.name}`).join("; ")
      : "nenhum"
  }.${data.notes ? ` Observações: ${data.notes}` : ""}`;
  legend.font = { name: "Calibri", size: 9, italic: true };
  legend.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  return workbook;
}

export async function downloadWorkScheduleExcel(data: WorkScheduleExport) {
  const workbook = await buildWorkScheduleWorkbook(data);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.fileSlug ?? "escala-trabalho"}_${data.year}-${String(data.month + 1).padStart(2, "0")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
