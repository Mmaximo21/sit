import { MEALS, asCalorieValue, entryValue, sumEntries } from "@/lib/nutrition/calc";
import { NUTRIENTS, formatValue } from "@/lib/nutrition/nutrients";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HorizontalPositionRelativeFrom,
  ImageRun,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import type { Field, FormSpec } from "./forms/types";
import { computeSum, formatNumber } from "./forms/compute";
import { FOOTER_LOGO_JPG_BASE64, LETTERHEAD_BACKGROUND_PNG_BASE64 } from "./letterhead-assets";
import { asAttachments } from "./attachments";
import type { ProtocolImage } from "./protocol-images";
import { parseSectionTitle } from "./forms/section-numbering";

/** Páginas dos protocolos já renderizadas para embutir no documento em geração. */
const renderedProtocols = new Map<string, ProtocolImage[]>();

/** Assinatura digitalizada da especialidade, carregada antes de montar o documento. */
let signatureImage: {
  data: Uint8Array;
  type: "png" | "jpg";
  width: number;
  height: number;
} | null = null;
import { CENSUS_COLUMNS } from "./nursing-census";

export type AssessmentForDoc = {
  id: string;
  specialty: string;
  resident_name: string;
  status: string;
  master_notes?: string | null;
  submitted_at?: string | null;
  closed_at?: string | null;
  data: Record<string, unknown>;
  admission_date?: string | null;
  diagnosis?: string | null;
};

// ===== Parâmetros ABNT (NBR 14724) =====
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const PAGE_MARGIN = { top: 2200, right: 1134, bottom: 1500, left: 1701 };
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN.left - PAGE_MARGIN.right;

const FONT = "Arial";
const SIZE_BODY = 24; // 12 pt
const SIZE_SMALL = 20; // 10 pt
const SIZE_TINY = 18; // 9 pt
const LINE_1_5 = 360;
const LINE_1_0 = 240;
const INDENT_FIRST = 709;

const INK = "1A1A1A";
const PINE = "1F4B3F";
const GRID = "BFCBC4";
const HEAD_FILL = "E4EDE8";
const ZEBRA_FILL = "F5F8F6";
const LABEL_FILL = "F0F4F1";

const thin = { style: BorderStyle.SINGLE, size: 4, color: GRID };
const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };
const cellMargins = { top: 70, bottom: 70, left: 120, right: 120 };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function letterheadHeader(landscape = false) {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0, line: LINE_1_0 },
        children: [
          new ImageRun({
            type: "png",
            data: LETTERHEAD_BACKGROUND_PNG_BASE64,
            transformation: landscape ? { width: 1123, height: 794 } : { width: 794, height: 1123 },
            floating: {
              behindDocument: true,
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
            },
            altText: {
              title: "Papel timbrado",
              description:
                "Prefeitura Municipal de Angra dos Reis — Secretaria de Desenvolvimento Social",
              name: "timbre",
            },
          }),
          new TextRun({ text: "Página ", font: FONT, size: SIZE_TINY, color: "4A4A4A" }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT,
            size: SIZE_TINY,
            color: "4A4A4A",
          }),
          new TextRun({ text: " de ", font: FONT, size: SIZE_TINY, color: "4A4A4A" }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: FONT,
            size: SIZE_TINY,
            color: "4A4A4A",
          }),
        ],
      }),
    ],
  });
}

function letterheadFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_1_0, after: 0 },
        children: [
          new ImageRun({
            type: "jpg",
            data: FOOTER_LOGO_JPG_BASE64,
            transformation: { width: 145, height: 43 },
            altText: {
              title: "IGEDES",
              description: "Instituto de Gestão e Desenvolvimento",
              name: "igedes",
            },
          }),
        ],
      }),
    ],
  });
}

// ===== Blocos textuais =====

function textOf(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function cell(
  text: string,
  opts: {
    width: number;
    bold?: boolean;
    fill?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    size?: number;
    color?: string;
  },
) {
  return new TableCell({
    borders: cellBorders,
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    width: { size: opts.width, type: WidthType.DXA },
    ...(opts.fill ? { shading: { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } } : {}),
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        spacing: { after: 0, line: LINE_1_0 },
        children: [
          new TextRun({
            text: text || "—",
            bold: opts.bold ?? false,
            size: opts.size ?? SIZE_SMALL,
            color: opts.color ?? INK,
          }),
        ],
      }),
    ],
  });
}

/** Faixa de título de seção (numeração progressiva ABNT), com fundo institucional. */
function sectionHeading(number: string, text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160, line: LINE_1_0 },
    keepNext: true,
    shading: { fill: HEAD_FILL, type: ShadingType.CLEAR, color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: PINE, space: 6 } },
    indent: { left: 60, right: 60 },
    children: [
      new TextRun({ text: number ? `${number}  ${text.toUpperCase()}` : text.toUpperCase() }),
    ],
  });
}

function subHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 100, line: LINE_1_0 },
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GRID, space: 2 } },
    children: [new TextRun({ text })],
  });
}

/** Rótulo de campo textual longo. */
function fieldLabel(text: string) {
  return new Paragraph({
    spacing: { before: 160, after: 60, line: LINE_1_0 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, size: SIZE_SMALL, color: PINE, allCaps: false })],
  });
}

/** Parágrafo corrido: justificado, entrelinha 1,5, recuo de primeira linha. */
function bodyParagraph(text: string, indent = true) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: LINE_1_5 },
    ...(indent ? { indent: { firstLine: INDENT_FIRST } } : {}),
    children: [new TextRun({ text: text || "—" })],
  });
}

function tableCaption(number: number, text: string) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 60, line: LINE_1_0 },
    keepNext: true,
    children: [new TextRun({ text: `Quadro ${number} — ${text}`, bold: true, size: SIZE_SMALL })],
  });
}

function tableSource(spec: FormSpec) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 60, after: 220, line: LINE_1_0 },
    children: [
      new TextRun({
        text: `Fonte: ${spec.title} — instrumento institucional.`,
        size: SIZE_TINY,
        italics: true,
        color: "5A6560",
      }),
    ],
  });
}

/** Quadro de dados em grade (cabeçalho + linhas zebradas). */
function gridTable(headers: string[], rows: string[][]) {
  const base = Math.floor(CONTENT_WIDTH / headers.length);
  const widths = headers.map((_, i) =>
    i === headers.length - 1 ? CONTENT_WIDTH - base * (headers.length - 1) : base,
  );
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) =>
          cell(h, {
            width: widths[i]!,
            bold: true,
            fill: HEAD_FILL,
            align: AlignmentType.CENTER,
            color: PINE,
          }),
        ),
      }),
      ...rows.map(
        (r, ri) =>
          new TableRow({
            children: r.map((c, i) =>
              cell(c, { width: widths[i]!, ...(ri % 2 === 1 ? { fill: ZEBRA_FILL } : {}) }),
            ),
          }),
      ),
    ],
  });
}

/** Quadro rótulo/valor em duas colunas — organiza campos simples. */
function infoTable(pairs: [string, string][]) {
  const labelWidth = Math.round(CONTENT_WIDTH * 0.42);
  const valueWidth = CONTENT_WIDTH - labelWidth;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [labelWidth, valueWidth],
    rows: pairs.map(
      ([labelText, value]) =>
        new TableRow({
          cantSplit: true,
          children: [
            cell(labelText, { width: labelWidth, bold: true, fill: LABEL_FILL, color: PINE }),
            cell(value, { width: valueWidth }),
          ],
        }),
    ),
  });
}

type Counter = { table: number };

const SIMPLE_TYPES = new Set(["text", "date", "number", "select", "radio", "checkbox", "computed"]);

/** Datas em ISO (yyyy-mm-dd) são apresentadas no formato brasileiro. */
function formatDateBR(raw: string | null | undefined) {
  if (!raw) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
}

function simpleValue(
  field: Field,
  values: Record<string, unknown>,
  spec: FormSpec,
): [string, string] {
  if (field.type === "computed")
    return [field.label, formatNumber(computeSum(field, values, spec))];
  const raw =
    field.type === "date" ? formatDateBR(textOf(values[field.key])) : textOf(values[field.key]);
  const suffix = field.type === "number" && field.suffix && raw ? ` ${field.suffix}` : "";
  return [field.label, raw ? `${raw}${suffix}` : ""];
}

/** Blocos de um campo não-simples (textos longos, quadros e escalas). */
function complexBlocks(
  field: Field,
  values: Record<string, unknown>,
  spec: FormSpec,
  counter: Counter,
): (Paragraph | Table)[] {
  const value = values[field.key];
  switch (field.type) {
    case "note":
      return [subHeading(field.label)];
    case "textarea": {
      const text = textOf(value);
      return [
        fieldLabel(field.label),
        ...(text.trim() === ""
          ? [bodyParagraph("—", false)]
          : text
              .split(/\r?\n/)
              .filter((line) => line.trim() !== "")
              .map((line) => bodyParagraph(line.trim()))),
      ];
    }
    case "sided": {
      const record = (value as Record<string, string>) ?? {};
      counter.table += 1;
      return [
        tableCaption(counter.table, field.label),
        gridTable(field.sides, [field.sides.map((s) => textOf(record[s]))]),
        tableSource(spec),
      ];
    }
    case "table": {
      const rows: Record<string, unknown>[] = Array.isArray(value)
        ? (value as Record<string, unknown>[])
        : (field.rows ?? []);
      const filled = rows.filter((row) =>
        field.columns.some((c) => textOf(row[c.key]).trim() !== ""),
      );
      counter.table += 1;
      return [
        tableCaption(counter.table, field.label),
        gridTable(
          field.columns.map((c) => c.label),
          (filled.length ? filled : [{}]).map((row) =>
            field.columns.map((c) => textOf(row[c.key])),
          ),
        ),
        tableSource(spec),
      ];
    }
    case "calorias":
      return calorieBlocks(field.label, value, spec, counter);
    case "attachments":
      return attachmentBlocks(field.label, value, spec, counter);
    default:
      return [];
  }
}

