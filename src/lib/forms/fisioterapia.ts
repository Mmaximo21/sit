import { closingSection } from "./closing";
import type { Field, FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";
import { SIM_NAO } from "./types";

const KATZ_OPTIONS = [
  "Independência — faz sozinho, totalmente e corretamente",
  "Dependência parcial — ajuda não humana (órtese/apoio material)",
  "Dependência parcial — ajuda humana / supervisão",
  "Dependência total — não realiza a atividade",
];

const katz = (key: string, label: string, hint: string): Field => ({
  type: "select",
  key,
  label,
  options: KATZ_OPTIONS,
  hint,
});

const risco = (key: string, label: string): Field => ({
  type: "radio",
  key,
  label,
  options: SIM_NAO,
});

export const fisioterapiaForm: FormSpec = {
  specialty: "Fisioterapia",
  title: "Avaliação Fisioterapêutica",
  subtitle: "Especialidade: Fisioterapia",
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
      title: "II. Avaliação da Funcionalidade Global (AVD's Básicas — Katz)",
      description:
        "Index de Independência nas Atividades Básicas de Vida Diária de Sidney Katz (1963) e Likert modificados. Classifique cada função conforme o desempenho habitual da pessoa idosa.",
      fields: [
        katz(
          "katz_banhar",
          "Banhar-se",
          "Usa adequadamente sabão e/ou esponja e chuveiro; entrar e sair do banheiro.",
        ),
        katz(
          "katz_vestir",
          "Vestir-se",
          "Apanha a roupa do armário ou gaveta, veste-se e consegue despir-se. Exclui-se calçados.",
        ),
        katz(
          "katz_banheiro",
          "Uso do banheiro",
          "Locomove-se até o banheiro, despe-se, limpa-se e arruma a roupa.",
        ),
        katz(
          "katz_transferir",
          "Transferir-se",
          "Locomove-se da cama para a cadeira e vice-versa.",
        ),
        katz(
          "katz_miccao",
          "Controle esfincteriano — Micção",
          "Controle da micção; uso de fralda ou cateter.",
        ),
        katz(
          "katz_evacuacao",
          "Controle esfincteriano — Evacuação",
          "Controle dos movimentos intestinais; uso de fralda.",
        ),
        katz(
          "katz_alimentar",
          "Alimentar-se",
          "Consegue apanhar a comida do prato ou equivalente e levar à boca.",
        ),
        {
          type: "select",
          key: "katz_classificacao",
          label: "Classificação final (Katz)",
          options: ["Independente", "Dependência parcial", "Dependente"],
        },
        {
          type: "textarea",
          key: "katz_obs",
          label: "Observações sobre a funcionalidade global",
          rows: 4,
        },
      ],
    },
    {
      title: "III. Quedas",
      fields: [
        risco("quedas_historia", "História de quedas no último ano"),
        risco("quedas_repercussao", "Repercussão funcional"),
        risco("quedas_ajuda", "Necessidade de ajuda para levantar-se"),
        risco("quedas_fratura", "Fratura"),
        { type: "text", key: "quedas_numero", label: "Número de quedas / ano" },
        {
          type: "select",
          key: "fratura_local",
          label: "Local da fratura",
          options: ["Não se aplica", "Vértebra", "Fêmur", "Antebraço", "Outro"],
        },
        {
          type: "radio",
          key: "fratura_mecanismo",
          label: "Mecanismo da fratura",
          options: ["Não se aplica", "Espontânea", "Acidental"],
        },
      ],
    },
    {
      title: "IV. Mobilidade e Marcha",
      fields: [
        {
          type: "select",
          key: "marcha_classificacao",
          label: "Classificação da marcha",
          options: [
            "1 — Sozinho",
            "2 — Ajuda ocasional",
            "3 — Ajuda frequente",
            "4 — Muleta ou bengala",
            "5 — Andador",
            "6 — Cadeira de rodas",
            "7 — Imobilidade completa (acamado)",
          ],
        },
        {
          type: "select",
          key: "marcha_tipo",
          label: "Tipo de marcha",
          options: [
            "Fisiológica",
            "Ceifante (hemiplégica)",
            "Parkinsoniana (em bloco)",
            "Escarvante",
            "Anserina (miopática)",
            "Atáxica / ebriosa",
            "Claudicante (antálgica)",
            "Não deambula",
          ],
        },
        { type: "textarea", key: "mobilidade_obs", label: "Observações sobre mobilidade", rows: 4 },
      ],
    },
    {
      title: "V. Escala Ambiental de Risco de Quedas",
      description: "Marque Sim ou Não para cada item avaliado no ambiente do residente.",
      fields: [
        { type: "note", key: "amb_nota_locomocao", label: "Áreas de locomoção" },
        risco("amb_loc_desimpedidas", "Áreas de locomoção desimpedidas"),
        risco("amb_loc_barras", "Barras de apoio"),
        risco("amb_loc_revestimento", "Revestimentos: uniformes ou tapetes bem fixos"),

        { type: "note", key: "amb_nota_iluminacao", label: "Iluminação" },
        risco(
          "amb_ilum_suficiente",
          "Suficiente para clarear toda a superfície de marcha no interior de cada cômodo, incluindo degraus",
        ),
        risco("amb_ilum_interruptores", "Interruptores acessíveis na entrada dos cômodos"),
        risco("amb_ilum_sentinela", "Sentinela iluminando o quarto, o corredor e o banheiro"),
        risco("amb_ilum_exterior", "Iluminação exterior suficiente para iluminar toda a entrada"),
        risco("amb_ilum_cama", "Cama com luz indireta"),

        { type: "note", key: "amb_nota_quarto", label: "Quarto de dormir" },
        risco("amb_quarto_guarda_roupa", "Guarda-roupa: cabides facilmente acessíveis"),
        risco("amb_quarto_cadeira", "Cadeira permitindo se assentar para se vestir"),
        risco("amb_quarto_cama", "Cama de boa altura (45 cm)"),

        { type: "note", key: "amb_nota_banheiro", label: "Banheiro" },
        risco("amb_banho_lavabo", "Lavabo facilmente acessível e bem fixo"),
        risco("amb_banho_chuveiro", "Área do chuveiro antiderrapante"),
        risco("amb_banho_box", "Box: abertura fácil, cortina bem firme"),

        { type: "note", key: "amb_nota_cozinha", label: "Cozinha" },
        risco("amb_coz_armarios", "Armários baixos, sem necessidade de uso de escada"),
        risco(
          "amb_coz_pia",
          "Pia sem vazamentos e que permite entrada de cadeira de rodas se necessário",
        ),

        { type: "note", key: "amb_nota_escada", label: "Escada" },
        risco(
          "amb_esc_revestimento",
          "Revestimento antiderrapante, marcação do primeiro e último degraus com faixa amarela",
        ),
        risco("amb_esc_corrimao_bilateral", "Corrimão bilateral"),
        risco("amb_esc_corrimao_solido", "Corrimão sólido"),
        risco(
          "amb_esc_corrimao_prolonga",
          "Corrimão que se prolonga além do primeiro e do último degraus",
        ),
        risco("amb_esc_espelho", "Espelho do degrau fechado, com lixas antiderrapantes"),
        risco(
          "amb_esc_uniformidade",
          "Uniformidade dos degraus: altura dos espelhos e profundidade constantes",
        ),

        {
          type: "textarea",
          key: "amb_obs",
          label: "Observações / adequações recomendadas",
          rows: 4,
        },
      ],
    },
    closingSection("Termo de Encerramento e Assinaturas"),
  ],
};
