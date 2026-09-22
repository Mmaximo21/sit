/**
 * Cálculo de energia basal e necessidades energéticas para residentes idosos
 * institucionalizados (grande parte acamados e com comorbidades crônicas).
 *
 * Referências práticas usadas nos fatores:
 * - Harris & Benedict (revisada por Roza & Shizgal, 1984)
 * - Mifflin-St Jeor (1990) — melhor desempenho em idosos com sobrepeso
 * - Schofield / FAO-OMS-ONU para faixas de idade (> 60 anos)
 * - Bolso rápido (kcal/kg) — ESPEN geriatria: 27-30 kcal/kg/dia
 */

export type Sex = "F" | "M";

export type EnergyFormula = "harris" | "mifflin" | "fao" | "kcalkg";

export const FORMULAS: { value: EnergyFormula; label: string; note: string }[] = [
  {
    value: "harris",
    label: "Harris-Benedict revisada (Roza & Shizgal)",
    note: "Padrão clássico; boa referência para idosos eutróficos.",
  },
  {
    value: "mifflin",
    label: "Mifflin-St Jeor",
    note: "Menor superestimação em idosos com sobrepeso/obesidade.",
  },
  {
    value: "fao",
    label: "FAO/OMS/ONU (Schofield) > 60 anos",
    note: "Equação por faixa etária, usa apenas peso.",
  },
  {
    value: "kcalkg",
    label: "Bolso rápido (kcal/kg/dia)",
    note: "ESPEN geriatria: 27-30 kcal/kg/dia; acamados no limite inferior.",
  },
];

/** Fator atividade — pensado para o perfil de ILPI. */
export const ACTIVITY_FACTORS = [
  { value: 1.0, label: "Acamado, sem mobilização (fator 1,00)" },
  { value: 1.1, label: "Acamado com mobilização passiva (1,10)" },
  { value: 1.15, label: "Restrito a cadeira de rodas (1,15)" },
  { value: 1.25, label: "Deambula com auxílio / no quarto (1,25)" },
  { value: 1.35, label: "Deambula sem auxílio, atividades leves (1,35)" },
] as const;

/**
 * Fatores de injúria/comorbidade. Aplicamos o MAIOR fator selecionado
 * (evita multiplicação em cascata e superestimação da meta).
 */
export const CONDITION_FACTORS = [
  { id: "nenhuma", label: "Sem estresse metabólico relevante", factor: 1.0 },
  {
    id: "alzheimer",
    label: "Doença de Alzheimer / demência avançada (agitação, perambulação)",
    factor: 1.15,
  },
  { id: "parkinson", label: "Parkinson com rigidez/discinesia", factor: 1.15 },
  { id: "dpoc_estavel", label: "DPOC estável", factor: 1.15 },
  { id: "dpoc_exacerbado", label: "DPOC em exacerbação / esforço respiratório", factor: 1.3 },
  { id: "icc", label: "Insuficiência cardíaca / caquexia cardíaca", factor: 1.2 },
  { id: "lesao_pressao_1_2", label: "Lesão por pressão estágio I-II", factor: 1.2 },
  { id: "lesao_pressao_3_4", label: "Lesão por pressão estágio III-IV ou múltiplas", factor: 1.35 },
  { id: "infeccao", label: "Infecção ativa (ITU, pneumonia)", factor: 1.25 },
  { id: "pos_fratura", label: "Pós-operatório / fratura em recuperação", factor: 1.25 },
  { id: "desnutricao", label: "Desnutrição / recuperação de peso", factor: 1.3 },
  { id: "disfagia", label: "Disfagia com ingestão reduzida", factor: 1.1 },
] as const;

export type ConditionId = (typeof CONDITION_FACTORS)[number]["id"];

/** Acréscimo térmico: ~13% por grau acima de 37 °C. */
export const FEVER_PER_DEGREE = 0.13;

export type EnergyInput = {
  sex: Sex;
  age: number;
  /** peso atual em kg */
  weight: number;
  /** altura em cm (pode vir de estimativa por altura do joelho) */
  height: number;
  formula: EnergyFormula;
  kcalPerKg: number;
  activity: number;
  conditions: ConditionId[];
  /** temperatura axilar média, °C */
  temperature: number;
  proteinPerKg: number;
  fluidPerKg: number;
  notes: string;
};