/** Cálculo calórico: quadro dos alimentos por refeição e quadro de nutrientes totais. */
function calorieBlocks(
  label: string,
  value: unknown,
  spec: FormSpec,
  counter: Counter,
): (Paragraph | Table)[] {
  const { entries } = asCalorieValue(value);
  const out: (Paragraph | Table)[] = [subHeading(label)];

  if (!entries.length) {
    out.push(bodyParagraph("Nenhum alimento registrado no cálculo calórico.", false));
    return out;
  }

  const num = (n: number, d = 1) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

  const rows: string[][] = [];
  for (const meal of MEALS) {
    const items = entries.filter((e) => e.meal === meal);
    if (!items.length) continue;
    for (const item of items) {
      rows.push([
        meal,
        item.name,
        num(Number(item.grams) || 0, 0),
        num(entryValue(item, "kcal"), 0),
        num(entryValue(item, "protein")),
        num(entryValue(item, "carbs")),
        num(entryValue(item, "fat")),
      ]);
    }
  }

  const totals = sumEntries(entries);
  const totalGrams = entries.reduce((s, e) => s + (Number(e.grams) || 0), 0);
  rows.push([
    "TOTAL",
    `${entries.length} ${entries.length === 1 ? "item" : "itens"}`,
    num(totalGrams, 0),
    num(totals.kcal, 0),
    num(totals.protein),
    num(totals.carbs),
    num(totals.fat),
  ]);

  counter.table += 1;
  out.push(
    tableCaption(counter.table, `${label} — alimentos registrados por refeição`),
    gridTable(
      ["Refeição", "Alimento", "Qtd. (g)", "Energia (kcal)", "Prot. (g)", "Carb. (g)", "Gord. (g)"],
      rows,
    ),
    tableSource(spec),
  );

  counter.table += 1;
  out.push(
    tableCaption(counter.table, `${label} — composição nutricional total e % dos valores diários`),
    gridTable(
      ["Nutriente", "Total", "Unidade", "% VD"],
      NUTRIENTS.map((n) => [
        n.label,
        formatValue(totals[n.key] ?? 0, n),
        n.unit,
        n.dv ? `${Math.round(((totals[n.key] ?? 0) / n.dv) * 100)}%` : "—",
      ]),
    ),
    tableSource(spec),
  );

  out.push(
    bodyParagraph(
      "Percentuais dos valores diários de referência calculados para adultos em dieta de 2000 kcal, conforme tabelas USDA FoodData Central, TBCA/TACO e FAO/INFOODS. Os valores são estimativas e não substituem a avaliação clínica individualizada.",
    ),
  );

  return out;
}

/** Protocolos de testes anexados: ficha do arquivo, imagem digitalizada e transcrição. */
function attachmentBlocks(
  label: string,
  value: unknown,
  spec: FormSpec,
  counter: Counter,
): (Paragraph | Table)[] {
  const items = asAttachments(value);
  const out: (Paragraph | Table)[] = [subHeading(label)];

  if (!items.length) {
    out.push(bodyParagraph("Nenhum protocolo de teste anexado.", false));
    return out;
  }

  counter.table += 1;
  out.push(
    tableCaption(counter.table, `${label} — arquivos anexados`),
    gridTable(
      ["Arquivo", "Data do envio"],
      items.map((item) => [item.name, formatDateBR((item.uploadedAt ?? "").slice(0, 10))]),
    ),
    tableSource(spec),
  );

  for (const item of items) {
    const pages = renderedProtocols.get(item.path) ?? [];
    if (!pages.length) continue;
    out.push(
      bodyParagraph(`Protocolo digitalizado: ${item.name}`, false),
      ...pages.map(
        (page, index) =>
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200, line: LINE_1_0 },
            children: [
              new ImageRun({
                type: "png",
                data: page.data,
                transformation: { width: page.width, height: page.height },
                altText: {
                  title: item.name,
                  description: `Página ${index + 1} do protocolo ${item.name}`,
                  name: `protocolo-${index + 1}`,
                },
              }),
            ],
          }),
      ),
    );
  }

  return out;
}

/** Agrupa campos simples consecutivos num único quadro rótulo/valor. */
function sectionBlocks(
  fields: Field[],
  values: Record<string, unknown>,
  spec: FormSpec,
  counter: Counter,
): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  let buffer: [string, string][] = [];

  const flush = () => {
    if (!buffer.length) return;
    out.push(infoTable(buffer));
    out.push(new Paragraph({ spacing: { after: 160, line: LINE_1_0 }, children: [] }));
    buffer = [];
  };

  for (const field of fields) {
    if (SIMPLE_TYPES.has(field.type)) {
      buffer.push(simpleValue(field, values, spec));
      continue;
    }
    flush();
    out.push(...complexBlocks(field, values, spec, counter));
  }
  flush();
  return out;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Enviada",
  closed: "Fechada",
};

