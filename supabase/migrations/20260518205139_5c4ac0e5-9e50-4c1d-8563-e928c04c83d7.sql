
-- 1) Coluna legacy + flexibilizar NOT NULL
ALTER TABLE public.event_reviews
  ADD COLUMN IF NOT EXISTS legacy boolean NOT NULL DEFAULT false;

ALTER TABLE public.event_reviews
  ALTER COLUMN user_id DROP NOT NULL;

-- 2) Atualizar trigger de validação para permitir entradas legacy
CREATE OR REPLACE FUNCTION public.event_reviews_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _order public.orders;
begin
  -- Avaliações legacy (depoimentos importados) pulam validações de pedido/usuário
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
  if new.rating < 1 or new.rating > 5 then
    raise exception 'invalid_rating';
  end if;
  return new;
end;
$function$;

-- 3) Importar os 6 depoimentos históricos (idempotente via WHERE NOT EXISTS por display_name+legacy)
INSERT INTO public.event_reviews
  (legacy, status, rating, featured, display_name, city, comment, approved_at, created_at)
SELECT * FROM (VALUES
  (true, 'approved', 5, true,  'Isabela Santos',   NULL, 'Minha experiência foi muito boa porque me senti muito acolhida e bem recebida, os quartos são maravilhosos e chegamos já com kit redução de danos e brindes. Me senti como se estivesse com a minha família no sítio. Os hosters (Hudson e Letícia) são maravilhosos. Com certeza irei com a Way Home para o Tomorrowland e outros festivais.', now(), now()),
  (true, 'approved', 5, true,  'Alan Moreira',     NULL, 'Sem palavras para descrever a minha experiência na Way Home. Café da manhã todos os dias, traslados ao Tomorrowland, galera animada e tudo bem organizado pelos responsáveis. Teve até kit de recuperação. Foi top demais.', now(), now()),
  (true, 'approved', 5, true,  'Wendell de Camillo', NULL, 'A Tomorrowland pra mim sempre foi um sonho desde mais novo, e poder realizá-la aqui onde nasci e na companhia dos melhores amigos só fez se tornar ainda mais especial. Do momento em que coloquei os pés nas acomodações da Way Home eu pude me sentir em casa. Tudo foi impecável do começo ao fim.', now(), now()),
  (true, 'approved', 5, false, 'Bruna',            NULL, 'Foi uma experiência muito confortável. O pessoal da Way Home foi muito receptivo, solícito e atencioso para que pudéssemos viver o melhor da festa.', now(), now()),
  (true, 'approved', 5, false, 'Sarah Carvalho',   NULL, 'Eu indico super a Way Home, minha estadia por lá durante a Tomorrowland foi maravilhosa: pessoas legais, quartos amplos com banheiros individuais, equipe bem animada e organizada. Os brindes Way Home super pensados para evitar perrengues durante o evento. Nota 10!', now(), now()),
  (true, 'approved', 5, false, 'Helena',           NULL, 'Só agradecer a Way Home por essa experiência incrível! Vocês pensaram em cada detalhe. Os brindes, kit de boas-vindas, kit redução de danos, café da manhã e lanches ótimos! Quarto com banheiro, limpo e organizado. A paciência, cuidado e comunicação foram excelentes! Obrigada.', now(), now())
) AS v(legacy, status, rating, featured, display_name, city, comment, approved_at, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM public.event_reviews er
  WHERE er.legacy = true AND er.display_name = v.display_name
);
