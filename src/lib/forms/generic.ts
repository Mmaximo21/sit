import { closingSection } from "./closing";
import type { FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";

export function genericForm(specialty: string): FormSpec {
  return {
    specialty,
    title: `Avaliação — ${specialty}`,
    subtitle: `Especialidade: ${specialty}`,
    sections: [
      {
        title: "I. Identificação",
        description:
          "Modelo provisório: quando o arquivo oficial desta especialidade for enviado, o formulário será substituído pelo padrão definitivo.",
        fields: [
          { type: "text", key: "nome", label: "Nome do residente" },
          { type: "select", key: "sexo", label: "Sexo", options: ["Feminino", "Masculino"] },
          { type: "date", key: "nascimento", label: "Data de nascimento" },
          { type: "text", key: "idade", label: "Idade" },
          ...residentInfoFields(),
        ],
      },
      {
        title: "II. Avaliação",
        fields: [
          { type: "textarea", key: "historico", label: "Histórico / queixas", rows: 5 },
          { type: "textarea", key: "avaliacao", label: "Avaliação da especialidade", rows: 8 },
          { type: "textarea", key: "conduta", label: "Conduta / plano de cuidados", rows: 6 },
          { type: "textarea", key: "meta", label: "Meta", rows: 4 },
        ],
      },
      closingSection("Termo de Encerramento e Assinaturas"),
    ],
  };
}
