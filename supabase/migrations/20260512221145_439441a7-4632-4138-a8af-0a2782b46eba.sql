-- Tabela page_sections ganha coluna data_i18n com traduções por idioma.
ALTER TABLE public.page_sections
  ADD COLUMN IF NOT EXISTS data_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: copia data atual em pt-BR.
UPDATE public.page_sections
   SET data_i18n = jsonb_build_object('pt-BR', data)
 WHERE data_i18n = '{}'::jsonb OR data_i18n IS NULL;

-- Comentários do blog: rastrear idioma de origem.
ALTER TABLE public.blog_comments
  ADD COLUMN IF NOT EXISTS original_locale text NOT NULL DEFAULT 'pt-BR';