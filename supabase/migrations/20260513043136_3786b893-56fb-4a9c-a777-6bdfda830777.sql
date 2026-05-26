DROP POLICY IF EXISTS "Public can insert participants" ON public.participants;
CREATE POLICY "Public can insert participants"
  ON public.participants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
NOTIFY pgrst, 'reload schema';