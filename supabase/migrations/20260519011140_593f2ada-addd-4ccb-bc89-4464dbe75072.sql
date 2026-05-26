
-- 1) Drop policy permissiva que vazava contatos entre membros
DROP POLICY IF EXISTS "Members can view group members" ON public.reservation_group_members;
DROP POLICY IF EXISTS "members read same group" ON public.reservation_group_members;
DROP POLICY IF EXISTS "Group members read" ON public.reservation_group_members;

-- 2) Policies novas: somente staff (admin/financeiro) e o próprio usuário leem a tabela base
CREATE POLICY "Staff read group members"
  ON public.reservation_group_members
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "User reads own membership"
  ON public.reservation_group_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3) View pública para que membros vejam os outros membros sem contato sensível.
--    Mostra primeiro nome (até o primeiro espaço) + role + status de pagamento + data.
CREATE OR REPLACE VIEW public.reservation_group_members_public
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.group_id,
  split_part(m.full_name, ' ', 1) AS first_name,
  m.role,
  m.payment_status,
  m.joined_at,
  m.room_id,
  (m.user_id = auth.uid()) AS is_me
FROM public.reservation_group_members m
WHERE EXISTS (
  SELECT 1
  FROM public.reservation_group_members me
  WHERE me.group_id = m.group_id
    AND me.user_id = auth.uid()
)
OR public.is_admin(auth.uid())
OR public.has_role(auth.uid(), 'financeiro'::app_role);

GRANT SELECT ON public.reservation_group_members_public TO authenticated;

-- 4) Índice para perf da view e checagens
CREATE INDEX IF NOT EXISTS idx_rgm_group_id ON public.reservation_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_rgm_user_id ON public.reservation_group_members (user_id);
