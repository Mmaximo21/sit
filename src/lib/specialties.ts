export const SPECIALTIES = [
  "Geriatria",
  "Nutrição",
  "Serviço Social",
  "Fonoaudiologia",
  "Terapia Ocupacional",
  "Fisioterapia",
  "Enfermagem",
  "Técnico de Enfermagem",
  "Psicologia",
  "Coordenação",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const USERNAME_DOMAIN = "aga-ilpi.com";

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_DOMAIN}`;
}

export function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

export const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  fechado: "Fechado",
};
