import { closingSection } from "./closing";
import { residentInfoFields } from "./resident-info";
import type { Field, FormSpec, Section } from "./types";

/** Numeração e nomenclatura institucionais do PIA por especialidade. */
const SECTION_INFO: Record<string, { title: string; subtitle: string }> = {
  Geriatria: { title: "18.2 — Condições de Saúde", subtitle: "Avaliação Médica" },
  Enfermagem: { title: "18.1 — Avaliação de Enfermagem", subtitle: "Avaliação de Enfermagem" },
  "Técnico de Enfermagem": {
    title: "18.1 — Avaliação de Enfermagem",
    subtitle: "Avaliação de Enfermagem",
  },
  Nutrição: { title: "22 — Avaliação Nutricional", subtitle: "Avaliação Nutricional" },
  Fisioterapia: { title: "21 — Avaliação Fisioterapia", subtitle: "Avaliação Fisioterapêutica" },
  "Terapia Ocupacional": {
    title: "23 — Avaliação Terapeuta Ocupacional",
    subtitle: "Avaliação de Terapia Ocupacional",
  },
  Fonoaudiologia: { title: "18.7 — Condições de Saúde", subtitle: "Avaliação Fonoaudiológica" },
  Fonoaudióloga: { title: "18.7 — Condições de Saúde", subtitle: "Avaliação Fonoaudiológica" },
  Psicologia: { title: "20 — Avaliação Psicologia", subtitle: "Avaliação Psicológica" },
  "Serviço Social": { title: "19 — Condições de Saúde", subtitle: "Avaliação Social" },
};

export function piaSectionTitle(specialty: string) {
  return SECTION_INFO[specialty]?.title ?? `Condições de Saúde`;
}

function piaSectionSubtitle(specialty: string) {
  return SECTION_INFO[specialty]?.subtitle ?? `Avaliação de ${specialty}`;
}

/** Campos padrão (usados por Geriatria e demais especialidades). */
const DEFAULT_FIELDS: Field[] = [
  {
    type: "textarea",
    key: "diagnosticos",
    label: "Diagnósticos",
    rows: 4,
    placeholder: "Um diagnóstico por linha",
    required: true,
  },
  {
    type: "textarea",
    key: "evolucao",
    label: "Evolução clínica do período",
    rows: 14,
    required: true,
  },
  {
    type: "textarea",
    key: "metas",
    label: "Metas",
    rows: 7,
    placeholder: "Uma meta por linha",
    required: true,
  },
  {
    type: "textarea",
    key: "prazos",
    label: "Prazos",
    rows: 7,
    placeholder: "Um prazo por linha",
    required: true,
  },
];

/** Modelo institucional da Avaliação de Enfermagem (18.1), na ordem da página. */
const ENFERMAGEM_FIELDS: Field[] = [
  {
    type: "textarea",
    key: "imunizacao",
    label: "Imunização",
    rows: 5,
    placeholder: "Ex.: INFLUENZA – 03/04/2025 / LOTE - 2500844",
  },
  {
    type: "textarea",
    key: "pela_enfermagem",
    label: "Pela enfermagem",
    rows: 12,
    placeholder: "Histórico, diagnósticos, exames, consultas e escalas aplicadas",
    required: true,
  },
  {
    type: "textarea",
    key: "acompanhamento_especializado",
    label: "Acompanhamento especializado de saúde",
    rows: 5,
  },
  {
    type: "textarea",
    key: "necessidade_atendimento",
    label: "Necessidade de atendimento especializado",
    rows: 3,
    placeholder: "Ex.: Psiquiatria, Clínica Geral, Geriatria, Fisioterapia",
  },
  {
    type: "textarea",
    key: "medicacoes",
    label: "Medicações",
    rows: 10,
    placeholder: "Uma medicação por linha",
  },
  { type: "textarea", key: "atopias", label: "Histórico de atopias", rows: 4 },
  { type: "textarea", key: "parametros_vitais", label: "Parâmetros vitais", rows: 3 },
  { type: "textarea", key: "eliminacoes", label: "Eliminações urinárias e intestinais", rows: 3 },
  { type: "textarea", key: "exame_fisico", label: "Exame físico", rows: 10 },
  {
    type: "textarea",
    key: "exame_membros",
    label: "Exame físico em membros superiores e inferiores",
    rows: 7,
  },
  { type: "textarea", key: "exame_neuromuscular", label: "Exame físico neuromuscular", rows: 5 },
  {
    type: "textarea",
    key: "diagnosticos",
    label: "Diagnóstico de enfermagem apresentados pelo paciente",
    rows: 6,
    placeholder: "Um diagnóstico por linha",
    required: true,
  },
  { type: "textarea", key: "intervencao", label: "Intervenção de enfermagem", rows: 14 },
  { type: "textarea", key: "prescricao", label: "Prescrição de enfermagem", rows: 16 },
  {
    type: "textarea",
    key: "metas",
    label: "Metas",
    rows: 8,
    placeholder: "Uma meta por linha",
    required: true,
  },
  {
    type: "textarea",
    key: "prazos",
    label: "Prazos",
    rows: 6,
    placeholder: "Um prazo por linha",
    required: true,
  },
];