export function buildAssessmentDocument(assessment: AssessmentForDoc, spec: FormSpec) {
  const counter: Counter = { table: 0 };
  const now = new Date();

  const children: (Paragraph | Table)[] = [
    // Folha de identificação (ABNT: título centralizado, caixa alta, negrito)
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "I.L.P.I — LUIZA OLINDINA SILVA ALVES",
          size: SIZE_TINY,
          bold: true,
          color: "5A6560",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60, line: LINE_1_0 },
      children: [new TextRun({ text: spec.title.toUpperCase(), bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320, line: LINE_1_0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PINE, space: 6 } },
      children: [
        new TextRun({
          text: (spec.subtitle ?? `Especialidade: ${assessment.specialty}`).toUpperCase(),
          size: SIZE_SMALL,
          color: "5A6560",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 100, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "IDENTIFICAÇÃO DO DOCUMENTO",
          bold: true,
          size: SIZE_SMALL,
          color: PINE,
        }),
      ],
    }),
    infoTable(
      (
        [
          ["Residente", assessment.resident_name],
          ...(assessment.admission_date
            ? [["Data de acolhimento", formatDateBR(assessment.admission_date)]]
            : []),
          ...(assessment.diagnosis ? [["Diagnóstico", assessment.diagnosis]] : []),
          ["Especialidade", assessment.specialty],
          ["Situação do documento", STATUS_LABEL[assessment.status] ?? assessment.status],
          [
            "Data de envio",
            assessment.submitted_at
              ? new Date(assessment.submitted_at).toLocaleString("pt-BR")
              : "",
          ],
          [
            "Data de fechamento",
            assessment.closed_at ? new Date(assessment.closed_at).toLocaleString("pt-BR") : "",
          ],
          ["Emitido em", now.toLocaleString("pt-BR")],
        ] as [string, string][]
      ).filter(([, v]) => v !== "" && v != null),
    ),
  ];

  spec.sections.forEach((section, index) => {
    const numberedTitle = parseSectionTitle(section.title);
    const isClosing = section.fields.some((f) => f.key === "data_encerramento");
    children.push(
      sectionHeading(
        isClosing ? "" : (numberedTitle.number ?? String(index + 1)),
        numberedTitle.title,
      ),
    );
    if (section.subtitle) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 140, line: LINE_1_0 },
          keepNext: true,
          children: [
            new TextRun({
              text: section.subtitle.toUpperCase(),
              bold: true,
              size: SIZE_SMALL,
              color: INK,
            }),
          ],
        }),
      );
    }
    if (section.description) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 140, line: LINE_1_0 },
          children: [
            new TextRun({
              text: section.description,
              italics: true,
              size: SIZE_SMALL,
              color: "5A6560",
            }),
          ],
        }),
      );
    }
    children.push(...sectionBlocks(section.fields, assessment.data ?? {}, spec, counter));
  });

  if (assessment.master_notes) {
    children.push(
      sectionHeading(String(spec.sections.length + 1), "Observações da administração"),
      bodyParagraph(assessment.master_notes),
    );
  }

  // Bloco de assinatura: linha de assinatura centralizada, sem bordas de tabela.
  const profissional = textOf((assessment.data ?? {})["profissional"]);
  const registro = textOf((assessment.data ?? {})["registro"]);
  const conselho = textOf((assessment.data ?? {})["conselho"])
    .split("—")[0]!
    .trim();
  const registroLinha = registro
    ? `${conselho ? `${conselho} nº ` : "Registro profissional: "}${registro}`
    : "";
  const local = textOf((assessment.data ?? {})["local"]);
  const dataEnc = textOf((assessment.data ?? {})["data_encerramento"]);

  const signWidth = Math.round(CONTENT_WIDTH * 0.62);
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 520, after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: [local, dataEnc].filter(Boolean).join(", "),
          size: SIZE_SMALL,
        }),
      ],
    }),
    // Assinatura digitalizada da especialidade, logo acima da linha de assinatura.
    ...(signatureImage
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 0, line: LINE_1_0 },
            children: [
              new ImageRun({
                type: signatureImage.type,
                data: signatureImage.data,
                transformation: { width: signatureImage.width, height: signatureImage.height },
                altText: {
                  title: "Assinatura digital",
                  description: `Assinatura digitalizada da especialidade ${assessment.specialty}`,
                  name: "assinatura",
                },
              }),
            ],
          }),
        ]
      : []),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [
        Math.round((CONTENT_WIDTH - signWidth) / 2),
        signWidth,
        CONTENT_WIDTH - signWidth - Math.round((CONTENT_WIDTH - signWidth) / 2),
      ],
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: noBorders,
              width: { size: Math.round((CONTENT_WIDTH - signWidth) / 2), type: WidthType.DXA },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              borders: { ...noBorders, top: { style: BorderStyle.SINGLE, size: 6, color: INK } },
              width: { size: signWidth, type: WidthType.DXA },
              margins: { top: 90, bottom: 0, left: 0, right: 0 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0, line: LINE_1_0 },
                  children: [
                    new TextRun({ text: profissional || "Profissional responsável", bold: true }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0, line: LINE_1_0 },
                  children: [
                    new TextRun({ text: registroLinha || assessment.specialty, size: SIZE_SMALL }),
                  ],
                }),
              ],
            }),
            new TableCell({
              borders: noBorders,
              width: {
                size: CONTENT_WIDTH - signWidth - Math.round((CONTENT_WIDTH - signWidth) / 2),
                type: WidthType.DXA,
              },
              children: [new Paragraph({ children: [] })],
            }),
          ],
        }),
      ],
    }),
  );

  return new Document({
    creator: "Sistema AGA — ILPI",
    title: `${spec.title} — ${assessment.resident_name}`,
    description: "Documento gerado conforme normas ABNT (NBR 14724).",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY, color: INK },
          paragraph: { spacing: { line: LINE_1_5, after: 120 } },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: FONT, color: INK },
          paragraph: { spacing: { before: 0, after: 120, line: LINE_1_0 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: SIZE_BODY, bold: true, font: FONT, color: PINE },
          paragraph: { spacing: { before: 320, after: 160, line: LINE_1_0 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: SIZE_SMALL, bold: true, font: FONT, color: INK },
          paragraph: { spacing: { before: 220, after: 100, line: LINE_1_0 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: PAGE_MARGIN,
          },
        },
        headers: { default: letterheadHeader() },
        footers: { default: letterheadFooter() },
        children,
      },
    ],
  });
}

