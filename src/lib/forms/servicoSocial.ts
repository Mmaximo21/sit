import { closingSection } from "./closing";
import type { Field, FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";

const apgar = (key: string, label: string): Field => ({
  type: "select",
  key,
  label,
  options: ["2", "1", "0"],
  hint: "2 = Sempre · 1 = Algumas vezes · 0 = Nunca",
});

export const servicoSocialForm: FormSpec = {
  specialty: "Serviço Social",
  title: "Avaliação Sócio-Familiar",
  subtitle: "Especialidade: Serviço Social",
  sections: [
    {
      title: "1. Dados do Residente",
      fields: [
        { type: "text", key: "nome", label: "Nome" },
        { type: "text", key: "idade", label: "Idade" },
        { type: "select", key: "sexo", label: "Sexo", options: ["Feminino", "Masculino"] },
        { type: "date", key: "nascimento", label: "Data de nascimento" },
        ...residentInfoFields(),
      ],
    },
    {
      title: "2. Avaliação (APGAR Familiar)",
      description:
        "Para cada dimensão, registre a resposta do residente: Sempre (2), Algumas vezes (1) ou Nunca (0).",
      fields: [
        apgar(
          "apgar_a",
          "A = Adaptation (Adaptação) — Estou satisfeito(a) pois posso recorrer à minha família em busca de ajuda quando alguma coisa está me incomodando ou preocupando.",
        ),
        apgar(
          "apgar_p",
          "P = Partnership (Companheirismo) — Estou satisfeito(a) com a maneira pela qual minha família e eu conversamos e compartilhamos os problemas.",
        ),
        apgar(
          "apgar_g",
          "G = Growth (Desenvolvimento) — Estou satisfeito(a) com a maneira como minha família aceita e apoia meus desejos de iniciar novas atividades.",
        ),
        apgar(
          "apgar_af",
          "A = Affection (Afetividade) — Estou satisfeito(a) com a maneira pela qual minha família demonstra afeição e reage às minhas emoções.",
        ),
        apgar(
          "apgar_r",
          "R = Resolve (Capacidade Resolutiva) — Estou satisfeito(a) com a maneira pela qual minha família e eu compartilhamos o tempo juntos.",
        ),
        {
          type: "computed",
          key: "apgar_total",
          label: "TOTAL",
          sum: ["apgar_a", "apgar_p", "apgar_g", "apgar_af", "apgar_r"],
          hint: "7 a 10 = boa funcionalidade familiar · 4 a 6 = disfunção moderada · 0 a 3 = disfunção acentuada",
        },
      ],
    },
    {
      title: "3. Interpretação",
      fields: [
        {
          type: "select",
          key: "interpretacao_resposta",
          label: "Classificação predominante",
          options: ["Sempre (2)", "Algumas vezes (1)", "Nunca (0)"],
        },
        {
          type: "textarea",
          key: "interpretacao",
          label: "Interpretação / parecer social",
          rows: 8,
        },
      ],
    },
    {
      title: "4. Religião",
      fields: [
        {
          type: "select",
          key: "religiao",
          label: "Religião",
          options: [
            "Católica",
            "Evangélica",
            "Espírita",
            "Umbanda/Candomblé",
            "Outra",
            "Não possui",
          ],
        },
        {
          type: "select",
          key: "praticante",
          label: "Praticante",
          options: ["Sim", "Não", "Ocasionalmente"],
        },
        {
          type: "select",
          key: "onde_pratica",
          label: "Onde pratica",
          options: ["Na ILPI", "Em templo/igreja externa", "No quarto", "Não pratica"],
        },
        {
          type: "select",
          key: "frequencia_religiao",
          label: "Frequência",
          options: ["Diária", "Semanal", "Mensal", "Esporádica", "Não frequenta"],
        },
        { type: "textarea", key: "religiao_obs", label: "Observações", rows: 3 },
      ],
    },
    {
      title: "5. Preferências Pessoais",
      fields: [
        { type: "checkbox", key: "pref_reflexao", label: "Prefere atividades de reflexão" },
        {
          type: "checkbox",
          key: "pref_rodas_filosoficas",
          label: "Gosta de rodas de conversa filosóficas",
        },
        { type: "textarea", key: "pref_outras", label: "Outras preferências", rows: 3 },
      ],
    },
    {
      title: "6. Área Social (ILPI)",
      fields: [
        {
          type: "table",
          key: "area_social",
          label: "Atividades",
          addable: true,
          columns: [
            { key: "atividade", label: "Atividade", type: "text" },
            { key: "detalhamento", label: "Detalhamento", type: "text" },
            { key: "periodo", label: "Período", type: "text" },
            {
              key: "participantes",
              label: "Participantes",
              type: "select",
              options: [
                "Residente",
                "Residente e familiares",
                "Grupo de residentes",
                "Não participou",
              ],
            },
            { key: "conf", label: "Conf.", type: "checkbox" },
          ],
          rows: [
            {
              atividade: "Rodas de conversa",
              detalhamento: "Memórias da infância",
              periodo: "01/01 a 30/06",
            },
            { atividade: "Café coletivo", detalhamento: "Bolo caseiro", periodo: "01/01 a 30/06" },
            { atividade: "Festas", detalhamento: "Aniversariantes", periodo: "01/01 a 30/06" },
            { atividade: "Jogos de mesa", detalhamento: "Bingo/Dominó", periodo: "01/01 a 30/06" },
          ],
        },
      ],
    },
    {
      title: "7. Visitas",
      fields: [
        {
          type: "table",
          key: "visitas",
          label: "Registro de visitas",
          addable: true,
          columns: [
            { key: "periodo", label: "Período", type: "text" },
            {
              key: "tipo",
              label: "Tipo",
              type: "select",
              options: ["Presencial", "Telefônica", "Videochamada"],
            },
            {
              key: "qtd",
              label: "Quantidade de visitas",
              type: "select",
              options: Array.from({ length: 101 }, (_, i) => String(i)),
            },
          ],
          rows: [{ periodo: "Jan" }, { periodo: "Fev" }, { periodo: "Mar" }],
        },
      ],
    },
    {
      title: "8. Meta",
      fields: [{ type: "textarea", key: "meta", label: "Meta do acompanhamento social", rows: 8 }],
    },
    {
      ...closingSection("Termo de Encerramento e Assinaturas"),
      description:
        "Preenchimento obrigatório. Declaro que as informações registradas neste formulário de Avaliação Geriátrica Ampla (AGA) refletem fielmente os dados coletados na data abaixo indicada.",
    },
  ],
};
