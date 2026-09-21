import type { Nutrients } from "./foods";

export type NutrientKey = keyof Nutrients;

export type NutrientMeta = {
  key: NutrientKey;
  label: string;
  unit: string;
  /** Valor diário de referência (adulto, dieta de 2000 kcal) */
  dv: number;
  group: "macro" | "micro";
  decimals?: number;
};

export const NUTRIENTS: NutrientMeta[] = [
  { key: "kcal", label: "Energia", unit: "kcal", dv: 2000, group: "macro", decimals: 0 },
  { key: "protein", label: "Proteínas", unit: "g", dv: 75, group: "macro", decimals: 1 },
  { key: "carbs", label: "Carboidratos", unit: "g", dv: 300, group: "macro", decimals: 1 },
  { key: "fiber", label: "Fibra alimentar", unit: "g", dv: 25, group: "macro", decimals: 1 },
  { key: "sugar", label: "Açúcares", unit: "g", dv: 50, group: "macro", decimals: 1 },
  { key: "fat", label: "Gorduras totais", unit: "g", dv: 65, group: "macro", decimals: 1 },
  { key: "satFat", label: "Gorduras saturadas", unit: "g", dv: 20, group: "macro", decimals: 1 },
  { key: "cholesterol", label: "Colesterol", unit: "mg", dv: 300, group: "micro", decimals: 0 },
  { key: "sodium", label: "Sódio", unit: "mg", dv: 2000, group: "micro", decimals: 0 },
  { key: "potassium", label: "Potássio", unit: "mg", dv: 3500, group: "micro", decimals: 0 },
  { key: "calcium", label: "Cálcio", unit: "mg", dv: 1000, group: "micro", decimals: 0 },
  { key: "iron", label: "Ferro", unit: "mg", dv: 14, group: "micro", decimals: 1 },
  { key: "magnesium", label: "Magnésio", unit: "mg", dv: 260, group: "micro", decimals: 0 },
  { key: "zinc", label: "Zinco", unit: "mg", dv: 11, group: "micro", decimals: 1 },
  { key: "vitA", label: "Vitamina A", unit: "µg", dv: 800, group: "micro", decimals: 0 },
  { key: "vitC", label: "Vitamina C", unit: "mg", dv: 90, group: "micro", decimals: 1 },
  { key: "vitD", label: "Vitamina D", unit: "µg", dv: 15, group: "micro", decimals: 1 },
  { key: "vitE", label: "Vitamina E", unit: "mg", dv: 15, group: "micro", decimals: 1 },
  { key: "vitB12", label: "Vitamina B12", unit: "µg", dv: 2.4, group: "micro", decimals: 2 },
  { key: "folate", label: "Folato", unit: "µg", dv: 400, group: "micro", decimals: 0 },
];

export const MACROS = NUTRIENTS.filter((n) => n.group === "macro");
export const MICROS = NUTRIENTS.filter((n) => n.group === "micro");

export function formatValue(value: number, meta: NutrientMeta) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: meta.decimals ?? 1,
    maximumFractionDigits: meta.decimals ?? 1,
  });
}