export function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "avaliacao"
  );
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Todos os protocolos anexados nos campos do tipo "attachments". */
function collectAttachments(spec: FormSpec, values: Record<string, unknown>) {
  const out: { path: string; name: string; type: string }[] = [];
  for (const section of spec.sections) {
    for (const field of section.fields) {
      if (field.type !== "attachments") continue;
      for (const item of asAttachments(values[field.key])) {
        out.push({ path: item.path, name: item.name, type: item.type ?? "" });
      }
    }
  }
  return out;
}

export async function downloadAssessmentDocx(
  assessment: AssessmentForDoc,
  spec: FormSpec,
  prefix?: string,
) {
  const name = [prefix, assessment.specialty, assessment.resident_name || "sem-nome"]
    .filter(Boolean)
    .map((part) => slugify(String(part)))
    .join("_");

  const attachments = collectAttachments(spec, assessment.data ?? {});
  renderedProtocols.clear();

  // Assinatura digitalizada cadastrada uma única vez por especialidade.
  signatureImage = null;
  try {
    const { loadSignatureImage } = await import("./signatures");
    signatureImage = await loadSignatureImage(assessment.specialty);
  } catch {
    // Sem assinatura cadastrada o documento mantém apenas a linha de assinatura.
  }

  if (attachments.length) {
    const [{ getTestFileUrl }, { renderProtocol }] = await Promise.all([
      import("./psych-tests.functions"),
      import("./protocol-images"),
    ]);

    for (const item of attachments) {
      try {
        const { url } = await getTestFileUrl({ data: { path: item.path, fileName: item.name } });
        const response = await fetch(url);
        if (!response.ok) continue;
        const blob = await response.blob();
        const typed = item.type ? blob.slice(0, blob.size, item.type) : blob;
        const pages = await renderProtocol(typed, item.name);
        if (pages.length) renderedProtocols.set(item.path, pages);
      } catch {
        // Um protocolo indisponível não deve impedir o download da avaliação.
      }
    }
  }

  const blob = await Packer.toBlob(buildAssessmentDocument(assessment, spec));
  renderedProtocols.clear();
  signatureImage = null;
  triggerDownload(blob, `${name}.docx`);
}

// ===== Relatório de Passagem de Plantão =====

export type ShiftReportForDoc = {
  report_date: string;
  content: string;
  author_name: string;
  registry?: string | null;
};

export function formatShiftReportDate(raw: string) {
  const [y, m, d] = raw.split("-");
  return d && m && y ? `${d}/${m}/${y}` : raw;
}

/** Texto pronto para envio em WhatsApp. */
export function shiftReportWhatsappText(report: ShiftReportForDoc) {
  const lines = [
    "*Relatório de Passagem de Plantão*",
    `Referente ao plantão do dia ${formatShiftReportDate(report.report_date)}`,
    "",
    ...report.content
      .trim()
      .split(/\n+/)
      .map((line) => line.trim()),
    "",
    `_${report.author_name}_`,
  ];
  return lines.join("\n");
}

