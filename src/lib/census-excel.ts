import ExcelJS from "exceljs";
import igedesLogo from "@/assets/igedes.png";
import prefeituraLogo from "@/assets/prefeitura-angra.png";
import ilpiLogo from "@/assets/ilpi-symbol.png";
import { CENSUS_COLUMNS, formatCensusDate } from "./nursing-census";
import type { NursingCensusForDoc } from "./docx-export";

const NAME_FILL = "FFFFC000";
const DEP_FILL = "FFFFFF00";
const HEADER_COLOR = "FF040C28";

async function loadImage(url: string) {
  const response = await fetch(url);
  return await response.arrayBuffer();
}

const border = {
  top: { style: "thin" as const },
  bottom: { style: "thin" as const },
  left: { style: "thin" as const },
  right: { style: "thin" as const },
};

const INSTITUTION_HEADER = [
  "ESTADO DO RIO DE JANEIRO",
  "PREFEITURA MUNICIPAL DE ANGRA DOS REIS",
  "SECRETARIA MUNICIPAL DE DESENVOLVIMENTO SOCIAL E PROMOÇÃO DA CIDADANIA",
  "INSTITUIÇÃO DE LONGA PERMANÊNCIA PARA IDOSO",
  "LUIZA OLINDINA DA SILVA ALVES",
].join("\n");

/** Larguras conforme a planilha institucional enviada (CENSO). */
const COLUMN_WIDTHS: Record<string, number> = {
  dependencia: 28.9,
  dn: 10.9,
  grau: 6.3,
  diagnostico: 16.1,
  tax: 5.8,
  fr: 4.2,
  fc: 4.6,
  spo2: 5.7,
  pa: 9,
  news: 6.4,
  dieta: 11.4,
  diurese: 12.2,
  fezes: 12.3,
};

const LEFT_KEYS = new Set(["dependencia", "dn", "diagnostico"]);

/** Gera o Censo de Enfermagem em .xlsx seguindo exatamente o padrão da planilha institucional. */
export async function buildNursingCensusWorkbook(census: NursingCensusForDoc) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AGA ILPI";
  workbook.created = new Date();

  const sheetName = formatCensusDate(census.census_date).replace(/[*?:\\/[\]]/g, ".").slice(0, 31);
  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
  });

  sheet.columns = [
    { width: 3.2 },
    { width: 29.9 },
    ...CENSUS_COLUMNS.map((column) => ({ width: COLUMN_WIDTHS[column.key] ?? 10 })),
  ];

  const lastCol = 2 + CENSUS_COLUMNS.length;

  // Cabeçalho institucional (linhas 1 a 4) com os logos sobrepostos
  sheet.mergeCells(1, 1, 4, lastCol);
  const headerCell = sheet.getCell(1, 1);
  headerCell.value = INSTITUTION_HEADER;
  headerCell.font = { name: "Arial", size: 9, bold: true, color: { argb: HEADER_COLOR } };
  headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  for (let row = 1; row <= 4; row += 1) sheet.getRow(row).height = 15;

  const [prefeitura, ilpi, igedes] = await Promise.all([
    loadImage(prefeituraLogo),
    loadImage(ilpiLogo),
    loadImage(igedesLogo),
  ]);

  sheet.addImage(workbook.addImage({ buffer: prefeitura as ExcelJS.Buffer, extension: "png" }), {
    tl: { col: 1.05, row: 0.1 },
    ext: { width: 123, height: 58 },
  });
  sheet.addImage(workbook.addImage({ buffer: ilpi as ExcelJS.Buffer, extension: "png" }), {
    tl: { col: lastCol - 3.1, row: 0.1 },
    ext: { width: 58, height: 58 },
  });
  sheet.addImage(workbook.addImage({ buffer: igedes as ExcelJS.Buffer, extension: "png" }), {
    tl: { col: lastCol - 2.1, row: 0.2 },
    ext: { width: 137, height: 50 },
  });

  // Linha 5: responsável e data
  sheet.mergeCells(5, 1, 5, lastCol);
  const subtitle = sheet.getCell(5, 1);
  subtitle.value = `${census.nurse_name ? `${census.nurse_name.toUpperCase()} - ` : ""}${formatCensusDate(
    census.census_date,
  )}`;
  subtitle.font = { name: "Calibri", size: 16, bold: true };
  subtitle.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(5).height = 21;

  // Linha 6: cabeçalho da tabela
  const headerRow = sheet.getRow(6);
  sheet.mergeCells(6, 1, 6, 2);
  const labels = ["NOME", "", ...CENSUS_COLUMNS.map((column) => column.label.toUpperCase())];
  labels.forEach((label, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = label;
    cell.font = { name: "Arial Black", size: 9, bold: true };
    cell.alignment = {
      horizontal: index >= 2 && LEFT_KEYS.has(CENSUS_COLUMNS[index - 2]?.key ?? "") ? "left" : "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = border;
  });
  headerRow.height = 13.8;

  census.rows.forEach((row, rowIndex) => {
    const sheetRow = sheet.getRow(7 + rowIndex);
    const values = [String(rowIndex + 1), row["nome"] ?? "", ...CENSUS_COLUMNS.map((c) => String(row[c.key] ?? ""))];
    values.forEach((value, index) => {
      const cell = sheetRow.getCell(index + 1);
      cell.value = value;
      cell.font = { name: "Calibri", size: 9, bold: true };
      cell.border = border;
      const key = index >= 2 ? CENSUS_COLUMNS[index - 2]?.key : undefined;
      cell.alignment = {
        horizontal: index === 1 || (key && LEFT_KEYS.has(key)) ? "left" : "center",
        vertical: "middle",
        wrapText: true,
      };
      if (index === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAME_FILL } };
      if (key === "dependencia") cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DEP_FILL } };
    });
    sheetRow.height = 22.2;
  });

  return workbook;
}

export async function downloadNursingCensusExcel(census: NursingCensusForDoc) {
  const workbook = await buildNursingCensusWorkbook(census);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `censo-enfermagem_${census.census_date}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
