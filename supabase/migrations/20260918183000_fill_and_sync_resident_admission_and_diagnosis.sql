-- Migração: Preenchimento e sincronização automática de data de admissão/acolhimento e diagnóstico
-- em todas as avaliações e PIAs existentes e futuros.

-- 1. Garante que as colunas existam nas tabelas
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS diagnosis TEXT;

ALTER TABLE public.care_plans
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS diagnosis TEXT;

-- 2. Vincula resident_id caso esteja nulo pelo nome completo
UPDATE public.assessments a
SET resident_id = r.id
FROM public.residents r
WHERE a.resident_id IS NULL
  AND LOWER(TRIM(a.resident_name)) = LOWER(TRIM(r.full_name));

UPDATE public.care_plans cp
SET resident_id = r.id
FROM public.residents r
WHERE cp.resident_id IS NULL
  AND LOWER(TRIM(cp.resident_name)) = LOWER(TRIM(r.full_name));

-- 3. Atualiza colunas nas avaliações existentes a partir dos dados do residente
UPDATE public.assessments a
SET
  admission_date = COALESCE(a.admission_date, r.admission_date),
  diagnosis = COALESCE(a.diagnosis, r.diagnosis)
FROM public.residents r
WHERE a.resident_id = r.id
  AND (a.admission_date IS NULL OR a.diagnosis IS NULL)
  AND (r.admission_date IS NOT NULL OR r.diagnosis IS NOT NULL);

-- 4. Atualiza colunas nos PIAs existentes a partir dos dados do residente
UPDATE public.care_plans cp
SET
  admission_date = COALESCE(cp.admission_date, r.admission_date),
  diagnosis = COALESCE(cp.diagnosis, r.diagnosis)
FROM public.residents r
WHERE cp.resident_id = r.id
  AND (cp.admission_date IS NULL OR cp.diagnosis IS NULL)
  AND (r.admission_date IS NOT NULL OR r.diagnosis IS NOT NULL);

-- 5. Atualiza o JSONB `data` das avaliações existentes (acolhimento e diagnóstico)
UPDATE public.assessments a
SET data = (
  CASE
    WHEN r.admission_date IS NOT NULL AND r.diagnosis IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(a.data, '{}'::jsonb),
              '{acolhimento}',
              CASE WHEN (a.data->>'acolhimento' IS NULL OR a.data->>'acolhimento' = '') THEN to_jsonb(r.admission_date::text) ELSE a.data->'acolhimento' END,
              true
            ),
            '{admissao}',
            CASE WHEN (a.data->>'admissao' IS NULL OR a.data->>'admissao' = '') THEN to_jsonb(r.admission_date::text) ELSE a.data->'admissao' END,
            true
          ),
          '{diagnostico_principal}',
          CASE WHEN (a.data->>'diagnostico_principal' IS NULL OR a.data->>'diagnostico_principal' = '') THEN to_jsonb(r.diagnosis) ELSE a.data->'diagnostico_principal' END,
          true
        ),
        '{diagnostico}',
        CASE WHEN (a.data->>'diagnostico' IS NULL OR a.data->>'diagnostico' = '') THEN to_jsonb(r.diagnosis) ELSE a.data->'diagnostico' END,
        true
      )
    WHEN r.admission_date IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          COALESCE(a.data, '{}'::jsonb),
          '{acolhimento}',
          CASE WHEN (a.data->>'acolhimento' IS NULL OR a.data->>'acolhimento' = '') THEN to_jsonb(r.admission_date::text) ELSE a.data->'acolhimento' END,
          true
        ),
        '{admissao}',
        CASE WHEN (a.data->>'admissao' IS NULL OR a.data->>'admissao' = '') THEN to_jsonb(r.admission_date::text) ELSE a.data->'admissao' END,
        true
      )
    WHEN r.diagnosis IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          COALESCE(a.data, '{}'::jsonb),
          '{diagnostico_principal}',
          CASE WHEN (a.data->>'diagnostico_principal' IS NULL OR a.data->>'diagnostico_principal' = '') THEN to_jsonb(r.diagnosis) ELSE a.data->'diagnostico_principal' END,
          true
        ),
        '{diagnostico}',
        CASE WHEN (a.data->>'diagnostico' IS NULL OR a.data->>'diagnostico' = '') THEN to_jsonb(r.diagnosis) ELSE a.data->'diagnostico' END,
        true
      )
    ELSE COALESCE(a.data, '{}'::jsonb)
  END
)
FROM public.residents r
WHERE a.resident_id = r.id
  AND (r.admission_date IS NOT NULL OR r.diagnosis IS NOT NULL);

