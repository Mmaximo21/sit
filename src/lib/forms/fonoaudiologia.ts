import { closingSection } from "./closing";
import type { Field, FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";

const SIM_NAO = ["Não", "Sim"];

const simNao = (key: string, label: string): Field => ({
  type: "radio",
  key,
  label,
  options: SIM_NAO,
});

const radio = (key: string, label: string, options: string[]): Field => ({
  type: "radio",
  key,
  label,
  options,
});

export const fonoaudiologiaForm: FormSpec = {
  specialty: "Fonoaudiologia",
  title: "Avaliação Gerontológica Ampla — Fonoaudiologia",
  subtitle: "ILPI Luiza Olindina da Silva Alves · AGA — Fonoaudiologia",
  sections: [
    {
      title: "I. Identificação do Residente",
      fields: [
        { type: "text", key: "nome", label: "Nome completo" },
        { type: "date", key: "nascimento", label: "Data de nascimento" },
        { type: "text", key: "idade", label: "Idade" },
        { type: "select", key: "sexo", label: "Sexo", options: ["Feminino", "Masculino"] },
        { type: "date", key: "data_avaliacao", label: "Data da avaliação" },
        radio("grau_dependencia", "Grau de dependência", ["I", "II", "III"]),
        { type: "text", key: "responsavel", label: "Responsável/acompanhante" },
        ...residentInfoFields(),
      ],
    },
    {
      title: "II. Motivo da Avaliação / Queixa Principal",
      fields: [
        { type: "note", key: "nota_motivo", label: "Marque todos os motivos aplicáveis" },
        { type: "checkbox", key: "motivo_inicial", label: "Avaliação inicial" },
        { type: "checkbox", key: "motivo_reavaliacao", label: "Reavaliação" },
        { type: "checkbox", key: "motivo_degluticao", label: "Alteração na deglutição" },
        { type: "checkbox", key: "motivo_comunicacao", label: "Alteração da comunicação" },
        { type: "checkbox", key: "motivo_voz", label: "Alteração de voz" },
        { type: "text", key: "motivo_outro", label: "Outro motivo" },
        {
          type: "textarea",
          key: "queixa_principal",
          label: "Queixa/observação principal",
          rows: 4,
        },
      ],
    },
    {
      title: "III. Histórico Fonoaudiológico e Condições Associadas",
      fields: [
        {
          type: "textarea",
          key: "historico_fono",
          label:
            "Histórico de disfagia, alterações de fala, linguagem, voz, audição ou uso de dispositivos/próteses",
          rows: 5,
        },
        {
          type: "textarea",
          key: "condicoes_clinicas",
          label: "Condições clínicas relevantes",
          rows: 3,
        },
      ],
    },
    {
      title: "IV. Avaliação da Comunicação",
      fields: [
        radio("compreensao", "Compreensão", ["Preservada", "Leve alteração", "Moderada", "Grave"]),
        radio("expressao_verbal", "Expressão verbal", ["Preservada", "Alterada"]),
        radio("articulacao", "Articulação/fala", ["Preservada", "Alterada"]),
        radio("leitura_escrita", "Leitura/escrita", ["Preservada", "Alterada", "Não avaliada"]),
        radio("comunicacao_nao_verbal", "Comunicação não verbal", ["Adequada", "Prejudicada"]),
        { type: "textarea", key: "obs_comunicacao", label: "Observações", rows: 3 },
      ],
    },
    {
      title: "V. Voz e Audição — Triagem",
      fields: [
        radio("voz", "Voz", [
          "Adequada",
          "Rouquidão",
          "Soprosidade",
          "Intensidade reduzida",
          "Outra alteração",
        ]),
        radio("audicao", "Audição percebida", [
          "Adequada",
          "Reduzida",
          "Usa aparelho auditivo",
          "Não informado",
        ]),
        radio("uso_aparelho", "Uso do aparelho auditivo", [
          "Adequado",
          "Inadequado",
          "Não se aplica",
        ]),
        { type: "textarea", key: "obs_voz_audicao", label: "Observações", rows: 3 },
      ],
    },
    {
      title: "VI. Motricidade Orofacial",
      fields: [
        radio("labios", "Lábios", ["Adequados", "Alterados"]),
        radio("lingua", "Língua", ["Adequada", "Alterada"]),
        radio("bochechas", "Bochechas", ["Adequadas", "Alteradas"]),
        radio("mobilidade_coordenacao", "Mobilidade/coordenação", ["Adequada", "Alterada"]),
        radio("denticao", "Dentição/prótese", [
          "Dentição natural",
          "Prótese total",
          "Prótese parcial",
          "Ausente",
        ]),
        { type: "textarea", key: "obs_motricidade", label: "Observações", rows: 3 },
      ],
    },
    {
      title: "VII. Avaliação da Alimentação e Deglutição",
      fields: [
        radio("via_alimentacao", "Via de alimentação", ["Oral", "Enteral", "Mista"]),
        {
          type: "select",
          key: "consistencia",
          label: "Consistência atual",
          options: [
            "Livre",
            "Branda",
            "Pastosa",
            "Sólida modificada",
            "Líquida espessada",
            "Outra",
          ],
        },
        { type: "text", key: "consistencia_outra", label: "Outra consistência (especificar)" },
        radio("mastigacao", "Mastigação", ["Adequada", "Lentificada", "Prejudicada"]),
        radio("vedamento_labial", "Vedamento labial", ["Adequado", "Prejudicado"]),
        radio("controle_bolo", "Controle do bolo alimentar", ["Adequado", "Prejudicado"]),
        radio("degluticao", "Deglutição", ["Sem alterações observadas", "Com alterações"]),
        simNao("tosse_alimentacao", "Tosse durante/após alimentação"),
        simNao("pigarro_voz_molhada", "Pigarro/voz molhada após deglutir"),
        simNao("escape_oral", "Escape oral"),
        simNao("engasgos", "Engasgos"),
        simNao("residuos_orais", "Resíduos orais"),
        radio("tempo_alimentacao", "Tempo de alimentação", ["Adequado", "Prolongado"]),
      ],
    },
    {
      title: "VIII. Classificação do Risco / Impressão Fonoaudiológica",
      fields: [
        {
          type: "checkbox",
          key: "risco_sem_alteracao",
          label: "Sem sinais de alteração fonoaudiológica no momento",
        },
        {
          type: "checkbox",
          key: "risco_acompanhamento",
          label: "Necessita acompanhamento fonoaudiológico",
        },
        {
          type: "checkbox",
          key: "risco_disfagia",
          label: "Suspeita de disfagia — necessita avaliação/conduta específica",
        },
        {
          type: "checkbox",
          key: "risco_broncoaspiracao",
          label: "Risco aumentado de broncoaspiração",
        },
        { type: "checkbox", key: "risco_comunicacao", label: "Alteração de comunicação/linguagem" },
        { type: "checkbox", key: "risco_voz", label: "Alteração de voz" },
        {
          type: "checkbox",
          key: "risco_complementar",
          label: "Necessita avaliação complementar/encaminhamento",
        },
        { type: "textarea", key: "impressao_fono", label: "Impressão fonoaudiológica", rows: 4 },
      ],
    },
    {
      title: "IX. Conduta e Orientações",
      fields: [
        { type: "checkbox", key: "conduta_manter", label: "Manter acompanhamento fonoaudiológico" },
        { type: "checkbox", key: "conduta_cuidadores", label: "Orientar equipe de cuidadores" },
        { type: "checkbox", key: "conduta_familia", label: "Orientar família/responsável" },
        {
          type: "checkbox",
          key: "conduta_consistencia",
          label: "Adequar consistência alimentar conforme avaliação",
        },
        {
          type: "checkbox",
          key: "conduta_postura",
          label: "Orientar postura e ritmo durante alimentação",
        },
        { type: "checkbox", key: "conduta_avaliacao", label: "Solicitar avaliação complementar" },
        {
          type: "checkbox",
          key: "conduta_encaminhar",
          label: "Encaminhar para serviço/rede de saúde",
        },
        { type: "date", key: "reavaliar_em", label: "Reavaliar em" },
        { type: "textarea", key: "orientacoes", label: "Orientações/condutas", rows: 5 },
      ],
    },
    {
      title: "X. Registro da Equipe / Plano de Cuidado",
      description:
        "Necessidades identificadas e cuidados a serem incorporados à rotina do residente.",
      fields: [{ type: "textarea", key: "plano_cuidado", label: "Plano de cuidado", rows: 6 }],
    },
    closingSection(),
  ],
};
