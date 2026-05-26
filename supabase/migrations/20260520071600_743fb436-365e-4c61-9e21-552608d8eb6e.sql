-- Remove o overload errado de reservation_group_join_paid(uuid).
-- Esse overload foi adicionado em uma migração posterior, mas:
--  1. Quebra o webhook quando o PostgREST roteia por contagem de args
--  2. Estava grantado para `authenticated` (qualquer usuário podia
--     marcar pedidos como "paid" no grupo via RPC pública)
--  3. Não insere novo membro quando o convidado paga com cupom — só
--     atualiza membros pendentes (que nunca existem nesse fluxo).
-- Mantemos apenas a versão atômica de 6 args criada na migração original,
-- que valida cupom, capacidade, lock e insere o membro corretamente.
DROP FUNCTION IF EXISTS public.reservation_group_join_paid(uuid);