import { closingSection } from "./closing";
import type { Field, FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";
import { SIM_NAO } from "./types";

const simNao = (key: string, label: string): Field => ({
  type: "radio",
  key,
  label,
  options: SIM_NAO,
});

export const geriatriaForm: FormSpec = {
  specialty: "Geriatria",
  title: "Avaliação Geriátrica Ampla — AGA",
  subtitle: "Especialidade: Geriatria",
  sections: [
    {
      title: "I. Identificação",
      fields: [
        { type: "text", key: "nome", label: "Nome" },
        { type: "select", key: "sexo", label: "Sexo", options: ["Feminino", "Masculino"] },
        { type: "text", key: "profissao", label: "Profissão" },
        { type: "text", key: "idade", label: "Idade" },
        { type: "date", key: "nascimento", label: "Data de Nascimento" },
        { type: "text", key: "naturalidade", label: "Naturalidade" },
        { type: "radio", key: "aposentado", label: "Aposentado", options: SIM_NAO },
        {
          type: "radio",
          key: "estado_civil",
          label: "Estado Civil",
          options: ["Casado", "Solteiro", "Viúvo(a)", "Separado(a)", "Outros"],
        },
        { type: "text", key: "escolaridade", label: "Escolaridade" },
        { type: "text", key: "telefone", label: "Telefone" },
        { type: "text", key: "cuidador", label: "Cuidador (se houver)" },
        ...residentInfoFields(),
      ],
    },
    {
      title: "II. História Patológica Pregressa",
      fields: [
        { type: "textarea", key: "hpp_lista", label: "Doenças/condições", rows: 3 },
        { type: "textarea", key: "hpp_descricao", label: "Descrição clínica do período avaliado", rows: 6 },
      ],
    },
    {
      title: "1. Geral",
      fields: [
        simNao("geral_beg", "BEG"),
        simNao("geral_astenia", "Astenia"),
        simNao("geral_lote", "LOTE"),
        simNao("geral_aparencia", "Aparência bem cuidada"),
      ],
    },
    {
      title: "2. Órgãos dos Sentidos",
      description: "Olhos",
      fields: [
        { type: "sided", key: "olhos_def_visual", label: "Deficiência visual", sides: ["Direito", "Esquerdo"], options: SIM_NAO },
        { type: "sided", key: "olhos_lentes", label: "Uso de lentes corretivas", sides: ["Direito", "Esquerdo"], options: SIM_NAO },
        { type: "sided", key: "olhos_snellen", label: "Teste de Snellen", sides: ["Direito", "Esquerdo"], options: ["< 0,3", "> 0,3"] },
        { type: "text", key: "olhos_ultima_visita", label: "Data da última visita ao oftalmologista" },
        { type: "textarea", key: "olhos_obs", label: "Observação", rows: 2 },
        { type: "note", key: "nota_orelha", label: "Orelha" },
        { type: "sided", key: "orelha_def_auditiva", label: "Deficiência auditiva", sides: ["Direito", "Esquerdo"], options: SIM_NAO },
        { type: "sided", key: "orelha_protese", label: "Uso de prótese auditiva", sides: ["Direito", "Esquerdo"], options: SIM_NAO },
        { type: "sided", key: "orelha_sussurro", label: "Teste do sussurro (60cm de cada ouvido)", sides: ["Direito", "Esquerdo"], options: ["Positivo", "Negativo"] },
        { type: "sided", key: "orelha_conversacao", label: "Dificuldades para conversação com 3 ou mais pessoas", sides: ["Direito", "Esquerdo"], options: SIM_NAO },
        { type: "text", key: "orelha_ultima_visita", label: "Data da última visita ao otorrinolaringologista" },
        { type: "textarea", key: "orelha_obs", label: "Observação", rows: 2 },
      ],
    },
    {
      title: "3. Pele e Anexos",
      fields: [
        simNao("pele_ceratose_actinica", "Ceratose actínica"),
        simNao("pele_protetor_solar", "Uso regular de protetor solar"),
        simNao("pele_ceratose_seborreica", "Ceratose seborreica"),
        simNao("pele_neoplasia", "Neoplasia cutânea"),
        simNao("pele_xerodermia", "Xerodermia"),
        simNao("pele_ulcera_mmii", "Úlcera de membros inferiores"),
        simNao("pele_hidratante", "Uso regular de creme hidratante"),
        simNao("pele_outras_lesoes", "Outras lesões"),
        { type: "textarea", key: "pele_caracteristicas", label: "Características", rows: 2 },
      ],
    },
    {
      title: "4. Aparelho Cardiovascular",
      fields: [
        simNao("cv_dispneia", "Dispneia"),
        simNao("cv_dor_toracica", "Dor torácica"),
        simNao("cv_palpitacao", "Palpitação"),
        simNao("cv_claudicacao", "Claudicação de membros inferiores"),
        { type: "textarea", key: "cv_caracteristicas", label: "Especificar característica de sintoma positivo", rows: 2 },
      ],
    },
    {
      title: "5. Aparelho Digestivo",
      fields: [
        simNao("dig_disfagia", "Disfagia"),
        simNao("dig_dispepsia", "Dispepsia"),
        simNao("dig_nauseas", "Náuseas/Vômitos"),
        simNao("dig_constipacao", "Constipação intestinal"),
        simNao("dig_diarreia", "Diarreia"),
        simNao("dig_incont_fecal", "Incontinência fecal"),
        simNao("dig_dor_abdominal", "Dor abdominal"),
        simNao("dig_hemorroidas", "Doença hemorroidária"),
        simNao("dig_flatulencia", "Flatulência"),
        { type: "textarea", key: "dig_caracteristicas", label: "Características", rows: 2 },
      ],
    },
    {
      title: "6. Aparelho Genito-urinário",
      fields: [
        simNao("gu_incontinencia", "Incontinência urinária"),
        { type: "radio", key: "gu_incont_tempo", label: "Tempo da incontinência", options: ["Recente < 30 dias", "Crônica > 30 dias"] },
        { type: "radio", key: "gu_incont_limite", label: "Grau", options: ["Limitante", "Não limitante"] },
        simNao("gu_urgencia", "Urgência"),
        simNao("gu_nocturia", "Noctúria"),
        { type: "text", key: "gu_menopausa", label: "Data da menopausa" },
        simNao("gu_reposicao", "Reposição estrogênica"),
        { type: "text", key: "gu_obstetrica", label: "História obstétrica" },
        { type: "text", key: "gu_ultima_visita", label: "Data da última visita ao ginecologista" },
      ],
    },
    {
      title: "7. Sistema Nervoso",
      fields: [
        simNao("sn_cefaleia", "Cefaleia"),
        simNao("sn_tremores", "Tremores"),
        { type: "radio", key: "sn_tremor_tipo", label: "Tipo de tremor", options: ["Repouso", "Cinético", "Indeterminado", "Misto"] },
        simNao("sn_tonturas", "Tonturas"),
        simNao("sn_zumbido", "Zumbido no ouvido"),
        simNao("sn_marcha", "Distúrbio de marcha"),
        simNao("sn_convulsao", "Convulsão"),
        simNao("sn_fala", "Distúrbios da fala"),
        { type: "textarea", key: "sn_caracteristicas", label: "Características", rows: 2 },
      ],
    },
    {
      title: "8. Aparelho Respiratório",
      fields: [
        simNao("resp_tosse", "Tosse"),
        { type: "radio", key: "resp_tosse_duracao", label: "Duração da tosse", options: ["> 4 semanas", "< 4 semanas"] },
        { type: "radio", key: "resp_tosse_tipo", label: "Tipo de tosse", options: ["Seca", "Produtiva"] },
        simNao("resp_sibilancia", "Sibilância"),
        simNao("resp_expectoracao", "Expectoração purulenta"),
        { type: "textarea", key: "resp_caracteristicas", label: "Características", rows: 2 },
      ],
    },
    {
      title: "9. Sistema Músculo-Esquelético",
      fields: [
        simNao("me_artralgia", "Artralgia"),
        { type: "textarea", key: "me_caracteristicas", label: "Características", rows: 2 },
        { type: "note", key: "nota_pes", label: "Pés" },
        { type: "checkbox", key: "pes_joanete", label: "Joanete" },
        { type: "checkbox", key: "pes_ceratose_plantar", label: "Ceratose plantar" },
        { type: "checkbox", key: "pes_ulceras", label: "Úlceras" },
        { type: "checkbox", key: "pes_unha_encravada", label: "Unha encravada" },
        { type: "checkbox", key: "pes_calcaneoalgia", label: "Calcaneoalgia" },
        { type: "checkbox", key: "pes_onicomicose", label: "Onicomicose" },
        { type: "checkbox", key: "pes_calcados", label: "Calçados inadequados" },
      ],
    },
    {
      title: "10. Avaliação da Cavidade Oral",
      description: "Mini-Avaliação da Saúde Bucal — observar a presença de:",
      fields: [
        simNao("oral_diminuicao_alimentos", "Diminuição da quantidade de alimentos ou mudança no tipo de alimentação por causa dos dentes"),
        simNao("oral_mastigacao", "Problemas de mastigação"),
        simNao("oral_edentulismo", "Edentulismo"),
        simNao("oral_protese", "Prótese dentária"),
        simNao("oral_xerostomia", "Xerostomia"),
        simNao("oral_feridas", "Feridas ou lesões na mucosa oral ou língua"),
        simNao("oral_sangramento", "Sangramento gengival"),
        { type: "textarea", key: "oral_caracteristicas", label: "Características", rows: 2 },
        { type: "textarea", key: "hospitalizacoes", label: "Hospitalizações clínicas (diagnóstico/ano)", rows: 3 },
      ],
    },
    {
      ...closingSection("Termo de Encerramento e Assinaturas"),
      description:
        "Preenchimento obrigatório. Declaro que as informações registradas neste formulário de Avaliação Geriátrica Ampla (AGA) refletem fielmente os dados coletados na data abaixo indicada.",
    },
  ],
};
