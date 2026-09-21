import type { Field, Section } from "./types";

/** Siglas dos conselhos profissionais de todas as especialidades atendidas na ILPI. */
export const COUNCIL_OPTIONS = [
  "CRM — Conselho Regional de Medicina",
  "COREN — Conselho Regional de Enfermagem",
  "CRN — Conselho Regional de Nutrição",
  "CRESS — Conselho Regional de Serviço Social",
  "CRP — Conselho Regional de Psicologia",
  "CREFITO — Conselho Regional de Fisioterapia e Terapia Ocupacional",
  "CRFa — Conselho Regional de Fonoaudiologia",
  "CRF — Conselho Regional de Farmácia",
  "CRO — Conselho Regional de Odontologia",
  "CREF — Conselho Regional de Educação Física",
  "CRBM — Conselho Regional de Biomedicina",
  "CRBio — Conselho Regional de Biologia",
  "COFFITO/Outro — Outro conselho",
];

/** Conselho sugerido por especialidade (usado como valor inicial no formulário). */
export const COUNCIL_BY_SPECIALTY: Record<string, string> = {
  Geriatria: COUNCIL_OPTIONS[0]!,
  Enfermagem: COUNCIL_OPTIONS[1]!,
  "Nutrição": COUNCIL_OPTIONS[2]!,
  "Serviço Social": COUNCIL_OPTIONS[3]!,
  Psicologia: COUNCIL_OPTIONS[4]!,
  Fisioterapia: COUNCIL_OPTIONS[5]!,
  "Terapia Ocupacional": COUNCIL_OPTIONS[5]!,
  "Fonoaudióloga": COUNCIL_OPTIONS[6]!,
  Fonoaudiologia: COUNCIL_OPTIONS[6]!,
};

/** Campos obrigatórios do Termo de Encerramento e Assinaturas. */
export const CLOSING_FIELD_KEYS = ["local", "data_encerramento", "profissional", "conselho", "registro"] as const;

export function closingFields(): Field[] {
  return [
    { type: "text", key: "local", label: "Local", required: true },
    { type: "date", key: "data_encerramento", label: "Data", required: true },
    { type: "text", key: "profissional", label: "Profissional responsável", required: true },
    {
      type: "select",
      key: "conselho",
      label: "Conselho profissional",
      options: COUNCIL_OPTIONS,
      required: true,
      hint: "Selecione a sigla do conselho de classe da sua especialidade.",
    },
    {
      type: "text",
      key: "registro",
      label: "Registro profissional (nº de inscrição)",
      placeholder: "Ex.: 123456/RJ",
      required: true,
    },
  ];
}

export function closingSection(title = "Termo de Encerramento e Assinaturas"): Section {
  return {
    title,
    description: "Preenchimento obrigatório: a avaliação só pode ser enviada com o termo completo.",
    fields: closingFields(),
  };
}

/** Aplica as configurações administráveis (conselhos e texto do termo) ao formulário. */
export function applyClosingSettings<T extends { sections: Section[] }>(
  spec: T,
  settings: { councilOptions?: string[] | undefined; title?: string | undefined; description?: string | undefined },
): T {

  const sections = spec.sections.map((section) => {
    const hasClosing = section.fields.some((f) => f.key === "conselho");
    if (!hasClosing) return section;
    return {
      ...section,
      title: settings.title?.trim() ? settings.title : section.title,
      description: settings.description?.trim() ? settings.description : section.description,
      fields: section.fields.map((field) =>
        field.key === "conselho" && field.type === "select" && settings.councilOptions?.length
          ? { ...field, options: settings.councilOptions }
          : field,
      ),
    };
  });
  return { ...spec, sections };
}


/** Retorna os campos obrigatórios ainda não preenchidos (usado antes de enviar/fechar). */
export function missingRequiredFields(
  spec: { sections: { fields: Field[] }[] },
  values: Record<string, unknown>,
): Field[] {
  const missing: Field[] = [];
  for (const section of spec.sections) {
    for (const field of section.fields) {
      if (!("required" in field) || !field.required) continue;
      const value = values[field.key];
      if (field.type === "attachments") {
        if (!Array.isArray(value) || value.length === 0) missing.push(field);
        continue;
      }
      if (field.type === "calorias") {
        const entries = (value as { entries?: unknown[] } | undefined)?.entries;
        if (!Array.isArray(entries) || entries.length === 0) missing.push(field);
        continue;
      }
      if (value === undefined || value === null || String(value).trim() === "") missing.push(field);
    }
  }
  return missing;
}
