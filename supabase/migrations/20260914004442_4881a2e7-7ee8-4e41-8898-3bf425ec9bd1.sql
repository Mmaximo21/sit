CREATE OR REPLACE FUNCTION private.can_work_schedule(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(_user_id, 'master'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_tab_permissions
        WHERE user_id = _user_id AND tab = 'escala' AND allowed
      )
$$;

REVOKE ALL ON FUNCTION private.can_work_schedule(uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.can_work_schedule(uuid) TO authenticated, service_role;

CREATE TABLE public.work_shift_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  job_title text,
  shift text NOT NULL CHECK (shift IN ('SD1','SD2','SD3','SD4')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shift_members TO authenticated;
GRANT ALL ON public.work_shift_members TO service_role;
ALTER TABLE public.work_shift_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escala members read" ON public.work_shift_members FOR SELECT TO authenticated USING (private.can_work_schedule(auth.uid()));
CREATE POLICY "escala members write" ON public.work_shift_members FOR ALL TO authenticated USING (private.can_work_schedule(auth.uid())) WITH CHECK (private.can_work_schedule(auth.uid()));

CREATE TABLE public.work_schedule_settings (
  id boolean NOT NULL DEFAULT true PRIMARY KEY CHECK (id),
  anchor_date date NOT NULL DEFAULT current_date,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedule_settings TO authenticated;
GRANT ALL ON public.work_schedule_settings TO service_role;
ALTER TABLE public.work_schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escala settings read" ON public.work_schedule_settings FOR SELECT TO authenticated USING (private.can_work_schedule(auth.uid()));
CREATE POLICY "escala settings write" ON public.work_schedule_settings FOR ALL TO authenticated USING (private.can_work_schedule(auth.uid())) WITH CHECK (private.can_work_schedule(auth.uid()));

CREATE TABLE public.work_shift_rotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.work_shift_members(id) ON DELETE CASCADE,
  to_shift text NOT NULL CHECK (to_shift IN ('SD1','SD2','SD3','SD4')),
  effective_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX work_shift_rotations_member_idx ON public.work_shift_rotations (member_id, effective_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shift_rotations TO authenticated;
GRANT ALL ON public.work_shift_rotations TO service_role;
ALTER TABLE public.work_shift_rotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escala rotations read" ON public.work_shift_rotations FOR SELECT TO authenticated USING (private.can_work_schedule(auth.uid()));
CREATE POLICY "escala rotations write" ON public.work_shift_rotations FOR ALL TO authenticated USING (private.can_work_schedule(auth.uid())) WITH CHECK (private.can_work_schedule(auth.uid()));

CREATE TRIGGER work_shift_members_updated_at BEFORE UPDATE ON public.work_shift_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.work_schedule_settings (id, anchor_date) VALUES (true, current_date) ON CONFLICT (id) DO NOTHING;