/** Meses do ano para os selects do trimestre (Fisioterapia). */
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Modelo institucional da Avaliação de Fisioterapia (21), na ordem da página. */
const FISIOTERAPIA_FIELDS: Field[] = [
  {
    type: "select",
    key: "mes_1_nome",
    label: "1º mês do trimestre",
    options: MESES,
    required: true,
  },
  {
    type: "textarea",
    key: "mes_1",
    label: "1º mês — Evolução, condutas e frequência do período",
    rows: 8,
    required: true,
  },
  {
    type: "select",
    key: "mes_2_nome",
    label: "2º mês do trimestre",
    options: MESES,
    required: true,
  },
  {
    type: "textarea",
    key: "mes_2",
    label: "2º mês — Evolução, condutas e frequência do período",
    rows: 8,
    required: true,
  },
  {
    type: "select",
    key: "mes_3_nome",
    label: "3º mês do trimestre",
    options: MESES,
    required: true,
  },
  {
    type: "textarea",
    key: "mes_3",
    label: "3º mês — Evolução, condutas e frequência do período",
    rows: 8,
    required: true,
  },
  { type: "textarea", key: "objetivo", label: "Objetivo", rows: 6, required: true },
  { type: "textarea", key: "meta", label: "Meta", rows: 6, required: true },
];

/** Modelo institucional da Avaliação Nutricional (22), na ordem da página. */
const NUTRICAO_FIELDS: Field[] = [
  {
    type: "select",
    key: "mes_1_nome",
    label: "1º mês do trimestre",
    options: MESES,
    required: true,
  },
  {
    type: "select",
    key: "mes_2_nome",
    label: "2º mês do trimestre",
    options: MESES,
    required: true,
  },
  {
    type: "select",
    key: "mes_3_nome",
    label: "3º mês do trimestre",
    options: MESES,
    required: true,
  },
  {
    type: "text",
    key: "ano_trimestre",
    label: "Ano do trimestre",
    placeholder: "Ex.: 2026",
    required: true,
  },
  {
    type: "textarea",
    key: "evolucao_trimestre",
    label: "Evolução nutricional do trimestre",
    rows: 16,
    placeholder:
      "Estado geral, dentição, alimentação, eliminações, ingesta hídrica, nível de assistência nutricional, peso, estatura, IMC, necessidades estimadas e pontos de atenção",
    required: true,
  },
  { type: "textarea", key: "objetivo", label: "Objetivo", rows: 6, required: true },
  { type: "textarea", key: "meta", label: "Meta", rows: 6, required: true },
  { type: "textarea", key: "prazo", label: "Prazo", rows: 5, required: true },
];