export function buildShiftReportDocument(report: ShiftReportForDoc) {
  const paragraphs = report.content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "I.L.P.I — LUIZA OLINDINA SILVA ALVES",
          size: SIZE_TINY,
          bold: true,
          color: "5A6560",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60, line: LINE_1_0 },
      children: [new TextRun({ text: "RELATÓRIO DE PASSAGEM DE PLANTÃO", bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320, line: LINE_1_0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PINE, space: 6 } },
      children: [
        new TextRun({
          text: `REFERENTE AO PLANTÃO DO DIA ${formatShiftReportDate(report.report_date)}`,
          size: SIZE_SMALL,
          color: "5A6560",
        }),
      ],
    }),
    infoTable([
      ["Responsável", report.author_name],
      ["Setor", "Supervisor Administrativo"],
      ["Data do plantão", formatShiftReportDate(report.report_date)],
      ["Emitido em", new Date().toLocaleString("pt-BR")],
    ]),
    sectionHeading("1", "Relato do plantão"),
    ...(paragraphs.length
      ? paragraphs.map((text) => bodyParagraph(text))
      : [bodyParagraph("Sem registros informados.", false)]),
    new Paragraph({ spacing: { before: 700, after: 0, line: LINE_1_0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "__________________________________________",
          font: FONT,
          size: SIZE_BODY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: report.author_name,
          font: FONT,
          size: SIZE_SMALL,
          bold: true,
          color: INK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: report.registry ? `Registro: ${report.registry}` : "Supervisão Administrativa",
          font: FONT,
          size: SIZE_TINY,
          color: "5A6560",
        }),
      ],
    }),
  ];

  return new Document({
    creator: "AGA ILPI",
    title: "Relatório de Passagem de Plantão",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY, color: INK },
          paragraph: {
            spacing: { line: LINE_1_5, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: PAGE_MARGIN },
        },
        headers: { default: letterheadHeader() },
        footers: { default: letterheadFooter() },
        children,
      },
    ],
  });
}

