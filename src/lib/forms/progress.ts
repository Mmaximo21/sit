import type { Field, FormSpec, Section } from "./types";

/** Campos que não representam preenchimento do profissional. */
const IGNORED = new Set(["note", "computed"]);

export function sectionSlug(title: string) {
  return (
    "sec-" +
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );
}

function isFilled(field: Field, values: Record<string, unknown>): boolean {
  const value = values[field.key];
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "attachments") return Array.isArray(value) && value.length > 0;
  if (field.type === "calorias") {
    const entries = (value as { entries?: unknown[] } | undefined)?.entries;
    return Array.isArray(entries) && entries.length > 0;
  }

  if (field.type === "sided") {
    const record = (value as Record<string, string> | undefined) ?? {};
    return Object.values(record).some((v) => String(v ?? "").trim() !== "");
  }
  if (field.type === "table") {
    if (!Array.isArray(value)) return false;
    return (value as Record<string, unknown>[]).some((row) =>
      Object.values(row ?? {}).some((v) => String(v ?? "").trim() !== ""),
    );
  }
  return String(value ?? "").trim() !== "";
}

export type SectionProgress = { title: string; slug: string; filled: number; total: number };

export function formProgress(spec: FormSpec, values: Record<string, unknown>) {
  const sections: SectionProgress[] = spec.sections.map((section: Section) => {
    const fields = section.fields.filter((f) => !IGNORED.has(f.type));
    return {
      title: section.title,
      slug: sectionSlug(section.title),
      filled: fields.filter((f) => isFilled(f, values)).length,
      total: fields.length,
    };
  });

  const filled = sections.reduce((sum, s) => sum + s.filled, 0);
  const total = sections.reduce((sum, s) => sum + s.total, 0);
  return { sections, filled, total, percent: total ? Math.round((filled / total) * 100) : 0 };
}
