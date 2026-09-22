import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SPECIALTIES } from "@/lib/specialties";
import { COUNCIL_OPTIONS } from "@/lib/forms/closing";

export type SpecialtyRow = {
  id: string;
  name: string;
  default_council: string | null;
  sort_order: number;
  active: boolean;
};

export type CouncilRow = {
  id: string;
  acronym: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type ClosingTermRow = {
  id: string;
  specialty: string | null;
  title: string;
  description: string;
  active: boolean;
};

export function councilLabel(c: Pick<CouncilRow, "acronym" | "name">) {
  return c.name ? `${c.acronym} — ${c.name}` : c.acronym;
}

/** Especialidades cadastradas (com fallback para a lista embutida). */
export function useSpecialties(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  return useQuery({
    queryKey: ["specialties", includeInactive],
    staleTime: 60_000,
    queryFn: async () => {
      const query = supabase
        .from("specialties")
        .select("id,name,default_council,sort_order,active")
        .order("sort_order")
        .order("name");
      const { data, error } = includeInactive ? await query : await query.eq("active", true);
      if (error) throw error;
      return (data ?? []) as SpecialtyRow[];
    },
  });
}

export function useSpecialtyNames() {
  const { data } = useSpecialties();
  const names = (data ?? []).map((s) => s.name);
  return names.length ? names : [...SPECIALTIES];
}

export function useCouncils(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive ?? false;
  return useQuery({
    queryKey: ["councils", includeInactive],
    staleTime: 60_000,
    queryFn: async () => {
      const query = supabase
        .from("councils")
        .select("id,acronym,name,sort_order,active")
        .order("sort_order")
        .order("acronym");
      const { data, error } = includeInactive ? await query : await query.eq("active", true);
      if (error) throw error;
      return (data ?? []) as CouncilRow[];
    },
  });
}

export function useCouncilOptions() {
  const { data } = useCouncils();
  const labels = (data ?? []).map(councilLabel);
  return labels.length ? labels : COUNCIL_OPTIONS;
}

export function useClosingTerms() {
  return useQuery({
    queryKey: ["closing-terms"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("closing_terms")
        .select("id,specialty,title,description,active")
        .order("specialty", { nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as ClosingTermRow[];
    },
  });
}

/** Termo aplicável a uma especialidade (específico, senão o geral). */
export function pickClosingTerm(terms: ClosingTermRow[] | undefined, specialty: string) {
  const active = (terms ?? []).filter((t) => t.active);
  return (
    active.find((t) => t.specialty === specialty) ??
    active.find((t) => t.specialty === null) ??
    null
  );
}