/** Modelo institucional da Avaliação Psicológica (20), na ordem da página. */
const PSICOLOGIA_FIELDS: Field[] = [
  { type: "textarea", key: "parte_cognitiva", label: "Parte cognitiva", rows: 8, required: true },
  {
    type: "textarea",
    key: "campo_afetivo",
    label: "Campo afetivo e emocional",
    rows: 8,
    required: true,
  },
  { type: "textarea", key: "conduta", label: "Conduta", rows: 8, required: true },
  { type: "textarea", key: "meta", label: "Meta", rows: 6, required: true },
];

/** Modelo institucional da Avaliação Terapeuta Ocupacional (23), na ordem da página. */
const TERAPIA_OCUPACIONAL_FIELDS: Field[] = [
  { type: "textarea", key: "conduta_mantida", label: "Conduta", rows: 8, required: true },
  {
    type: "textarea",
    key: "quadro_clinico",
    label: "Apresentação e quadro clínico",
    rows: 8,
    placeholder:
      "Residente, idade, quadro clínico, dependência nas AVDs e elegibilidade para Terapia Ocupacional",
    required: true,
  },
  { type: "textarea", key: "indicacao", label: "Indicação", rows: 5, required: true },
  { type: "textarea", key: "objetivo_geral", label: "Objetivo geral", rows: 5, required: true },
  {
    type: "textarea",
    key: "objetivos_especificos",
    label: "Objetivos específicos",
    rows: 8,
    required: true,
  },
  { type: "textarea", key: "meta", label: "Meta", rows: 5, required: true },
  { type: "textarea", key: "conclusao", label: "Conclusão", rows: 8, required: true },
];

