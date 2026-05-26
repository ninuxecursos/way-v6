-- 1) Adicionar campo data da experiência na avaliação
ALTER TABLE public.event_reviews
  ADD COLUMN IF NOT EXISTS experience_date date;

-- 2) Endurecer trigger de validação: exigir pedido pago E com check-in realizado
CREATE OR REPLACE FUNCTION public.event_reviews_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _order public.orders;
begin
  if new.legacy = true then
    if new.rating < 1 or new.rating > 5 then
      raise exception 'invalid_rating';
    end if;
    return new;
  end if;

  if new.order_id is null then
    raise exception 'order_required';
  end if;
  select * into _order from public.orders where id = new.order_id;
  if _order.id is null then
    raise exception 'order_not_found';
  end if;
  if _order.user_id is distinct from new.user_id then
    raise exception 'order_not_owned';
  end if;
  if _order.status <> 'paid' then
    raise exception 'order_not_paid';
  end if;
  if _order.checked_in_at is null then
    raise exception 'checkin_required';
  end if;
  if new.rating < 1 or new.rating > 5 then
    raise exception 'invalid_rating';
  end if;
  return new;
end;
$function$;

-- 3) Notificar o cliente após check-in para deixar uma avaliação
CREATE OR REPLACE FUNCTION public.orders_notify_review_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.checked_in_at IS NOT NULL
     AND (OLD.checked_in_at IS NULL OR OLD.checked_in_at IS DISTINCT FROM NEW.checked_in_at)
     AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.user_id,
      'review_request',
      'Como foi sua experiência?',
      'Seu check-in foi confirmado. Avalie sua estadia e ajude outros festivaleiros.',
      '/avaliar/' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_orders_notify_review_request ON public.orders;
CREATE TRIGGER trg_orders_notify_review_request
AFTER UPDATE OF checked_in_at ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_notify_review_request();