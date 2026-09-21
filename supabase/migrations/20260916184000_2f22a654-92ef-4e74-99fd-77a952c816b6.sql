CREATE TABLE public.specialty_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialty TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialty_signatures TO authenticated;
GRANT ALL ON public.specialty_signatures TO service_role;

ALTER TABLE public.specialty_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signatures_select_members" ON public.specialty_signatures
  FOR SELECT TO authenticated USING (private.is_app_member());

CREATE POLICY "signatures_insert_own_or_master" ON public.specialty_signatures
  FOR INSERT TO authenticated WITH CHECK (
    private.has_role(auth.uid(), 'master'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.specialty = specialty_signatures.specialty)
  );

CREATE POLICY "signatures_update_own_or_master" ON public.specialty_signatures
  FOR UPDATE TO authenticated USING (
    private.has_role(auth.uid(), 'master'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.specialty = specialty_signatures.specialty)
  ) WITH CHECK (
    private.has_role(auth.uid(), 'master'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.specialty = specialty_signatures.specialty)
  );

CREATE POLICY "signatures_delete_own_or_master" ON public.specialty_signatures
  FOR DELETE TO authenticated USING (
    private.has_role(auth.uid(), 'master'::app_role)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.specialty = specialty_signatures.specialty)
  );

CREATE TRIGGER trg_specialty_signatures_updated
  BEFORE UPDATE ON public.specialty_signatures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "signature_files_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'assinaturas');

CREATE POLICY "signature_files_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assinaturas');

CREATE POLICY "signature_files_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'assinaturas') WITH CHECK (bucket_id = 'assinaturas');

CREATE POLICY "signature_files_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'assinaturas');