/**
 * Perfil clínico fixo de cada residente (dependência, grau e diagnóstico),
 * extraído do CENSO institucional de enfermagem. Usado para pré-preencher
 * automaticamente o Censo de Enfermagem — os campos continuam editáveis.
 */
export type ResidentClinicalProfile = {
  dependencia: string;
  grau: string;
  diagnostico: string;
};

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PARCIAL = "PARCIALMENTE DEPENDENTE";
const TOTAL = "TOTALMENTE DEPENDENTE";

const RAW_PROFILES: Array<[string, string, string, string]> = [
  ["Antônio Fernandes", PARCIAL, "III", "ESQUIZOFRENIA"],
  ["Antônio Carlos Ferreira Monteiro", PARCIAL, "III", "DEMÊNCIA"],
  ["Celso dos Santos", TOTAL, "III", "ATROFIA / HAS / VULNERABILIDADE"],
  ["Cleuza Bruno da Silva", TOTAL, "III", "ALZHEIMER"],
  ["Cosme Fernando de Oliveira", TOTAL, "III", "VULNERABILIDADE"],
  ["Deuza Alves da Silva", "INTERNADA NO HMJ", "III", "HAS / AVC / IC"],
  ["Emanuel da Luz Pereira", PARCIAL, "III", "DPOC / HAS / AVE / IC"],
  ["Francisca Batista", TOTAL, "III", "AVE / DM / HAS"],
  ["Francisco Firmino Alves", TOTAL, "III", "NEUROPATIA / DM / HAS"],
  ["Jorge Mendes", PARCIAL, "III", "ALZHEIMER"],
  ["José Bezerra Melo Filho", PARCIAL, "II", "OBESIDADE / IC / HAS"],
  ["José Francisco de Paula Filho", PARCIAL, "III", "HAS / AVC"],
  ["Josoe Moreno das Neves", TOTAL, "III", "AVE ISQUÊMICO"],
  ["Luiz Carlos Batista", PARCIAL, "II", "AVEI / HAS / FA"],
  ["Manoel Constantino dos Santos", TOTAL, "III", "DEMÊNCIA / DPOC"],
  ["Marcos Roberto Camilo", TOTAL, "III", "NEUROPATA"],
  ["Maria Luiza Pereira", TOTAL, "III", "PARKINSON"],
  ["Maria Aparecida de Oliveira", PARCIAL, "III", "AVC / HAS / DM"],
  ["Maria das Graças Pereira", PARCIAL, "III", "HAS / DEF. VISUAL"],
  ["Maria de Lourdes Pereira", PARCIAL, "II", "HAS / OSTOMIZADA"],
  ["Margareth Hilário Batista", TOTAL, "III", "OBESIDADE / HAS"],
  ["Maria do Carmo Marques", PARCIAL, "II", "DM / HAS / DPOC / IC"],
  ["Mauro Amaro", TOTAL, "III", "ALZHEIMER"],
  ["Natalina Lopes", PARCIAL, "III", "DEMÊNCIA / HAS"],
  ["Sebastiana Arminda Nepomuceno", TOTAL, "III", "PARAPLEGIA"],
  ["Sérgio Raymundo de Souza", PARCIAL, "II", "HAS / AVC"],
  ["Severino França Mendes", PARCIAL, "II", "HAS"],
  ["Tereza da Silva Monteiro", PARCIAL, "III", "HAS / DM / DPOC"],
  ["Valmir Santana dos Santos", PARCIAL, "II", "ASMA / ALZHEIMER"],
  ["Ricardo Garcia", PARCIAL, "III", "VULNERABILIDADE"],
];

const PROFILES = new Map<string, ResidentClinicalProfile>(
  RAW_PROFILES.map(([name, dependencia, grau, diagnostico]) => [
    normalizeName(name),
    { dependencia, grau, diagnostico },
  ]),
);

/** Busca o perfil clínico pelo nome completo do residente (tolerante a acentos e variações). */
export function findResidentProfile(fullName: string): ResidentClinicalProfile | undefined {
  const key = normalizeName(fullName);
  const direct = PROFILES.get(key);
  if (direct) return direct;

  const tokens = key.split(" ").filter((token) => token.length > 2);
  if (!tokens.length) return undefined;

  let best: { profile: ResidentClinicalProfile; score: number } | undefined;
  for (const [candidate, profile] of PROFILES) {
    const candidateTokens = candidate.split(" ").filter((token) => token.length > 2);
    if (!candidateTokens.length) continue;
    if (candidateTokens[0] !== tokens[0]) continue;
    const shared = candidateTokens.filter((token) => tokens.includes(token)).length;
    if (shared < 2) continue;
    if (!best || shared > best.score) best = { profile, score: shared };
  }
  return best?.profile;
}
