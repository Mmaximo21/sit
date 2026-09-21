import { closingSection } from "./closing";
import type { Field, FormSpec } from "./types";
import { residentInfoFields } from "./resident-info";
import { SIM_NAO } from "./types";

const simNao = (key: string, label: string, hint?: string): Field => ({
  type: "select",
  key,
  label,
  options: SIM_NAO,
  ...(hint ? { hint } : {}),
});

export const enfermagemForm: FormSpec = {
  specialty: "Enfermagem",
  title: "AGA — Enfermagem",
  subtitle: "Especialidade: Enfermagem",
  sections: [
    {
      title: "I. Identificação",
      fields: [
        { type: "text", key: "nome", label: "Nome do residente" },
        { type: "select", key: "sexo", label: "Sexo", options: ["Feminino", "Masculino"] },
        { type: "date", key: "nascimento", label: "Data de nascimento" },
        { type: "text", key: "idade", label: "Idade" },
        ...residentInfoFields(),
      ],
    },
    {
      title: "V. História pessoal atual e pregressa",
      fields: [
        { type: "note", key: "n_tabagismo", label: "Tabagismo" },
        simNao("tabagismo", "Tabagismo"),
        { type: "number", key: "tabagismo_cigarros", label: "Número de cigarros por dia" },
        { type: "number", key: "tabagismo_duracao", label: "Duração", suffix: "anos" },
        { type: "text", key: "tabagismo_carga", label: "Carga tabágica (anos-maço)" },

        { type: "note", key: "n_etilismo", label: "Etilismo" },
        simNao("etilismo", "Etilismo"),
        {
          type: "select",
          key: "etilismo_tipo",
          label: "Tipo de bebida",
          options: ["Cerveja", "Vinho", "Destilado", "Mista", "Outro"],
        },
        { type: "text", key: "etilismo_dose", label: "Dose diária" },
        { type: "number", key: "etilismo_duracao", label: "Duração", suffix: "anos" },

        { type: "note", key: "n_drogas", label: "Drogas ilícitas" },
        simNao("drogas", "Uso de drogas ilícitas"),
        { type: "text", key: "drogas_quais", label: "Quais / frequência" },

        { type: "note", key: "n_sexualidade", label: "Sexualidade" },
        simNao("sexualidade", "Sexualidade preservada"),
        simNao("libido", "Redução da libido"),
        simNao("dispareunia", "Dispareunia"),
        simNao("atividade_sexual", "Atividade sexual"),
        simNao("disfuncao_eretil", "Disfunção erétil"),
        { type: "textarea", key: "sexualidade_obs", label: "Observações", rows: 3 },
      ],
    },
    {
      title: "Sono",
      fields: [
        simNao("sono_disturbio", "Distúrbio do sono"),
        simNao("sono_interfere", "O transtorno do sono interfere com as atividades do dia"),
        simNao("sono_insonia", "O paciente tem insônia"),
        simNao("sono_hipersonia", "O paciente tem hipersonia"),
        simNao("sono_horario", "O paciente acorda muito cedo ou muito tarde"),
        simNao("sono_demora", "O paciente demora a adormecer"),
        simNao("sono_despertares", "O paciente tem despertares noturnos"),
        simNao("sono_cochilos", "Os cochilos diurnos são frequentes"),
        {
          type: "select",
          key: "sono_durante",
          label: "Durante o sono",
          options: ["1. Roncos", "2. Apneia", "3. Pernas inquietas", "Nenhum"],
          hint: "Selecione a alteração observada durante o sono",
        },
        { type: "textarea", key: "sono_obs", label: "Observações sobre o sono", rows: 3 },
      ],
    },
    {
      title: "Uso de medicamentos",
      fields: [
        {
          type: "table",
          key: "medicamentos",
          label: "Medicamentos em uso",
          addable: true,
          columns: [
            { key: "medicamento", label: "Medicamento", type: "text" },
            { key: "dose", label: "Dose", type: "text" },
            {
              key: "via",
              label: "Via",
              type: "select",
              options: ["Oral", "Sublingual", "Subcutânea", "Intramuscular", "Intravenosa", "Tópica", "Oftálmica", "Inalatória"],
            },
            {
              key: "posologia",
              label: "Posologia",
              type: "select",
              options: ["1x/dia", "12/12h", "8/8h", "6/6h", "Jejum", "SOS", "Semanal"],
            },
            { key: "horario", label: "Horário", type: "text" },
          ],
          rows: [{}, {}, {}, {}, {}],
        },
        { type: "textarea", key: "medicamentos_obs", label: "Observações / medicações SOS", rows: 3 },
      ],
    },
    {
      title: "Imunização do residente",
      fields: [
        {
          type: "table",
          key: "imunizacao",
          label: "Carteira vacinal",
          addable: true,
          columns: [
            {
              key: "vacina",
              label: "Vacina",
              type: "select",
              options: [
                "Anti-tetânica",
                "Anti-influenza",
                "Anti-pneumocócica",
                "Anti-amarílica",
                "COVID-19",
                "Hepatite B",
                "Herpes-zóster",
              ],
            },
            { key: "data", label: "Data da última dose", type: "text" },
            { key: "ano", label: "Último ano", type: "text" },
            {
              key: "situacao",
              label: "Situação",
              type: "select",
              options: ["Em dia", "Atrasada", "Não realizada", "Sem registro"],
            },
            { key: "observacoes", label: "Observações / lote", type: "text" },
          ],
          rows: [
            { vacina: "Anti-tetânica" },
            { vacina: "Anti-influenza" },
            { vacina: "Anti-pneumocócica" },
            { vacina: "Anti-amarílica" },
          ],
        },
      ],
    },
    {
      title: "Conduta de enfermagem",
      fields: [
        { type: "textarea", key: "diagnostico", label: "Diagnósticos de enfermagem", rows: 5 },
        { type: "textarea", key: "conduta", label: "Conduta / plano de cuidados", rows: 6 },
        { type: "textarea", key: "meta", label: "Meta", rows: 4 },
      ],
    },
    closingSection("Termo de Encerramento e Assinaturas"),
  ],
};
