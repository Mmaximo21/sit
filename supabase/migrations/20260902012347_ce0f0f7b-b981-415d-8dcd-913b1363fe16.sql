CREATE TABLE public.ai_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT ALL ON public.ai_threads TO service_role;

ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_threads_own_select" ON public.ai_threads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ai_threads_own_insert" ON public.ai_threads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_threads_own_update" ON public.ai_threads FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_threads_own_delete" ON public.ai_threads FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_ai_threads_updated BEFORE UPDATE ON public.ai_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_messages_thread_created_idx ON public.ai_messages (thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_messages_own_select" ON public.ai_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE POLICY "ai_messages_own_insert" ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE POLICY "ai_messages_own_delete" ON public.ai_messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));