-- 6. Atualiza o JSONB `data` dos PIAs existentes (acolhimento e diagnóstico)
UPDATE public.care_plans cp
SET data = (
  CASE
    WHEN r.admission_date IS NOT NULL AND r.diagnosis IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(cp.data, '{}'::jsonb),
              '{acolhimento}',
              CASE WHEN (cp.data->>'acolhimento' IS NULL OR cp.data->>'acolhimento' = '') THEN to_jsonb(r.admission_date::text) ELSE cp.data->'acolhimento' END,
              true
            ),
            '{admissao}',
            CASE WHEN (cp.data->>'admissao' IS NULL OR cp.data->>'admissao' = '') THEN to_jsonb(r.admission_date::text) ELSE cp.data->'admissao' END,
            true
          ),
          '{diagnostico_principal}',
          CASE WHEN (cp.data->>'diagnostico_principal' IS NULL OR cp.data->>'diagnostico_principal' = '') THEN to_jsonb(r.diagnosis) ELSE cp.data->'diagnostico_principal' END,
          true
        ),
        '{diagnostico}',
        CASE WHEN (cp.data->>'diagnostico' IS NULL OR cp.data->>'diagnostico' = '') THEN to_jsonb(r.diagnosis) ELSE cp.data->'diagnostico' END,
        true
      )
    WHEN r.admission_date IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          COALESCE(cp.data, '{}'::jsonb),
          '{acolhimento}',
          CASE WHEN (cp.data->>'acolhimento' IS NULL OR cp.data->>'acolhimento' = '') THEN to_jsonb(r.admission_date::text) ELSE cp.data->'acolhimento' END,
          true
        ),
        '{admissao}',
        CASE WHEN (cp.data->>'admissao' IS NULL OR cp.data->>'admissao' = '') THEN to_jsonb(r.admission_date::text) ELSE cp.data->'admissao' END,
        true
      )
    WHEN r.diagnosis IS NOT NULL THEN
      jsonb_set(
        jsonb_set(
          COALESCE(cp.data, '{}'::jsonb),
          '{diagnostico_principal}',
          CASE WHEN (cp.data->>'diagnostico_principal' IS NULL OR cp.data->>'diagnostico_principal' = '') THEN to_jsonb(r.diagnosis) ELSE cp.data->'diagnostico_principal' END,
          true
        ),
        '{diagnostico}',
        CASE WHEN (cp.data->>'diagnostico' IS NULL OR cp.data->>'diagnostico' = '') THEN to_jsonb(r.diagnosis) ELSE cp.data->'diagnostico' END,
        true
      )
    ELSE COALESCE(cp.data, '{}'::jsonb)
  END
)
FROM public.residents r
WHERE cp.resident_id = r.id
  AND (r.admission_date IS NOT NULL OR r.diagnosis IS NOT NULL);

-- 7. Função de gatilho para preencher automaticamente em novas avaliações
CREATE OR REPLACE FUNCTION public.fill_assessment_resident_info()
RETURNS TRIGGER AS $$
DECLARE
  v_admission_date DATE;
  v_diagnosis TEXT;
BEGIN
  IF NEW.resident_id IS NOT NULL THEN
    SELECT admission_date, diagnosis
      INTO v_admission_date, v_diagnosis
      FROM public.residents
     WHERE id = NEW.resident_id;

    IF NEW.admission_date IS NULL THEN
      NEW.admission_date := v_admission_date;
    END IF;

    IF NEW.diagnosis IS NULL THEN
      NEW.diagnosis := v_diagnosis;
    END IF;

    IF NEW.data IS NULL THEN
      NEW.data := '{}'::jsonb;
    END IF;

    IF (NEW.data->>'acolhimento' IS NULL OR NEW.data->>'acolhimento' = '') AND v_admission_date IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{acolhimento}', to_jsonb(v_admission_date::text), true);
    END IF;

    IF (NEW.data->>'admissao' IS NULL OR NEW.data->>'admissao' = '') AND v_admission_date IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{admissao}', to_jsonb(v_admission_date::text), true);
    END IF;

    IF (NEW.data->>'diagnostico_principal' IS NULL OR NEW.data->>'diagnostico_principal' = '') AND v_diagnosis IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{diagnostico_principal}', to_jsonb(v_diagnosis), true);
    END IF;

    IF (NEW.data->>'diagnostico' IS NULL OR NEW.data->>'diagnostico' = '') AND v_diagnosis IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{diagnostico}', to_jsonb(v_diagnosis), true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Função de gatilho para preencher automaticamente em novos PIAs
CREATE OR REPLACE FUNCTION public.fill_care_plan_resident_info()
RETURNS TRIGGER AS $$
DECLARE
  v_admission_date DATE;
  v_diagnosis TEXT;
