CREATE TABLE public.work_shift_medical_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.work_shift_members(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_shift_medical_leaves_dates_check CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shift_medical_leaves TO authenticated;
GRANT ALL ON public.work_shift_medical_leaves TO service_role;

ALTER TABLE public.work_shift_medical_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_shift_medical_leaves_select"
ON public.work_shift_medical_leaves
FOR SELECT
TO authenticated
USING (private.can_work_schedule(auth.uid()));

CREATE POLICY "work_shift_medical_leaves_insert"
ON public.work_shift_medical_leaves
FOR INSERT
TO authenticated
WITH CHECK (private.can_work_schedule(auth.uid()));

CREATE POLICY "work_shift_medical_leaves_update"
ON public.work_shift_medical_leaves
FOR UPDATE
TO authenticated
USING (private.can_work_schedule(auth.uid()))
WITH CHECK (private.can_work_schedule(auth.uid()));

CREATE POLICY "work_shift_medical_leaves_delete"
ON public.work_shift_medical_leaves
FOR DELETE
TO authenticated
USING (private.can_work_schedule(auth.uid()));

CREATE INDEX work_shift_medical_leaves_member_dates_idx
ON public.work_shift_medical_leaves(member_id, start_date, end_date);

CREATE TRIGGER set_work_shift_medical_leaves_updated_at
BEFORE UPDATE ON public.work_shift_medical_leaves
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();