import type { Field, FormSpec } from "./types";

export function toNumber(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string" || raw.trim() === "") return 0;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
}

export function findField(spec: FormSpec, key: string): Field | undefined {
  for (const section of spec.sections) {
    for (const field of section.fields) if (field.key === key) return field;
  }
  return undefined;
}

export function computeSum(
  field: Extract<Field, { type: "computed" }>,
  values: Record<string, unknown>,
  spec: FormSpec,
): number {
  let total = 0;
  for (const key of field.sum) {
    const target = findField(spec, key);
    if (target && target.type === "computed") total += computeSum(target, values, spec);
    else total += toNumber(values[key]);
  }
  return total;
}