export async function downloadShiftReportDocx(report: ShiftReportForDoc) {
  const blob = await Packer.toBlob(buildShiftReportDocument(report));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-plantao_${report.report_date}_${slugify(report.author_name)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ===== Censo de Enfermagem =====

const CENSUS_MARGIN = { top: 2200, right: 500, bottom: 1500, left: 500 };
const CENSUS_WIDTHS = [
  435, 1972, 1632, 1115, 626, 1605, 639, 476, 476, 680, 870, 762, 1265, 1142, 1129,
];

const SIZE_MICRO = 13; // ~6,5 pt

export type NursingCensusForDoc = {
  census_date: string;
  nurse_name: string;
  rows: { nome: string; [key: string]: string }[];
};

function censusCell(
  text: string,
  opts: { index: number; head?: boolean; zebra?: boolean; center?: boolean },
) {
  return new TableCell({
    width: { size: CENSUS_WIDTHS[opts.index] ?? 600, type: WidthType.DXA },
    borders: cellBorders,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    verticalAlign: VerticalAlign.CENTER,
    ...(opts.head || opts.zebra
      ? {
          shading: {
            type: ShadingType.CLEAR,
            fill: opts.head ? HEAD_FILL : ZEBRA_FILL,
            color: "auto",
          },
        }
      : {}),
    children: [
      new Paragraph({
        alignment: opts.head || opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: LINE_1_0 },
        children: [
          new TextRun({
            text,
            font: FONT,
            size: SIZE_MICRO,
            bold: Boolean(opts.head),
            color: opts.head ? PINE : INK,
          }),
        ],
      }),
    ],
  });
}

export function buildNursingCensusDocument(census: NursingCensusForDoc) {
  const headers = ["Nº", "Nome", ...CENSUS_COLUMNS.map((c) => c.label)];

  const table = new Table({
    width: { size: CENSUS_WIDTHS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: CENSUS_WIDTHS,
    borders: cellBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((label, index) => censusCell(label, { index, head: true })),
      }),
      ...census.rows.map(
        (row, rowIndex) =>
          new TableRow({
            children: [
              censusCell(String(rowIndex + 1), {
                index: 0,
                zebra: rowIndex % 2 === 1,
                center: true,
              }),
              censusCell(row["nome"] ?? "", { index: 1, zebra: rowIndex % 2 === 1 }),
              ...CENSUS_COLUMNS.map((column, columnIndex) =>
                censusCell(String(row[column.key] ?? ""), {
                  index: columnIndex + 2,
                  zebra: rowIndex % 2 === 1,
                  center: !["dependencia", "diagnostico", "dieta"].includes(column.key),
                }),
              ),
            ],
          }),
      ),
    ],
  });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "I.L.P.I — LUIZA OLINDINA SILVA ALVES",
          size: SIZE_TINY,
          bold: true,
          color: "5A6560",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60, line: LINE_1_0 },
      children: [new TextRun({ text: "CENSO DE ENFERMAGEM", bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240, line: LINE_1_0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PINE, space: 6 } },
      children: [
        new TextRun({
          text: `${census.nurse_name ? `${census.nurse_name.toUpperCase()} — ` : ""}${formatShiftReportDate(census.census_date)}`,
          size: SIZE_SMALL,
          color: "5A6560",
        }),
      ],
    }),
    table,
    new Paragraph({ spacing: { before: 500, after: 0, line: LINE_1_0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "__________________________________________",
          font: FONT,
          size: SIZE_SMALL,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: census.nurse_name || "Enfermagem",
          font: FONT,
          size: SIZE_SMALL,
          bold: true,
          color: INK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: `Enfermagem · emitido em ${new Date().toLocaleString("pt-BR")}`,
          font: FONT,
          size: SIZE_TINY,
          color: "5A6560",
        }),
      ],
    }),
  ];

  return new Document({
    creator: "AGA ILPI",
    title: `Censo de Enfermagem ${census.census_date}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY, color: INK },
          paragraph: {
            spacing: { line: LINE_1_5, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: CENSUS_MARGIN,
          },
        },
        headers: { default: letterheadHeader(true) },
        footers: { default: letterheadFooter() },

        children,
      },
    ],
  });
}

export async function downloadNursingCensusDocx(census: NursingCensusForDoc) {
  const blob = await Packer.toBlob(buildNursingCensusDocument(census));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `censo-enfermagem_${census.census_date}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ===== Escala NEWS (todos os residentes) =====

const NEWS_MARGIN = { top: 2200, right: 700, bottom: 1500, left: 700 };
const NEWS_WIDTHS = [620, 3600, 1150, 1150, 1150, 1150, 1150, 2300, 1150, 2018];
const SIZE_NEWS = 16;

export type NewsScaleRow = {
  nome: string;
  fr: string;
  spo2: string;
  temp: string;
  pas: string;
  fc: string;
  mental: string;
  total: number;
  classification: string;
};

export type NewsScaleForDoc = {
  evaluation_date: string;
  nurse_name: string;
  rows: NewsScaleRow[];
};

function newsCell(
  text: string,
  opts: { index: number; head?: boolean; zebra?: boolean; center?: boolean },
) {
  return new TableCell({
    width: { size: NEWS_WIDTHS[opts.index] ?? 700, type: WidthType.DXA },
    borders: cellBorders,
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    verticalAlign: VerticalAlign.CENTER,
    ...(opts.head || opts.zebra
      ? {
          shading: {
            type: ShadingType.CLEAR,
            fill: opts.head ? HEAD_FILL : ZEBRA_FILL,
            color: "auto",
          },
        }
      : {}),
    children: [
      new Paragraph({
        alignment: opts.head || opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: LINE_1_0 },
        children: [
          new TextRun({
            text,
            font: FONT,
            size: SIZE_NEWS,
            bold: Boolean(opts.head),
            color: opts.head ? PINE : INK,
          }),
        ],
      }),
    ],
  });
}

export function buildNewsScaleDocument(scale: NewsScaleForDoc) {
  const headers = [
    "Nº",
    "Nome do residente",
    "FR",
    "SpO₂",
    "T °C",
    "PAS",
    "FC",
    "Estado mental",
    "NEWS",
    "Classificação",
  ];

  const table = new Table({
    width: { size: NEWS_WIDTHS.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: NEWS_WIDTHS,
    borders: cellBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((label, index) => newsCell(label, { index, head: true })),
      }),
      ...scale.rows.map(
        (row, rowIndex) =>
          new TableRow({
            children: [
              newsCell(String(rowIndex + 1), { index: 0, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(row.nome, { index: 1, zebra: rowIndex % 2 === 1 }),
              newsCell(row.fr, { index: 2, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(row.spo2, { index: 3, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(row.temp, { index: 4, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(row.pas, { index: 5, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(row.fc, { index: 6, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(row.mental, { index: 7, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(String(row.total), { index: 8, zebra: rowIndex % 2 === 1, center: true }),
              newsCell(row.classification, { index: 9, zebra: rowIndex % 2 === 1, center: true }),
            ],
          }),
      ),
    ],
  });

  const conducts = [
    "Escore 0 — Sem risco: avaliação mínima a cada 4-6h.",
    "Escore 1-4 — Baixo risco: avaliação a cada 4-6h por enfermeiro.",
    "Escore 5-6 — Risco moderado: avaliação a cada 1h, notificar médico responsável.",
    "Escore ≥ 7 — Alto risco: avaliação contínua, considerar transferência para UTI.",
  ];

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "I.L.P.I — LUIZA OLINDINA SILVA ALVES",
          size: SIZE_TINY,
          bold: true,
          color: "5A6560",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60, line: LINE_1_0 },
      children: [new TextRun({ text: "ESCALA NEWS — AVALIAÇÃO DE PACIENTES", bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240, line: LINE_1_0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PINE, space: 6 } },
      children: [
        new TextRun({
          text: `${scale.nurse_name ? `${scale.nurse_name.toUpperCase()} — ` : ""}${formatShiftReportDate(scale.evaluation_date)}`,
          size: SIZE_SMALL,
          color: "5A6560",
        }),
      ],
    }),
    table,
    new Paragraph({
      spacing: { before: 300, after: 80, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "Conduta recomendada",
          font: FONT,
          size: SIZE_SMALL,
          bold: true,
          color: PINE,
        }),
      ],
    }),
    ...conducts.map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 40, line: LINE_1_0 },
          children: [new TextRun({ text: line, font: FONT, size: SIZE_TINY, color: INK })],
        }),
    ),
    new Paragraph({ spacing: { before: 480, after: 0, line: LINE_1_0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "__________________________________________",
          font: FONT,
          size: SIZE_SMALL,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: scale.nurse_name || "Enfermagem",
          font: FONT,
          size: SIZE_SMALL,
          bold: true,
          color: INK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "Baseado no protocolo NEWS — Royal College of Physicians (RCP)",
          font: FONT,
          size: SIZE_TINY,
          color: "5A6560",
        }),
      ],
    }),
  ];

  return new Document({
    creator: "AGA ILPI",
    title: `Escala NEWS ${scale.evaluation_date}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY, color: INK },
          paragraph: {
            spacing: { line: LINE_1_5, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: NEWS_MARGIN,
          },
        },
        headers: { default: letterheadHeader(true) },
        footers: { default: letterheadFooter() },
        children,
      },
    ],
  });
}

export async function downloadNewsScaleDocx(scale: NewsScaleForDoc) {
  const blob = await Packer.toBlob(buildNewsScaleDocument(scale));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `escala-news_${scale.evaluation_date}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ===== Saídas de residentes (desacolhimento e óbito) =====

export type ResidentExitForDoc = {
  resident_name: string;
  exit_type: string;
  exit_date: string;
  destination?: string | null;
  cause?: string | null;
  report: string;
  author_name: string;
  attachments?: { name: string; size: number; uploadedAt: string }[];
};

export function buildResidentExitDocument(exit: ResidentExitForDoc) {
  const paragraphs = exit.report
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "I.L.P.I — LUIZA OLINDINA SILVA ALVES",
          size: SIZE_TINY,
          bold: true,
          color: "5A6560",
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60, line: LINE_1_0 },
      children: [
        new TextRun({ text: `RELATÓRIO DE SAÍDA — ${exit.exit_type.toUpperCase()}`, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320, line: LINE_1_0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PINE, space: 6 } },
      children: [
        new TextRun({
          text: `RESIDENTE: ${exit.resident_name.toUpperCase()}`,
          size: SIZE_SMALL,
          color: "5A6560",
        }),
      ],
    }),
    infoTable([
      ["Residente", exit.resident_name],
      ["Tipo de saída", exit.exit_type],
      ["Data da saída", formatShiftReportDate(exit.exit_date)],
      ["Destino / responsável pela retirada", exit.destination?.trim() || "—"],
      ["Causa / motivo", exit.cause?.trim() || "—"],
      ["Responsável pelo registro", exit.author_name],
      ["Emitido em", new Date().toLocaleString("pt-BR")],
    ]),
    sectionHeading("1", "Relatório"),
    ...(paragraphs.length
      ? paragraphs.map((text) => bodyParagraph(text))
      : [bodyParagraph("Sem relatório informado.", false)]),
  ];

  const files = exit.attachments ?? [];
  if (files.length) {
    children.push(sectionHeading("2", "Documentos anexados"));
    files.forEach((file, index) => {
      children.push(
        bodyParagraph(
          `${index + 1}. ${file.name} — ${(file.size / 1024 / 1024).toFixed(2)} MB · enviado em ${new Date(
            file.uploadedAt,
          ).toLocaleDateString("pt-BR")}`,
          false,
        ),
      );
    });
  }

  children.push(
    new Paragraph({ spacing: { before: 700, after: 0, line: LINE_1_0 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: "__________________________________________",
          font: FONT,
          size: SIZE_BODY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: LINE_1_0 },
      children: [
        new TextRun({
          text: exit.author_name,
          font: FONT,
          size: SIZE_SMALL,
          bold: true,
          color: INK,
        }),
      ],
    }),
  );

  return new Document({
    creator: "AGA ILPI",
    title: `Relatório de Saída — ${exit.resident_name}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY, color: INK },
          paragraph: {
            spacing: { line: LINE_1_5, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: PAGE_MARGIN },
        },
        headers: { default: letterheadHeader() },
        footers: { default: letterheadFooter() },
        children,
      },
    ],
  });
}

export async function downloadResidentExitDocx(exit: ResidentExitForDoc) {
  const blob = await Packer.toBlob(buildResidentExitDocument(exit));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `saida_${slugify(exit.exit_type)}_${slugify(exit.resident_name)}_${exit.exit_date}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
