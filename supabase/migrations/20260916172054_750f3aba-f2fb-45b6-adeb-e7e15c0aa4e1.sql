ALTER TABLE public.work_shift_members
  ADD COLUMN IF NOT EXISTS sector text NOT NULL DEFAULT 'TRABALHO';

ALTER TABLE public.work_shift_members
  DROP CONSTRAINT IF EXISTS work_shift_members_sector_check;
ALTER TABLE public.work_shift_members
  ADD CONSTRAINT work_shift_members_sector_check CHECK (sector IN ('TRABALHO','ENFERMAGEM'));

CREATE TABLE IF NOT EXISTS public.work_schedule_sectors (
  sector text PRIMARY KEY CHECK (sector IN ('TRABALHO','ENFERMAGEM')),
  anchor_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedule_sectors TO authenticated;
GRANT ALL ON public.work_schedule_sectors TO service_role;

ALTER TABLE public.work_schedule_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escala sector settings read" ON public.work_schedule_sectors
  FOR SELECT TO authenticated USING (private.can_work_schedule(auth.uid()));
CREATE POLICY "escala sector settings write" ON public.work_schedule_sectors
  FOR ALL TO authenticated
  USING (private.can_work_schedule(auth.uid()))
  WITH CHECK (private.can_work_schedule(auth.uid()));

CREATE TRIGGER trg_work_schedule_sectors_updated
  BEFORE UPDATE ON public.work_schedule_sectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.work_schedule_sectors (sector, anchor_date, notes)
SELECT 'TRABALHO', anchor_date, notes FROM public.work_schedule_settings LIMIT 1
ON CONFLICT (sector) DO NOTHING;

CREATE OR REPLACE FUNCTION private.can_work_schedule(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  SELECT private.has_role(_user_id, 'master'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_tab_permissions
        WHERE user_id = _user_id AND tab IN ('escala','escala_enfermagem') AND allowed
      )
$function$;