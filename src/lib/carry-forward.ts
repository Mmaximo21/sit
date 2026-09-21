import type { FormSpec } from "./forms/types";

/**
 * Monta os valores iniciais de uma nova avaliação reaproveitando o que foi
 * registrado no ciclo anterior para o mesmo residente e especialidade.
 *
 * Regras:
 * - Anexos não são reaproveitados (cada ciclo tem seus próprios documentos).
 * - A data do Termo de Encerramento é sempre zerada.
 * - Os dados cadastrais atuais do residente têm prioridade.
 */
export function carryForwardData(
  spec: FormSpec,
  previousData: Record<string, unknown> | null | undefined,
  prefill: Record<string, unknown>,
): Record<string, unknown> {
  if (!previousData || typeof previousData !== "object") return { ...prefill };

  const attachmentKeys = new Set<string>();
  for (const section of spec.sections) {
    for (const field of section.fields) {
      if (field.type === "attachments") attachmentKeys.add(field.key);
    }
  }

  const skip = new Set<string>([...attachmentKeys, "data_encerramento"]);
  const carried: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(previousData)) {
    if (skip.has(key)) continue;
    if (value === null || value === undefined) continue;
    carried[key] = value;
  }

  return { ...carried, ...prefill };
}
