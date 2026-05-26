-- Backfill: vincular pedidos antigos a contas existentes pelo e-mail
UPDATE public.orders o
SET user_id = u.id
FROM auth.users u
WHERE o.user_id IS NULL
  AND o.customer_email IS NOT NULL
  AND lower(o.customer_email) = lower(u.email);

-- Trigger: ao inserir pedido sem user_id, tentar achar pela tabela auth.users
CREATE OR REPLACE FUNCTION public.orders_link_user_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.customer_email IS NOT NULL THEN
    SELECT id INTO NEW.user_id
    FROM auth.users
    WHERE lower(email) = lower(NEW.customer_email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_link_user_by_email ON public.orders;
CREATE TRIGGER trg_orders_link_user_by_email
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_link_user_by_email();