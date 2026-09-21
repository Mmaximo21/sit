CREATE TABLE public.exam_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'recente',
  exam_date date,
  specialty text,
  notes text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_files_category_check CHECK (category IN ('antigo','recente'))
);

CREATE INDEX exam_files_resident_idx ON public.exam_files (resident_id, exam_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_files TO authenticated;
GRANT ALL ON public.exam_files TO service_role;

ALTER TABLE public.exam_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_files_select_members ON public.exam_files
  FOR SELECT TO authenticated USING (private.is_app_member());

CREATE POLICY exam_files_insert_members ON public.exam_files
  FOR INSERT TO authenticated WITH CHECK (private.is_app_member() AND uploaded_by = auth.uid());

CREATE POLICY exam_files_update_own ON public.exam_files
  FOR UPDATE TO authenticated USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY exam_files_delete_own ON public.exam_files
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

CREATE POLICY exam_files_master_all ON public.exam_files
  FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'master'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'master'::app_role));

CREATE TRIGGER exam_files_set_updated_at BEFORE UPDATE ON public.exam_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();