/** Modelo institucional do PIA de Serviço Social (seções 1 a 18 da página). */
const SERVICO_SOCIAL_SECTIONS: Section[] = [
  {
    title: "1 — Programa de Acolhimento",
    fields: [
      {
        type: "radio",
        key: "tipo_programa",
        label: "1.1 Tipo de programa de acolhimento",
        options: ["Familiar", "Institucional"],
        required: true,
      },
    ],
  },
  {
    title: "2 — Ingresso",
    fields: [{ type: "date", key: "data_ingresso", label: "2.1 Data do ingresso", required: true }],
  },
  {
    title: "3 — Motivo do Acolhimento",
    fields: [
      {
        type: "textarea",
        key: "motivo_acolhimento",
        label: "Descrição",
        rows: 5,
        placeholder: "Ex.: Situação de rua/abandono – SDSP/CREAS",
        required: true,
      },
    ],
  },
  {
    title: "4 — Identificação da Pessoa Idosa",
    fields: [
      { type: "text", key: "nome_idoso", label: "Nome", required: true },
      { type: "date", key: "nascimento_idoso", label: "Data de nascimento" },
      { type: "text", key: "naturalidade", label: "Naturalidade" },
      { type: "text", key: "rg", label: "RG" },
      { type: "text", key: "orgao_emissor", label: "Órgão emissor" },
      { type: "text", key: "cpf", label: "CPF" },
      { type: "text", key: "cartao_sus", label: "Cartão SUS" },
      {
        type: "radio",
        key: "estado_civil",
        label: "Estado civil",
        options: ["Solteiro(a)", "Casado(a)", "União Estável", "Viúvo(a)", "Separado(a)"],
      },
      { type: "text", key: "endereco", label: "Endereço" },
      { type: "text", key: "endereco_referencia", label: "Referência" },
      {
        type: "attachments",
        key: "foto_identificacao",
        label: "Foto de identificação",
        hint: "Envie a foto de identificação da pessoa idosa. Ela é incorporada ao arquivo baixado.",
        accept: "image/*",
      },
    ],
  },
  {
    title: "5 — Referência Familiar",
    fields: [
      {
        type: "textarea",
        key: "referencia_familiar",
        label: "Nome e vínculo",
        rows: 3,
        placeholder: "Ex.: Cristina Rezende de Souza – casada com o primo do residente",
      },
    ],
  },
  {
    title: "6 — Condições de Saúde",
    fields: [
      {
        type: "radio",
        key: "necessita_tratamento",
        label: "Necessita de tratamento médico ou especializado",
        options: ["Sim", "Não"],
      },
      { type: "textarea", key: "quais_tratamentos", label: "Quais", rows: 3 },
      { type: "text", key: "unidade_saude", label: "Unidade de saúde" },
      { type: "textarea", key: "unidade_endereco_telefone", label: "Endereço e telefone", rows: 3 },
      { type: "text", key: "profissional_referencia", label: "Nome do profissional de referência" },
      { type: "text", key: "agente_comunitario", label: "Agente comunitário de saúde" },
      { type: "textarea", key: "diagnostico", label: "Diagnóstico", rows: 4 },
    ],
  },
  {
    title: "6.1 — Capacidade Civil e Benefícios",
    fields: [
      { type: "radio", key: "interdicao", label: "Interdição", options: ["Possui", "Não possui"] },
      { type: "textarea", key: "interdicao_descricao", label: "Descrição", rows: 3 },
      { type: "text", key: "curador_responsavel", label: "Curador / responsável" },
      {
        type: "radio",
        key: "beneficios",
        label: "Benefícios",
        options: ["Recebe", "Não recebe", "Encontra-se bloqueado"],
      },
      { type: "textarea", key: "beneficios_descricao", label: "Descreva", rows: 3 },
    ],
  },
  {
    title: "7 — Visitação",
    fields: [
      {
        type: "table",
        key: "visitacao",
        label: "Registro de visitação",
        addable: true,
        columns: [
          { key: "visitante", label: "Quem visita o acolhido", type: "text" },
          { key: "ultima_visita", label: "Última visitação", type: "text" },
          { key: "referencia", label: "Qual referência", type: "text" },
          { key: "interacao", label: "Interação entre visitante e acolhido", type: "text" },
        ],
        rows: [{}, {}, {}],
      },
    ],
  },
  {
    title: "8 — Ameaça ou Violação à Integridade Física e Psíquica do Acolhido",
    fields: [
      { type: "checkbox", key: "viol_psicologica", label: "Violência Psicológica" },
      { type: "checkbox", key: "viol_patrimonial", label: "Violência Patrimonial" },
      {
        type: "checkbox",
        key: "viol_institucional",
        label: "Violência e/ou Negligência Institucional",
      },
      { type: "checkbox", key: "viol_situacao_rua", label: "Situação de Rua" },
      { type: "checkbox", key: "viol_outros", label: "Outros" },
      {
        type: "text",
        key: "viol_outros_desc",
        label: "Outros — especifique",
        placeholder: "Ex.: Situação de risco",
      },
    ],
  },
  {
    title: "9 — Condições Desfavoráveis dos Filhos/Responsáveis para Cuidar do Idoso",
    fields: [
      { type: "checkbox", key: "cond_saude_fisica", label: "Problemas de saúde física" },
      {
        type: "checkbox",
        key: "cond_psicologicos",
        label: "Problemas psicológicos (stress, ansiedade, etc.)",
      },
      {
        type: "checkbox",
        key: "cond_conflitos",
        label: "Conflitos familiares / relacionamentos violentos",
      },
      { type: "checkbox", key: "cond_falta_apoio", label: "Falta de apoio parental ou relacional" },
      { type: "checkbox", key: "cond_alcoolismo", label: "Alcoolismo" },
      { type: "checkbox", key: "cond_dependencia", label: "Dependência química" },
      { type: "checkbox", key: "cond_deficiencia", label: "Pessoa com deficiência(s)" },
      {
        type: "checkbox",
        key: "cond_incapacidade_filhos",
        label: "Incapacidade dos filhos em lidar com a conduta do idoso",
      },
      { type: "checkbox", key: "cond_outros", label: "Outros" },
      { type: "text", key: "cond_outros_desc", label: "Outros — especifique" },
    ],
  },
  {
    title: "10 — Com Quem Reside",
    fields: [
      {
        type: "radio",
        key: "com_quem_reside",
        label: "Com quem reside",
        options: [
          "Sozinho(a)",
          "Cônjuge",
          "Companheiro(a)",
          "Filhos(as)",
          "Família",
          "Neto(a)",
          "Irmão(ã)",
          "Amigo(a)",
          "Sobrinho(a)",
          "Outros",
        ],
      },
      { type: "text", key: "com_quem_reside_outros", label: "Outros — especifique" },
    ],
  },
  {
    title: "11 — Situação Habitacional",
    fields: [
      {
        type: "radio",
        key: "situacao_habitacional",
        label: "Situação habitacional",
        options: ["Própria", "Alugada", "Cedida", "Aluguel Social", "Outros"],
      },
      { type: "text", key: "situacao_habitacional_outros", label: "Outros — especifique" },
    ],
  },
  {
    title: "12 — Programas, Benefícios e Serviços Socioassistenciais",
    fields: [
      { type: "radio", key: "cadastro_unico", label: "Cadastro Único", options: ["Sim", "Não"] },
      { type: "text", key: "nis", label: "NIS" },
      { type: "radio", key: "bpc", label: "BPC", options: ["Sim", "Não"] },
      { type: "radio", key: "aposentadoria", label: "Aposentadoria", options: ["Sim", "Não"] },
      { type: "radio", key: "pensao_morte", label: "Pensão por morte", options: ["Sim", "Não"] },
    ],
  },
  {
    title: "13 — Renda do Idoso",
    fields: [
      {
        type: "radio",
        key: "renda",
        label: "Renda",
        options: [
          "Menos de meio salário mínimo",
          "Entre meio e um salário",
          "Entre um e dois salários mínimos",
          "Mais de dois salários mínimos",
          "Não possui renda",
          "Sem informações",
        ],
      },
    ],
  },
  {
    title: "14 — Encaminhamentos",
    fields: [
      { type: "radio", key: "delegacia", label: "Delegacia", options: ["Sim", "Não"] },
      { type: "text", key: "ro_numero", label: "R.O. nº" },
      { type: "text", key: "mp_oficio", label: "MP — ofício de encaminhamento nº" },
      { type: "date", key: "mp_data", label: "MP — data" },
      { type: "text", key: "cras_scfv", label: "CRAS (SCFV)" },
      { type: "date", key: "cras_data", label: "CRAS — data" },
      { type: "text", key: "caps", label: "CAPS" },
      { type: "date", key: "caps_data", label: "CAPS — data" },
      { type: "text", key: "ilpi", label: "ILPI" },
      { type: "date", key: "ilpi_data", label: "ILPI — data" },
      { type: "text", key: "defensoria", label: "Defensoria Pública" },
      { type: "date", key: "defensoria_data", label: "Defensoria Pública — data" },
    ],
  },
  {
    title: "15 — Acolhimento Institucional ou Familiar Anterior",
    fields: [
      {
        type: "textarea",
        key: "entidades_anteriores",
        label: "Entidades anteriores e período de acolhimento",
        rows: 4,
      },
      {
        type: "textarea",
        key: "causa_retorno",
        label: "Causa para o retorno ao programa de acolhimento",
        rows: 4,
      },
    ],
  },
  {
    title: "16 — Plano de Atendimento",
    fields: [
      {
        type: "textarea",
        key: "encaminhamentos_realizados",
        label: "Encaminhamentos realizados",
        rows: 6,
      },
      {
        type: "textarea",
        key: "atendimentos_realizados",
        label: "Atendimentos realizados",
        rows: 6,
      },
    ],
  },
  {
    title: "17 — Situação de Saúde da Pessoa Idosa",
    fields: [
      {
        type: "radio",
        key: "doenca_envelhecimento",
        label: "Apresenta alguma doença relacionada ao envelhecimento já diagnosticada",
        options: ["Sim", "Não"],
      },
      { type: "textarea", key: "doenca_explique", label: "Explique", rows: 4 },
    ],
  },
  {
    title: "18 — Possibilidade de Reintegração Familiar",
    fields: [
      {
        type: "radio",
        key: "reintegracao",
        label: "Possibilidade de reintegração familiar",
        options: ["Sim", "Não"],
      },
      { type: "textarea", key: "proposta", label: "Proposta", rows: 8, required: true },
    ],
  },
  {
    title: "19 — Avaliação do Serviço Social",
    subtitle: "Avaliação do Serviço Social",
    fields: [
      {
        type: "select",
        key: "mes_1_nome",
        label: "1º mês do trimestre",
        options: MESES,
        required: true,
      },
      {
        type: "select",
        key: "mes_2_nome",
        label: "2º mês do trimestre",
        options: MESES,
        required: true,
      },
      {
        type: "select",
        key: "mes_3_nome",
        label: "3º mês do trimestre",
        options: MESES,
        required: true,
      },
      {
        type: "text",
        key: "ano_trimestre",
        label: "Ano do trimestre",
        placeholder: "Ex.: 2026",
        required: true,
      },
      {
        type: "textarea",
        key: "avaliacao_social",
        label: "Avaliação social do trimestre",
        rows: 14,
        placeholder:
          "Histórico, quadro funcional, rede de apoio, visitas e acompanhamentos do período",
        required: true,
      },
      { type: "textarea", key: "meta", label: "Meta", rows: 6, required: true },
      { type: "textarea", key: "objetivos", label: "Objetivos", rows: 8, required: true },
      { type: "textarea", key: "prazo", label: "Prazo", rows: 5, required: true },
      {
        type: "attachments",
        key: "anexos",
        label: "Documentos e imagens anexados",
        hint: "Envie fotos, documentos digitalizados ou PDFs. As imagens são incorporadas ao arquivo baixado.",
        accept: "image/*,application/pdf",
      },
    ],
  },
];

