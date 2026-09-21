import { enfermagemForm } from "./enfermagem";
import { fisioterapiaForm } from "./fisioterapia";
import { fonoaudiologiaForm } from "./fonoaudiologia";
import { genericForm } from "./generic";
import { geriatriaForm } from "./geriatria";
import { nutricaoForm } from "./nutricao";
import { psicologiaForm } from "./psicologia";
import { servicoSocialForm } from "./servicoSocial";
import { terapiaOcupacionalForm } from "./terapiaOcupacional";
import type { FormSpec } from "./types";

const OFFICIAL: Record<string, FormSpec> = {
  Geriatria: geriatriaForm,
  Nutrição: nutricaoForm,
  "Serviço Social": servicoSocialForm,
  Enfermagem: enfermagemForm,
  Psicologia: psicologiaForm,
  Fisioterapia: fisioterapiaForm,
  "Terapia Ocupacional": terapiaOcupacionalForm,
  Fonoaudiologia: fonoaudiologiaForm,
  "Fonoaudióloga": fonoaudiologiaForm,
};

export function getFormSpec(specialty: string): FormSpec {
  return OFFICIAL[specialty] ?? genericForm(specialty);
}

export function hasOfficialTemplate(specialty: string) {
  return Boolean(OFFICIAL[specialty]);
}

export type { FormSpec } from "./types";