BEGIN
  IF NEW.resident_id IS NOT NULL THEN
    SELECT admission_date, diagnosis
      INTO v_admission_date, v_diagnosis
      FROM public.residents
     WHERE id = NEW.resident_id;

    IF NEW.admission_date IS NULL THEN
      NEW.admission_date := v_admission_date;
    END IF;

    IF NEW.diagnosis IS NULL THEN
      NEW.diagnosis := v_diagnosis;
    END IF;

    IF NEW.data IS NULL THEN
      NEW.data := '{}'::jsonb;
    END IF;

    IF (NEW.data->>'acolhimento' IS NULL OR NEW.data->>'acolhimento' = '') AND v_admission_date IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{acolhimento}', to_jsonb(v_admission_date::text), true);
    END IF;

    IF (NEW.data->>'admissao' IS NULL OR NEW.data->>'admissao' = '') AND v_admission_date IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{admissao}', to_jsonb(v_admission_date::text), true);
    END IF;

    IF (NEW.data->>'diagnostico_principal' IS NULL OR NEW.data->>'diagnostico_principal' = '') AND v_diagnosis IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{diagnostico_principal}', to_jsonb(v_diagnosis), true);
    END IF;

    IF (NEW.data->>'diagnostico' IS NULL OR NEW.data->>'diagnostico' = '') AND v_diagnosis IS NOT NULL THEN
      NEW.data := jsonb_set(NEW.data, '{diagnostico}', to_jsonb(v_diagnosis), true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para sincronizar alterações feitas no cadastro de residentes para todas as avaliações e PIAs
CREATE OR REPLACE FUNCTION public.sync_resident_info_to_assessments_and_care_plans()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza avaliações vinculadas ao residente
  UPDATE public.assessments
  SET
    admission_date = COALESCE(NEW.admission_date, admission_date),
    diagnosis = COALESCE(NEW.diagnosis, diagnosis),
    data = (
      CASE
        WHEN NEW.admission_date IS NOT NULL AND NEW.diagnosis IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(data, '{}'::jsonb),
                  '{acolhimento}', to_jsonb(NEW.admission_date::text), true
                ),
                '{admissao}', to_jsonb(NEW.admission_date::text), true
              ),
              '{diagnostico_principal}', to_jsonb(NEW.diagnosis), true
            ),
            '{diagnostico}', to_jsonb(NEW.diagnosis), true
          )
        WHEN NEW.admission_date IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{acolhimento}', to_jsonb(NEW.admission_date::text), true
            ),
            '{admissao}', to_jsonb(NEW.admission_date::text), true
          )
        WHEN NEW.diagnosis IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{diagnostico_principal}', to_jsonb(NEW.diagnosis), true
            ),
            '{diagnostico}', to_jsonb(NEW.diagnosis), true
          )
        ELSE COALESCE(data, '{}'::jsonb)
      END
    )
  WHERE resident_id = NEW.id;

  -- Atualiza planos de atendimento (PIAs) vinculados ao residente
  UPDATE public.care_plans
  SET
    admission_date = COALESCE(NEW.admission_date, admission_date),
    diagnosis = COALESCE(NEW.diagnosis, diagnosis),
    data = (
      CASE
        WHEN NEW.admission_date IS NOT NULL AND NEW.diagnosis IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(data, '{}'::jsonb),
                  '{acolhimento}', to_jsonb(NEW.admission_date::text), true
                ),
                '{admissao}', to_jsonb(NEW.admission_date::text), true
              ),
              '{diagnostico_principal}', to_jsonb(NEW.diagnosis), true
            ),
            '{diagnostico}', to_jsonb(NEW.diagnosis), true
          )
        WHEN NEW.admission_date IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{acolhimento}', to_jsonb(NEW.admission_date::text), true
            ),
            '{admissao}', to_jsonb(NEW.admission_date::text), true
          )
        WHEN NEW.diagnosis IS NOT NULL THEN
          jsonb_set(
            jsonb_set(
              COALESCE(data, '{}'::jsonb),
              '{diagnostico_principal}', to_jsonb(NEW.diagnosis), true
            ),
            '{diagnostico}', to_jsonb(NEW.diagnosis), true
          )
        ELSE COALESCE(data, '{}'::jsonb)
      END
    )
  WHERE resident_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Associa os gatilhos às tabelas
DROP TRIGGER IF EXISTS trg_fill_assessment_resident_info ON public.assessments;
CREATE TRIGGER trg_fill_assessment_resident_info
  BEFORE INSERT OR UPDATE OF resident_id ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_assessment_resident_info();

DROP TRIGGER IF EXISTS trg_fill_care_plan_resident_info ON public.care_plans;
CREATE TRIGGER trg_fill_care_plan_resident_info
  BEFORE INSERT OR UPDATE OF resident_id ON public.care_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_care_plan_resident_info();

DROP TRIGGER IF EXISTS trg_sync_resident_info ON public.residents;
CREATE TRIGGER trg_sync_resident_info
  AFTER UPDATE OF admission_date, diagnosis ON public.residents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_resident_info_to_assessments_and_care_plans();
