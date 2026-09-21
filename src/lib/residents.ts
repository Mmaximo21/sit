export type ResidentRow = {
  id: string;
  full_name: string;
  birth_date: string | null;
  sex: string | null;
  /** Data de acolhimento na ILPI (preenchida apenas por contas Master). */
  admission_date?: string | null;
  /** Diagnóstico principal (preenchido apenas por contas Master). */
  diagnosis?: string | null;
};

/** Formata uma data ISO (yyyy-mm-dd) no padrão brasileiro. */
export function formatResidentDate(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

export function ageFromBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) return "";
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const today = new Date();
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? `${age} anos` : "";
}

/** Pré-preenche identificação do formulário com os dados cadastrais do residente. */
export function residentPrefill(resident: ResidentRow): Record<string, unknown> {
  return {
    nome: resident.full_name,
    nascimento: resident.birth_date ?? "",
    idade: ageFromBirthDate(resident.birth_date),
    sexo: resident.sex ?? "",
    admissao: resident.admission_date ?? "",
    acolhimento: resident.admission_date ?? "",
    diagnostico: resident.diagnosis ?? "",
    diagnostico_principal: resident.diagnosis ?? "",
  };
}
