import { closingSection } from "./closing";
import type { Field, FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";

const score = (key: string, label: string, options: string[], hint: string): Field => ({
  type: "select",
  key,
  label,
  options,
  hint,
});

export const nutricaoForm: FormSpec = {
  specialty: "Nutrição",
  title: "Mini Avaliação Nutricional — MAN",
  subtitle: "Especialidade: Nutrição",
  sections: [
    {
      title: "I. Identificação",
      fields: [
        { type: "text", key: "nome", label: "Nome" },
        { type: "select", key: "sexo", label: "Sexo", options: ["Feminino", "Masculino"] },
        { type: "date", key: "nascimento", label: "Data de Nascimento" },
        { type: "text", key: "idade", label: "Idade" },
        { type: "number", key: "peso", label: "Peso", suffix: "kg" },
        { type: "number", key: "altura", label: "Altura", suffix: "cm" },
        { type: "number", key: "panturrilha", label: "Circunferência da panturrilha", suffix: "cm" },
        { type: "number", key: "imc", label: "IMC" },
        ...residentInfoFields(),
      ],
    },
    {
      title: "II. Triagem",
      description: "Selecione, em cada item, o valor correspondente (0 até o valor máximo do item).",
      fields: [
        score("t_a", "A – Diminuição da ingesta alimentar nos últimos 3 meses", ["0", "1", "2"], "0 = diminuição grave · 1 = diminuição moderada · 2 = sem diminuição"),
        score("t_b", "B – Perda de peso nos últimos meses", ["0", "1", "2", "3"], "0 = perda > 3kg · 1 = não sabe informar · 2 = perda entre 1 e 3kg · 3 = sem perda de peso"),
        score("t_c", "C – Mobilidade", ["0", "1", "2"], "0 = restrito ao leito/cadeira de rodas · 1 = deambula, não sai de casa · 2 = normal"),
        score("t_d", "D – Estresse psicológico ou doença aguda nos últimos 3 meses", ["0", "2"], "0 = sim · 2 = não"),
        score("t_e", "E – Problemas neuropsicológicos", ["0", "1", "2"], "0 = demência ou depressão graves · 1 = demência leve · 2 = sem problemas psicológicos"),
        score("t_f", "F – Índice de Massa Corpórea (IMC = peso / estatura²)", ["0", "1", "2", "3"], "0 = IMC < 19 · 1 = 19 ≤ IMC < 21 · 2 = 21 ≤ IMC < 23 · 3 = IMC ≥ 23"),
        {
          type: "computed",
          key: "t_total",
          label: "Escore de Triagem — TOTAL (máximo 14 pontos)",
          sum: ["t_a", "t_b", "t_c", "t_d", "t_e", "t_f"],
          hint: "≥12 = normal (não continuar) · ≤11 = possibilidade de desnutrição (continuar avaliação)",
        },
      ],
    },
    {
      title: "III. Avaliação Global",
      description: "Preencher apenas se o Escore de Triagem for igual ou inferior a 11 pontos.",
      fields: [
        score("g_g", "G – O paciente vive em sua própria casa (não em casa geriátrica ou hospital)", ["0", "2"], "0 = não · 2 = sim"),
        score("g_h", "H – Utiliza mais de 3 medicamentos diferentes por dia", ["0", "2"], "0 = sim · 2 = não"),
        score("g_i", "I – Lesões na pele ou escaras", ["0", "2"], "0 = sim · 2 = não"),
        score("g_j", "J – Quantas refeições faz por dia", ["0", "1", "2"], "0 = uma refeição · 1 = duas refeições · 2 = três refeições"),
        score("g_k1", "K1 – Consome ao menos uma porção diária de leite ou derivados", ["0", "1"], "0 = não · 1 = sim"),
        score("g_k2", "K2 – Consome duas ou mais porções semanais de leguminosas ou ovos", ["0", "1"], "0 = não · 1 = sim"),
        score("g_k3", "K3 – Consome carne, peixe ou aves todos os dias", ["0", "1"], "0 = não · 1 = sim"),
        score("g_k", "K – Escore de consumo proteico (baseado em K1+K2+K3)", ["0", "0,5", "1"], "0,0 = nenhuma/uma resposta sim · 0,5 = duas respostas sim · 1,0 = três respostas sim"),
        score("g_l", "L – Consome duas ou mais porções diárias de frutas ou vegetais", ["0", "1"], "0 = não · 1 = sim"),
        score("g_m", "M – Quantos copos de líquidos consome por dia", ["0", "0,5", "1"], "0,0 = menos de 3 copos · 0,5 = 3 a 5 copos · 1,0 = mais de 5 copos"),
        score("g_n", "N – Modo de se alimentar", ["0", "1", "2"], "0 = não é capaz sozinho · 1 = sozinho, com dificuldade · 2 = sozinho, sem dificuldade"),
        score("g_o", "O – O paciente acredita ter algum problema nutricional", ["0", "1", "2"], "0 = acredita estar desnutrido · 1 = não sabe dizer · 2 = acredita não ter problema"),
        score("g_p", "P – Em comparação a outras pessoas da mesma idade, como considera sua saúde", ["0", "0,5", "2"], "0,0 = não muito boa · 0,5 = não sabe informar · 2,0 = melhor"),
        score("g_q", "Q – Circunferência do braço (CB) em cm", ["0", "0,5", "1"], "0,0 = CB < 21 · 0,5 = 21 ≤ CB ≤ 22 · 1,0 = CB > 22"),
        score("g_r", "R – Circunferência da panturrilha (CP) em cm", ["0", "1"], "0 = CP < 31 · 1 = CP ≥ 31"),
        {
          type: "computed",
          key: "g_total",
          label: "Avaliação Global — TOTAL (máximo 16 pontos)",
          sum: ["g_g", "g_h", "g_i", "g_j", "g_k", "g_l", "g_m", "g_n", "g_o", "g_p", "g_q", "g_r"],
          hint: "Soma dos itens da Avaliação Global (K1, K2 e K3 entram pelo escore K)",
        },
      ],
    },
    {
      title: "IV. Escore Total e Classificação Nutricional",
      fields: [
        { type: "computed", key: "final_triagem", label: "Escore da Triagem (máximo 14 pontos)", sum: ["t_total"] },
        { type: "computed", key: "final_global", label: "Escore da Avaliação Global (máximo 16 pontos)", sum: ["g_total"] },
        {
          type: "computed",
          key: "final_total",
          label: "ESCORE TOTAL (máximo 30 pontos)",
          sum: ["t_total", "g_total"],
          hint: "≥ 24 = sem risco de desnutrição · 17–23,5 = risco de desnutrição · < 17 = desnutrido",
        },
        {
          type: "select",
          key: "classificacao",
          label: "Classificação nutricional",
          options: ["Sem risco de desnutrição", "Risco de desnutrição", "Desnutrido"],
        },
        { type: "textarea", key: "conduta", label: "Conduta / observações nutricionais", rows: 4 },
      ],
    },
    closingSection("Termo de Encerramento e Assinaturas"),
  ],
};
