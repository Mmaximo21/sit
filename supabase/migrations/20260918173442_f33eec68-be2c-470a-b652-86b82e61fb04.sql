CREATE TABLE public.resident_exits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  resident_name TEXT NOT NULL,
  exit_type TEXT NOT NULL CHECK (exit_type IN ('Desacolhimento', 'Óbito')),
  exit_date DATE NOT NULL,
  destination TEXT,
  cause TEXT,
  report TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_exits TO authenticated;
GRANT ALL ON public.resident_exits TO service_role;

ALTER TABLE public.resident_exits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resident_exits_select_members" ON public.resident_exits
  FOR SELECT TO authenticated USING (private.is_app_member());

CREATE POLICY "resident_exits_insert_members" ON public.resident_exits
  FOR INSERT TO authenticated WITH CHECK (private.is_app_member() AND author_id = auth.uid());

CREATE POLICY "resident_exits_update_own_or_master" ON public.resident_exits
  FOR UPDATE TO authenticated USING (
    private.has_role(auth.uid(), 'master'::app_role) OR author_id = auth.uid()
  ) WITH CHECK (
    private.has_role(auth.uid(), 'master'::app_role) OR author_id = auth.uid()
  );

CREATE POLICY "resident_exits_delete_master" ON public.resident_exits
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'master'::app_role));

CREATE TRIGGER trg_resident_exits_updated
  BEFORE UPDATE ON public.resident_exits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "exit_files_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'saidas');

CREATE POLICY "exit_files_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'saidas');

CREATE POLICY "exit_files_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'saidas') WITH CHECK (bucket_id = 'saidas');

CREATE POLICY "exit_files_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'saidas');