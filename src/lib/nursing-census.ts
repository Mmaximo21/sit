import { findResidentProfile } from "./nursing-census-profiles";

export type CensusColumn = {
  key: string;
  label: string;
  width: number;
  short?: string;
};

/** Colunas do Censo de Enfermagem, na ordem da planilha institucional. */
export const CENSUS_COLUMNS: CensusColumn[] = [
  { key: "dependencia", label: "Dependência", width: 190 },
  { key: "dn", label: "DN", width: 100 },
  { key: "grau", label: "Grau", width: 70 },
  { key: "diagnostico", label: "Diagnóstico", width: 200 },
  { key: "tax", label: "Tax°", width: 70 },
  { key: "fr", label: "FR", width: 60 },
  { key: "fc", label: "FC", width: 60 },
  { key: "spo2", label: "SpO2", width: 70 },
  { key: "pa", label: "PA", width: 80 },
  { key: "news", label: "NEWS", width: 60 },
  { key: "dieta", label: "Dieta", width: 130 },
  { key: "diurese", label: "Diurese", width: 120 },
  { key: "fezes", label: "Fezes", width: 120 },
];

export type CensusRow = {
  resident_id: string;
  nome: string;
} & Record<string, string>;

export type CensusData = { rows: CensusRow[] };

export type NursingCensusRecord = {
  id: string;
  census_date: string;
  nurse_name: string;
  data: CensusData;
  created_at: string;
  updated_at: string;
};

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function formatCensusDate(raw: string) {
  const [y, m, d] = raw.split("-");
  return d && m && y ? `${d}/${m}/${y}` : raw;
}

export function formatBirthDate(raw: string | null | undefined) {
  if (!raw) return "";
  const [y, m, d] = raw.split("-");
  return d && m && y ? `${d}/${m}/${y}` : raw;
}

export function asCensusData(raw: unknown): CensusData {
  if (raw && typeof raw === "object" && Array.isArray((raw as CensusData).rows)) {
    return { rows: (raw as CensusData).rows as CensusRow[] };
  }
  return { rows: [] };
}

/** Garante uma linha por residente ativo, preservando o que já foi digitado. */
export function mergeCensusRows(
  residents: { id: string; full_name: string; birth_date: string | null }[],
  saved: CensusRow[],
): CensusRow[] {
  return residents.map((resident) => {
    const existing = saved.find((row) => row.resident_id === resident.id);
    const base: CensusRow = { resident_id: resident.id, nome: resident.full_name };
    for (const column of CENSUS_COLUMNS) base[column.key] = "";
    base["dn"] = formatBirthDate(resident.birth_date);
    const profile = findResidentProfile(resident.full_name);
    if (profile) {
      base["dependencia"] = profile.dependencia;
      base["grau"] = profile.grau;
      base["diagnostico"] = profile.diagnostico;
    }
    if (existing) {
      for (const column of CENSUS_COLUMNS) {
        const value = existing[column.key];
        if (typeof value === "string" && value.trim()) base[column.key] = value;
      }
    }
    return base;
  });
}


export function censusFilledCount(rows: CensusRow[]) {
  return rows.filter((row) => CENSUS_COLUMNS.some((c) => c.key !== "dn" && String(row[c.key] ?? "").trim())).length;
}
