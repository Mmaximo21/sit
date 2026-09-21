import { closingSection } from "./closing";
import type { Field, FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";

const KATZ_OPTIONS = ["Sem ajuda", "Com ajuda parcial", "Dependente"];

const katz = (key: string, label: string): Field => ({
  type: "select",
  key,
  label,
  options: KATZ_OPTIONS,
});

const lawton = (key: string, label: string): Field => ({
  type: "select",
  key,
  label,
  options: ["3 — Sem ajuda", "2 — Ajuda parcial", "1 — Incapaz"],
});

export const terapiaOcupacionalForm: FormSpec = {
  specialty: "Terapia Ocupacional",
  title: "Avaliação de Terapia Ocupacional",
  subtitle: "AGA — Avaliação Gerontológica Ampla · Terapia Ocupacional",
  sections: [
    {
      title: "I. Identificação",
      fields: [
        { type: "text", key: "nome", label: "Nome do residente" },
        { type: "date", key: "nascimento", label: "Data de nascimento (D/N)" },
        { type: "text", key: "idade", label: "Idade" },
        { type: "select", key: "sexo", label: "Sexo", options: ["Feminino", "Masculino"] },
        ...residentInfoFields(),
      ],
    },
    {
      title: "II. Atividades de Vida Diária Básicas — Katz (adaptado)",
      description: "Classifique o desempenho habitual do residente em cada atividade básica.",
      fields: [
        katz("katz_banho", "Banho"),
        katz("katz_vestir", "Vestir-se"),
        katz("katz_banheiro", "Uso do banheiro"),
        katz("katz_transferencia", "Transferência"),
        katz("katz_miccao", "Continência — micção"),
        katz("katz_evacuacao", "Continência — evacuação"),
        katz("katz_alimentacao", "Alimentação"),
        {
          type: "textarea",
          key: "katz_obs",
          label: "Observações sobre desempenho e necessidade de assistência",
          rows: 4,
        },
      ],
    },
    {
      title: "III. Atividades Instrumentais de Vida Diária — Lawton",
      description: "3 = sem ajuda, 2 = ajuda parcial, 1 = incapaz. Pontuação máxima 27 pontos.",
      fields: [
        lawton("lawton_refeicoes", "Preparar refeições"),
        lawton("lawton_remedios", "Tomar medicamentos corretamente"),
        lawton("lawton_compras", "Fazer compras"),
        lawton("lawton_dinheiro", "Controlar dinheiro / finanças"),
        lawton("lawton_telefone", "Usar telefone"),
        lawton("lawton_casa", "Arrumar a casa"),
        lawton("lawton_roupa", "Lavar / passar roupa"),
        lawton("lawton_domesticos", "Pequenos trabalhos domésticos"),
        lawton("lawton_sair", "Sair sozinho para lugares mais distantes / usar transporte"),
        {
          type: "computed",
          key: "lawton_total",
          label: "TOTAL (Lawton)",
          sum: [
            "lawton_refeicoes",
            "lawton_remedios",
            "lawton_compras",
            "lawton_dinheiro",
            "lawton_telefone",
            "lawton_casa",
            "lawton_roupa",
            "lawton_domesticos",
            "lawton_sair",
          ],
          hint: "Máximo 27 pontos.",
        },
        { type: "textarea", key: "lawton_obs", label: "Observações", rows: 3 },
      ],
    },
    {
      title: "IV. Desempenho Ocupacional e Participação",
      fields: [
        {
          type: "select",
          key: "do_rotina",
          label: "Rotina diária",
          options: ["Estruturada", "Parcialmente estruturada", "Desorganizada"],
        },
        {
          type: "select",
          key: "do_autonomia",
          label: "Autonomia para escolhas",
          options: ["Preservada", "Parcial", "Prejudicada"],
        },
        {
          type: "select",
          key: "do_lazer",
          label: "Atividades de interesse / lazer",
          options: ["Mantidas", "Reduzidas", "Ausentes"],
        },
        {
          type: "select",
          key: "do_participacao",
          label: "Participação nas atividades da ILPI",
          options: ["Frequente", "Eventual", "Baixa", "Não participa"],
        },
        {
          type: "select",
          key: "do_interacao",
          label: "Interação social",
          options: ["Adequada", "Reduzida", "Prejudicada"],
        },
        {
          type: "select",
          key: "do_cognicao",
          label: "Função cognitiva funcional",
          options: ["Preservada", "Leve alteração", "Moderada", "Grave"],
        },
        {
          type: "select",
          key: "do_destreza",
          label: "Coordenação / destreza manual",
          options: ["Adequada", "Alterada"],
        },
        {
          type: "select",
          key: "do_motricidade",
          label: "Motricidade funcional",
          options: ["Preservada", "Reduzida", "Comprometida"],
        },
      ],
    },
    {
      title: "V. Ambiente, Adaptações e Tecnologia Assistiva",
      fields: [
        {
          type: "radio",
          key: "amb_quarto",
          label: "Quarto",
          options: ["Adequado", "Necessita adaptação"],
        },
        {
          type: "radio",
          key: "amb_banheiro",
          label: "Banheiro",
          options: ["Adequado", "Necessita adaptação"],
        },
        {
          type: "radio",
          key: "amb_utensilios",
          label: "Utensílios para AVDs",
          options: ["Adequados", "Necessitam adaptação"],
        },
        { type: "radio", key: "amb_ta", label: "Tecnologia assistiva", options: ["Não", "Sim"] },
        {
          type: "select",
          key: "amb_dispositivo",
          label: "Dispositivo utilizado",
          options: ["Nenhum", "Cadeira de rodas", "Andador", "Bengala", "Órtese", "Outro"],
        },
        { type: "text", key: "amb_dispositivo_outro", label: "Outro dispositivo (especificar)" },
        {
          type: "radio",
          key: "amb_barreiras",
          label: "Barreiras ambientais",
          options: ["Não identificadas", "Identificadas"],
        },
        { type: "textarea", key: "amb_adaptacoes", label: "Adaptações necessárias", rows: 4 },
      ],
    },
    {
      title: "VI. Impressão Terapêutico-Ocupacional e Plano de Cuidado",
      fields: [
        {
          type: "radio",
          key: "imp_desempenho",
          label: "Desempenho ocupacional",
          options: ["Preservado", "Necessita manutenção", "Necessita intervenção"],
        },
        {
          type: "select",
          key: "imp_necessidade",
          label: "Necessidade principal",
          options: [
            "AVD",
            "AIVD",
            "Cognição funcional",
            "Participação social",
            "Lazer",
            "Tecnologia assistiva",
            "Ambiente",
          ],
        },
        { type: "textarea", key: "imp_sintese", label: "Síntese da avaliação", rows: 4 },
        { type: "textarea", key: "imp_objetivos", label: "Objetivos terapêuticos", rows: 4 },
        { type: "textarea", key: "imp_condutas", label: "Condutas / intervenções", rows: 4 },
        { type: "textarea", key: "imp_orientacoes", label: "Orientações à equipe / família", rows: 4 },
        { type: "date", key: "imp_reavaliacao", label: "Data da reavaliação" },
      ],
    },
    closingSection("Termo de Encerramento e Assinaturas"),
  ],
};
