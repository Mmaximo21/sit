import type { Food, Nutrients } from "./foods";
import { NUTRIENTS } from "./nutrients";

export const MEALS = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
] as const;

/** Item registrado no cálculo calórico (armazenado no JSON da avaliação). */
export type CalorieEntry = {
  uid: string;
  name: string;
  category?: string;
  meal: string;
  grams: number;
  /** Composição por 100 g, guardada junto para o documento não depender da tabela. */
  per100: Nutrients;
};

export type CalorieValue = {
  entries: CalorieEntry[];
};

export const EMPTY_TOTALS = Object.fromEntries(
  NUTRIENTS.map((n) => [n.key, 0]),
) as unknown as Nutrients;

export function asCalorieValue(value: unknown): CalorieValue {
  if (value && typeof value === "object" && Array.isArray((value as CalorieValue).entries)) {
    return { entries: (value as CalorieValue).entries.filter(Boolean) };
  }
  return { entries: [] };
}

export function entryFromFood(food: Food, grams: number, meal: string): CalorieEntry {
  const per100 = Object.fromEntries(
    NUTRIENTS.map((n) => [n.key, food[n.key] ?? 0]),
  ) as unknown as Nutrients;
  return {
    uid: crypto.randomUUID(),
    name: food.name,
    category: food.category,
    meal,
    grams,
    per100,
  };
}

export function sumEntries(entries: CalorieEntry[]): Nutrients {
  const acc = { ...EMPTY_TOTALS };
  for (const entry of entries) {
    const factor = (Number(entry.grams) || 0) / 100;
    for (const n of NUTRIENTS) {
      acc[n.key] += (entry.per100?.[n.key] ?? 0) * factor;
    }
  }
  return acc;
}

export function entryValue(entry: CalorieEntry, key: keyof Nutrients): number {
  return ((entry.per100?.[key] ?? 0) * (Number(entry.grams) || 0)) / 100;
}