export const DEFAULT_ENERGY: EnergyInput = {
  sex: "F",
  age: 80,
  weight: 0,
  height: 0,
  formula: "harris",
  kcalPerKg: 28,
  activity: 1.1,
  conditions: ["nenhuma"],
  temperature: 36.5,
  proteinPerKg: 1.2,
  fluidPerKg: 30,
  notes: "",
};

export function asEnergyInput(value: unknown): EnergyInput {
  if (!value || typeof value !== "object") return { ...DEFAULT_ENERGY };
  const v = value as Partial<EnergyInput>;
  return {
    ...DEFAULT_ENERGY,
    ...v,
    conditions: Array.isArray(v.conditions) && v.conditions.length ? v.conditions : ["nenhuma"],
  };
}

/** Taxa metabólica basal (kcal/dia). */
export function basalMetabolicRate(input: EnergyInput): number {
  const { sex, age, weight, height, formula, kcalPerKg } = input;
  if (weight <= 0) return 0;

  if (formula === "kcalkg") return weight * (kcalPerKg || 0);

  if (formula === "mifflin") {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return sex === "M" ? base + 5 : base - 161;
  }

  if (formula === "fao") {
    // Schofield / FAO — > 60 anos usa apenas o peso
    if (age >= 60) return sex === "M" ? 13.5 * weight + 487 : 10.5 * weight + 596;
    return sex === "M" ? 15.3 * weight + 679 : 14.7 * weight + 496;
  }

  // Harris-Benedict revisada (Roza & Shizgal, 1984)
  return sex === "M"
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
}

export function conditionFactor(ids: ConditionId[]): number {
  const selected = CONDITION_FACTORS.filter((c) => ids.includes(c.id));
  return selected.length ? Math.max(...selected.map((c) => c.factor)) : 1;
}

export function feverFactor(temperature: number): number {
  const over = (Number(temperature) || 0) - 37;
  return over > 0 ? 1 + over * FEVER_PER_DEGREE : 1;
}

export type EnergyResult = {
  bmr: number;
  activityFactor: number;
  conditionFactor: number;
  feverFactor: number;
  total: number;
  kcalPerKgAchieved: number;
  bmi: number | null;
  bmiClass: string | null;
  protein: number;
  fluid: number;
};

export function computeEnergy(input: EnergyInput): EnergyResult {
  const bmr = basalMetabolicRate(input);
  const af = input.formula === "kcalkg" ? 1 : input.activity || 1;
  const cf = input.formula === "kcalkg" ? 1 : conditionFactor(input.conditions);
  const ff = input.formula === "kcalkg" ? 1 : feverFactor(input.temperature);
  const total = bmr * af * cf * ff;
  const heightM = (input.height || 0) / 100;
  const bmi = heightM > 0 && input.weight > 0 ? input.weight / (heightM * heightM) : null;

  return {
    bmr,
    activityFactor: af,
    conditionFactor: cf,
    feverFactor: ff,
    total,
    kcalPerKgAchieved: input.weight > 0 ? total / input.weight : 0,
    bmi,
    bmiClass: bmi === null ? null : classifyBmiElderly(bmi),
    protein: (input.weight || 0) * (input.proteinPerKg || 0),
    fluid: (input.weight || 0) * (input.fluidPerKg || 0),
  };
}

/** Pontos de corte de IMC para idosos (Lipschitz, 1994). */
export function classifyBmiElderly(bmi: number): string {
  if (bmi < 22) return "Baixo peso (risco nutricional)";
  if (bmi <= 27) return "Eutrofia";
  return "Sobrepeso/obesidade";
}

/** Estimativa de altura pela altura do joelho (Chumlea) — útil em acamados. */
export function heightFromKneeHeight(sex: Sex, age: number, kneeCm: number): number {
  if (!kneeCm) return 0;
  return sex === "M" ? 64.19 - 0.04 * age + 2.02 * kneeCm : 84.88 - 0.24 * age + 1.83 * kneeCm;
}

export function ageFromBirthDate(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}
