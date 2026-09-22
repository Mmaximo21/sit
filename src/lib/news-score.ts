export type NewsVitals = {
  fr: string;
  spo2: string;
  temp: string;
  pas: string;
  fc: string;
  mental: "Normal / Alerta" | "Alterado (confusão, agitação, letargia)";
};

export const MENTAL_OPTIONS: NewsVitals["mental"][] = [
  "Normal / Alerta",
  "Alterado (confusão, agitação, letargia)",
];

export const emptyVitals: NewsVitals = {
  fr: "",
  spo2: "",
  temp: "",
  pas: "",
  fc: "",
  mental: "Normal / Alerta",
};

export function num(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function scoreFR(v: number | null) {
  if (v === null) return 0;
  if (v <= 8) return 3;
  if (v <= 11) return 1;
  if (v <= 20) return 0;
  if (v <= 24) return 2;
  return 3;
}

export function scoreSpo2(v: number | null) {
  if (v === null) return 0;
  if (v <= 91) return 3;
  if (v <= 93) return 2;
  if (v <= 95) return 1;
  return 0;
}

export function scoreTemp(v: number | null) {
  if (v === null) return 0;
  if (v <= 35.0) return 3;
  if (v <= 36.0) return 2;
  if (v <= 38.0) return 0;
  if (v <= 39.0) return 1;
  return 3;
}

/** PA digitada como "120/80": o escore NEWS usa apenas a sistólica. */
export function numPas(raw: string): number | null {
  const first = (raw.split("/")[0] ?? "").trim();
  return num(first);
}

export function scorePas(v: number | null) {
  if (v === null) return 0;
  if (v <= 90) return 3;
  if (v <= 100) return 2;
  if (v <= 110) return 1;
  if (v <= 219) return 0;
  return 3;
}

export function scoreFC(v: number | null) {
  if (v === null) return 0;
  if (v <= 40) return 3;
  if (v <= 50) return 1;
  if (v <= 90) return 0;
  if (v <= 110) return 1;
  if (v <= 130) return 2;
  return 3;
}

export function scoreMental(mental: NewsVitals["mental"]) {
  return mental === "Normal / Alerta" ? 0 : 3;
}

export type NewsParam = {
  key: keyof NewsVitals;
  label: string;
  unit: string;
  value: string;
  score: number;
};

export type NewsResult = {
  params: NewsParam[];
  total: number;
  classification: string;
  conduct: string;
  level: 0 | 1 | 2 | 3;
};

export function computeNews(v: NewsVitals): NewsResult {
  const params: NewsParam[] = [
    {
      key: "fr",
      label: "Frequência Respiratória",
      unit: "irpm",
      value: v.fr,
      score: scoreFR(num(v.fr)),
    },
    {
      key: "spo2",
      label: "Saturação de O₂",
      unit: "%",
      value: v.spo2,
      score: scoreSpo2(num(v.spo2)),
    },
    { key: "temp", label: "Temperatura", unit: "°C", value: v.temp, score: scoreTemp(num(v.temp)) },
    {
      key: "pas",
      label: "Pressão Arterial (PAS/PAD)",
      unit: "mmHg",
      value: v.pas,
      score: scorePas(numPas(v.pas)),
    },
    {
      key: "fc",
      label: "Frequência Cardíaca",
      unit: "bpm",
      value: v.fc,
      score: scoreFC(num(v.fc)),
    },
    {
      key: "mental",
      label: "Estado Mental",
      unit: "",
      value: v.mental,
      score: scoreMental(v.mental),
    },
  ];
  const total = params.reduce((sum, p) => sum + p.score, 0);
  const { classification, conduct, level } = classifyNews(total);
  return { params, total, classification, conduct, level };
}

export function classifyNews(total: number): {
  classification: string;
  conduct: string;
  level: 0 | 1 | 2 | 3;
} {
  if (total === 0)
    return { classification: "Sem risco", conduct: "Avaliação mínima a cada 4-6h", level: 0 };
  if (total <= 4)
    return {
      classification: "Baixo risco",
      conduct: "Avaliação a cada 4-6h por enfermeiro",
      level: 1,
    };
  if (total <= 6)
    return {
      classification: "Risco moderado",
      conduct: "Avaliação a cada 1h, notificar médico responsável",
      level: 2,
    };
  return {
    classification: "Alto risco",
    conduct: "Avaliação contínua, considerar transferência para UTI",
    level: 3,
  };
}

/** Classes Tailwind por pontuação individual (verde/amarelo/laranja/vermelho). */
export function scoreBadgeClass(score: number) {
  if (score >= 3) return "bg-red-500/15 text-red-600 border-red-500/40";
  if (score === 2) return "bg-orange-500/15 text-orange-600 border-orange-500/40";
  if (score === 1) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/40";
  return "bg-emerald-500/15 text-emerald-600 border-emerald-500/40";
}

export function levelCardClass(level: 0 | 1 | 2 | 3) {
  if (level === 3) return "border-red-500/50 bg-red-500/10 text-red-700";
  if (level === 2) return "border-orange-500/50 bg-orange-500/10 text-orange-700";
  if (level === 1) return "border-yellow-500/50 bg-yellow-500/10 text-yellow-800";
  return "border-emerald-500/50 bg-emerald-500/10 text-emerald-700";
}

export type NewsBatchRow = NewsVitals & { resident_id: string; nome: string };

export type NewsBatchRecord = {
  id: string;
  createdAt: string;
  evaluationDate: string;
  nurseName: string;
  rows: NewsBatchRow[];
};

export const NEWS_STORAGE_KEY = "news-scale-history";

export function emptyBatchRow(resident: { id: string; full_name: string }): NewsBatchRow {
  return { resident_id: resident.id, nome: resident.full_name, ...emptyVitals };
}

/** Garante uma linha por residente ativo, preservando o que já foi digitado. */
export function mergeNewsRows(
  residents: { id: string; full_name: string }[],
  saved: NewsBatchRow[],
): NewsBatchRow[] {
  return residents.map((resident) => {
    const existing = saved.find((row) => row.resident_id === resident.id);
    return existing
      ? { ...emptyBatchRow(resident), ...existing, nome: resident.full_name }
      : emptyBatchRow(resident);
  });
}

export function isRowFilled(row: NewsBatchRow) {
  return Boolean(row.fr || row.spo2 || row.temp || row.pas || row.fc);
}

/** Campos do Censo de Enfermagem alimentados automaticamente pela Escala NEWS. */
export function newsRowToCensusFields(row: NewsBatchRow): Record<string, string> {
  const fields: Record<string, string> = {};
  if (row.temp) fields["tax"] = row.temp;
  if (row.fr) fields["fr"] = row.fr;
  if (row.fc) fields["fc"] = row.fc;
  if (row.spo2) fields["spo2"] = row.spo2;
  if (row.pas) fields["pa"] = row.pas;
  if (isRowFilled(row)) fields["news"] = String(computeNews(row).total);
  return fields;
}

export function loadNewsHistory(): NewsBatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NEWS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? (parsed as NewsBatchRecord[]).filter((r) => Array.isArray(r?.rows))
      : [];
  } catch {
    return [];
  }
}

export function saveNewsHistory(records: NewsBatchRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(records));
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
