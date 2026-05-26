-- Conceder privilégios base; as políticas RLS já existentes continuam controlando linhas.
GRANT INSERT, SELECT ON public.participants TO anon, authenticated;
GRANT UPDATE, DELETE ON public.participants TO authenticated;