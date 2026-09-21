import { closingSection } from "./closing";
import type { FormSpec } from "./types";

export const psicologiaForm: FormSpec = {
  specialty: "Psicologia",
  title: "Avaliação Psicológica",
  subtitle: "Especialidade: Psicologia",
  sections: [
    {
      title: "Adicionar Teste (protocolo digitalizado)",
      description:
        "Anexe o protocolo do teste aplicado (PDF, DOC, imagem ou digitalização). O arquivo é lido e digitalizado automaticamente — desenhos, escritas e respostas são transcritos e incorporados a esta avaliação. O anexo é obrigatório para enviar a avaliação.",
      fields: [
        {
          type: "attachments",
          key: "testes_aplicados",
          label: "Protocolos de testes aplicados",
          hint: "Aceita PDF, DOC/DOCX, JPG e PNG (até 25 MB por arquivo).",
          accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp",
          required: true,
        },
        {
          type: "textarea",
          key: "testes_interpretacao",
          label: "Interpretação clínica dos testes aplicados",
          rows: 6,
        },
      ],
    },
    closingSection("Termo de Encerramento e Assinaturas"),
  ],
};
