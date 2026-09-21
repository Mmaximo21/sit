CREATE TABLE public.work_shift_vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.work_shift_members(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  cover_name text NOT NULL,
  cover_job_title text,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shift_vacations TO authenticated;
GRANT ALL ON public.work_shift_vacations TO service_role;

ALTER TABLE public.work_shift_vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escalas: ver ferias" ON public.work_shift_vacations
  FOR SELECT TO authenticated USING (private.can_work_schedule(auth.uid()));
CREATE POLICY "Escalas: gerenciar ferias" ON public.work_shift_vacations
  FOR ALL TO authenticated
  USING (private.can_work_schedule(auth.uid()))
  WITH CHECK (private.can_work_schedule(auth.uid()));

CREATE TRIGGER trg_work_shift_vacations_updated
  BEFORE UPDATE ON public.work_shift_vacations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX work_shift_vacations_member_idx ON public.work_shift_vacations (member_id, start_date);