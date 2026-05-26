
-- 1) fiscal_company: remove leitura pública
DROP POLICY IF EXISTS "Public reads fiscal company" ON public.fiscal_company;

-- 2) accommodation_rooms: substitui SELECT público amplo por leitura limitada
DROP POLICY IF EXISTS "Public reads rooms" ON public.accommodation_rooms;
CREATE POLICY "Public reads active rooms" ON public.accommodation_rooms
  FOR SELECT TO anon, authenticated
  USING (active = true AND status NOT IN ('blocked','maintenance'));

-- 3) coupons: somente autenticados podem ler cupons ativos
DROP POLICY IF EXISTS "Public reads active coupons" ON public.coupons;
CREATE POLICY "Authenticated reads active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (active = true AND (ends_at IS NULL OR ends_at > now()));
