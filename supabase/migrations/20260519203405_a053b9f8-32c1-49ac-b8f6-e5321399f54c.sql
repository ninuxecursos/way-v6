
-- HERO
UPDATE public.page_sections SET data = data || jsonb_build_object(
  'title', 'GARANTIR minha vaga',
  'ctaLabel', 'GARANTIR minha vaga',
  'line1', 'SUA CASA',
  'line2a', 'NO ',
  'line2b', 'TOMORROWLAND',
  'line3', 'BRASIL 2027',
  'subtitle', 'Way Home: hospedagem completa e experiências únicas no Tomorrowland Brasil. Muitos sorrisos, memórias e conexões já passaram por aqui.'
) WHERE type = 'hero' AND page_id = (SELECT id FROM public.pages WHERE slug='home');

UPDATE public.page_sections SET data = data || jsonb_build_object(
  'eyebrow', 'Experiência',
  'titleA', 'Por que escolher a ',
  'titleB', 'Way Home?',
  'desc', 'A Way Home oferece hospedagem personalizada e serviços exclusivos para transformar sua experiência no Tomorrowland Brasil.',
  'ctaLabel', 'Reserve agora',
  'big', jsonb_build_array(
    jsonb_build_object('title','Hospedagem Confortável','text','Quartos aconchegantes ou espaço para camping com toda a infraestrutura.'),
    jsonb_build_object('title','Transfer Incluso','text','Ida e volta para o festival com pontualidade e segurança.')
  ),
  'small', jsonb_build_array(
    jsonb_build_object('title','Experiência Contínua','text','Open Bar, festas exclusivas e ambiente de comunidade.'),
    jsonb_build_object('title','Café da manhã','text','Comece seu dia com energia com nosso café da manhã estilo brunch.'),
    jsonb_build_object('title','Kits Especiais','text','Kit redução de danos, kit de higiene básico e muito mais.')
  )
) WHERE type = 'experience' AND page_id = (SELECT id FROM public.pages WHERE slug='home');

UPDATE public.page_sections SET data = data || jsonb_build_object(
  'eyebrow', 'Hospedagem',
  'titleA', 'Encontre o pacote perfeito para sua ',
  'titleB', 'experiência',
  'titleC', ' no Tomorrowland',
  'desc', 'Escolha entre nossas opções de hospedagem e viva o festival com conforto, praticidade e segurança. Cada pacote é pensado para tornar sua experiência inesquecível!',
  'packages', jsonb_build_array(
    jsonb_build_object('name','Individual','price','R$ 2.000,00','priceLabel','Valor por pessoa','altPrice','','capacity','1 pessoa','bathroom','Banheiro compartilhado','badge','Disponível','badgeTone','available','ctaUrl','/reservation',
      'includes', jsonb_build_array('Sua vaga garantida em quarto compartilhado, masculino ou feminino','Quarto compartilhado (masculino ou feminino)','Cama individual com roupa de cama','Café da manhã incluso','Acesso a todas as áreas Way Home')),
    jsonb_build_object('name','Quarto em Galera','price','R$ 1.800,00','priceLabel','Valor por pessoa','altPrice','','capacity','Até 8 pessoas por quarto','bathroom','Banheiro compartilhado','badge','Recomendado','badgeTone','recommended','ctaUrl','/reservation',
      'includes', jsonb_build_array('Economize R$ 200 por pessoa','Máximo de 8 pessoas por quarto','Você dividirá o quarto com outras pessoas','Melhor custo-benefício do Way Home','Café da manhã incluso','Ideal para quem vai com amigos')),
    jsonb_build_object('name','Casal','price','Sob consulta','priceLabel','por casal','altPrice','','capacity','2 pessoas','bathroom','Banheiro privativo','badge','Sob consulta','badgeTone','available','ctaUrl','/contato',
      'includes', jsonb_build_array('Quarto privativo para o casal','Atendimento personalizado','Valor sob consulta','Reserva via WhatsApp'))
  )
) WHERE type = 'hospedagem' AND page_id = (SELECT id FROM public.pages WHERE slug='home');

UPDATE public.page_sections SET data = data || jsonb_build_object(
  'marquee1','Localização estratégica','marquee2','fácil acesso ao evento','marquee3','Conforto, praticidade','marquee4','e a melhor experiência'
) WHERE type = 'location' AND page_id = (SELECT id FROM public.pages WHERE slug='home');

UPDATE public.page_sections SET data = data || jsonb_build_object(
  'eyebrow','Feedback','titleA','O que dizem ','titleB','sobre nós?','desc','Hóspedes que já viveram a experiência Way Home compartilham suas histórias.'
) WHERE type = 'feedback' AND page_id = (SELECT id FROM public.pages WHERE slug='home');

UPDATE public.page_sections SET data = data || jsonb_build_object(
  'title1','Garanta sua','title2','hospedagem','title3','hoje mesmo!',
  'desc1','Way Home – Transformando o Tomorrowland','desc2','em uma experiência inesquecível.','ctaLabel','Reserve agora'
) WHERE type = 'cta' AND page_id = (SELECT id FROM public.pages WHERE slug='home');

UPDATE public.page_sections SET visible = false
 WHERE type = 'camping' AND page_id = (SELECT id FROM public.pages WHERE slug='home');

-- Permite reviews legados (sem usuário/pedido)
ALTER TABLE public.event_reviews ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.event_reviews ALTER COLUMN order_id DROP NOT NULL;

INSERT INTO public.event_reviews (rating, comment, display_name, city, featured, status, approved_at, legacy) VALUES
(5,'Minha experiência foi muito boa porque me senti muito acolhida e bem recebida, os quartos são maravilhosos e chegamos já com kit redução de danos e brindes. Me senti como se estivesse com a minha família no sítio. Os hosters (Hudson e Letícia) são maravilhosos. Com certeza irei com a Way Home para o Tomorrowland e outros festivais.','Isabela Santos','Hóspede Way Home',true,'approved',now(),true),
(5,'Sem palavras para descrever a minha experiência na Way Home. Café da manhã todos os dias, traslados ao Tomorrowland, galera animada e tudo bem organizado pelos responsáveis. Teve até kit de recuperação. Foi top demais.','Alan Moreira','Hóspede Way Home',true,'approved',now(),true),
(5,'A Tomorrowland pra mim sempre foi um sonho desde mais novo, e poder realizá-la aqui onde nasci e na companhia dos melhores amigos só fez se tornar ainda mais especial. Do momento em que coloquei os pés nas acomodações da Way Home eu pude me sentir em casa. Tudo foi impecável do começo ao fim.','Wendell de Camillo','Hóspede Way Home',true,'approved',now(),true),
(5,'Eu indico super a Way Home, minha estadia por lá durante a Tomorrowland foi maravilhosa: pessoas legais, quartos amplos com banheiros individuais, equipe bem animada e organizada. Os brindes Way Home super pensados para evitar perrengues durante o evento. Nota 10!','Sarah Carvalho','Hóspede Way Home',false,'approved',now(),true),
(5,'Foi uma experiência muito confortável. O pessoal da Way Home foi muito receptivo, solícito e atencioso para que pudéssemos viver o melhor da festa.','Bruna','Hóspede Way Home',false,'approved',now(),true),
(5,'Só agradecer a Way Home por essa experiência incrível! Vocês pensaram em cada detalhe. Os brindes, kit de boas-vindas, kit redução de danos, café da manhã e lanches ótimos! Quarto com banheiro, limpo e organizado. A paciência, cuidado e comunicação foram excelentes! Obrigada.','Helena','Hóspede Way Home',false,'approved',now(),true);
