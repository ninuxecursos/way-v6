CREATE POLICY "tmp_open_insert_participants" ON public.participants FOR INSERT TO public WITH CHECK (true);
NOTIFY pgrst, 'reload schema';