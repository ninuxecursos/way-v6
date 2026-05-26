-- Permite que visitantes não autenticados leiam recibos pelo número (URL pública /recibo/:numero)
DROP POLICY IF EXISTS "Public can view receipts" ON public.receipts;
CREATE POLICY "Public can view receipts"
  ON public.receipts
  FOR SELECT
  TO anon, authenticated
  USING (true);