function piaSectionFields(specialty: string): Field[] {
  if (specialty === "Enfermagem" || specialty === "Técnico de Enfermagem") return ENFERMAGEM_FIELDS;
  if (specialty === "Fisioterapia") return FISIOTERAPIA_FIELDS;
  if (specialty === "Nutrição") return NUTRICAO_FIELDS;
  if (specialty === "Psicologia") return PSICOLOGIA_FIELDS;
  if (specialty === "Terapia Ocupacional") return TERAPIA_OCUPACIONAL_FIELDS;
  return DEFAULT_FIELDS;
}

/** Plano Individual de Atendimento (PIA) — estrutura única para todas as especialidades. */
export function getPiaSpec(specialty: string): FormSpec {
  return {
    specialty,
    title: "Plano Individual de Atendimento — PIA",
    subtitle: `Especialidade: ${specialty}`,
    sections: [
      {
        title: "I. Identificação",
        fields: [
          { type: "text", key: "nome", label: "Residente", required: true },
          {
            type: "text",
            key: "periodo",
            label: "Período do plano",
            placeholder: "Ex.: Abril a junho, 2026",
            required: true,
          },
          { type: "text", key: "idade", label: "Idade" },
          { type: "date", key: "nascimento", label: "Data de nascimento", required: true },
          ...residentInfoFields(),
        ],
      },
      ...(specialty === "Serviço Social"
        ? SERVICO_SOCIAL_SECTIONS
        : [
            {
              title: piaSectionTitle(specialty),
              subtitle: piaSectionSubtitle(specialty),
              description:
                "Preencha os campos na ordem do modelo institucional, mantendo a numeração da página.",
              fields: piaSectionFields(specialty),
            },
          ]),

      {
        ...closingSection("Termo de Encerramento e Assinaturas"),
        description:
          "Preenchimento obrigatório. Declaro que as informações registradas neste Plano Individual de Atendimento (PIA) refletem fielmente os dados coletados na data abaixo indicada.",
      },
    ],
  };
}
