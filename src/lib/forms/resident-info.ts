import type { Field } from "./types";

/**
 * Campos cadastrais preenchidos pelas contas Master na Administração
 * (data de acolhimento e diagnóstico) e repetidos nas Avaliações e nos PIAs.
 */
export function residentInfoFields(): Field[] {
  return [
    { type: "date", key: "acolhimento", label: "Data de acolhimento" },
    {
      type: "textarea",
      key: "diagnostico_principal",
      label: "Diagnóstico",
      rows: 3,
      hint: "Vem do cadastro do residente; pode ser complementado nesta avaliação.",
    },
  ];
}
