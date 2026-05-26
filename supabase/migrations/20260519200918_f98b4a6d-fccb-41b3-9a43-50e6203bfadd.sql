ALTER TABLE public.page_sections
ADD COLUMN IF NOT EXISTS data_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;