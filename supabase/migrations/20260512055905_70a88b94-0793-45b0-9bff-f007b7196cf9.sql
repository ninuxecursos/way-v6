
-- 1) branding global
INSERT INTO public.site_settings (key, value)
VALUES (
  'branding',
  jsonb_build_object(
    'siteName', 'Way Home',
    'siteShortName', 'Way Home',
    'logoLightUrl', '',
    'logoDarkUrl', '',
    'logoFooterUrl', '',
    'faviconUrl', '/favicon.ico',
    'ogImageUrl', '/og-image.png',
    'primaryColor', '',
    'accentColor', ''
  )
)
ON CONFLICT (key) DO NOTHING;

-- 2) garante a page home publicada
INSERT INTO public.pages (slug, title, description, status)
VALUES ('home', 'Home', 'Página inicial Way Home', 'published')
ON CONFLICT (slug) DO NOTHING;

-- 3) seed das seções da home (idempotente: só insere se a page não tem seções)
DO $$
DECLARE
  _page_id uuid;
  _has_sections boolean;
BEGIN
  SELECT id INTO _page_id FROM public.pages WHERE slug = 'home' LIMIT 1;
  IF _page_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS (SELECT 1 FROM public.page_sections WHERE page_id = _page_id) INTO _has_sections;
  IF _has_sections THEN RETURN; END IF;

  INSERT INTO public.page_sections (page_id, type, position, data) VALUES
  (_page_id, 'hero', 0, jsonb_build_object(
    'title', 'GARANTA SEU PACOTE AGORA',
    'subtitle', 'Way Home: hospedagem completa e experiências únicas no Tomorrowland Brasil.',
    'ctaLabel', 'GARANTA SEU PACOTE AGORA',
    'ctaUrl', 'https://wa.link/q7bfzu',
    'images', '{}'::jsonb
  )),
  (_page_id, 'experience', 1, jsonb_build_object(
    'eyebrow', 'Experiência',
    'title', 'Por que escolher a Way Home?',
    'description', 'A Way Home oferece hospedagem personalizada e serviços exclusivos para transformar sua experiência no Tomorrowland Brasil.',
    'big', jsonb_build_array(
      jsonb_build_object('title','Hospedagem Confortável','text','Quartos aconchegantes ou espaço para camping com toda a infraestrutura.'),
      jsonb_build_object('title','Transfer Incluso','text','Ida e volta para o festival com pontualidade e segurança.')
    ),
    'small', jsonb_build_array(
      jsonb_build_object('title','Experiência Contínua','text','Open Bar, festas exclusivas e ambiente de comunidade.'),
      jsonb_build_object('title','Café da manhã','text','Comece seu dia com energia com nosso café da manhã estilo brunch.'),
      jsonb_build_object('title','Kits Especiais','text','Kit redução de danos, kit de higiene básico e muito mais.')
    ),
    'images', '{}'::jsonb
  )),
  (_page_id, 'hospedagem', 2, jsonb_build_object(
    'eyebrow', 'Hospedagem',
    'title', 'Encontre o pacote perfeito para sua experiência no Tomorrowland',
    'description', 'Escolha entre nossas opções de hospedagem e viva o festival com conforto, praticidade e segurança. Cada pacote é pensado para tornar sua experiência inesquecível!',
    'packages', jsonb_build_array(
      jsonb_build_object(
        'name','Quarto Suíte','capacity','Até 5 pessoas','priceLabel','Valor por pessoa',
        'price','R$ 1.500','badge','Sold Out','badgeTone','soldout',
        'includes', jsonb_build_array('Hospedagem','Transfer','Lanches noturnos','Kit Exclusivo Way Home','Kits de Higiene','Acesso à piscina e áreas comuns','Todas interações do evento'),
        'bathroom','Banheiro compartilhado apenas entre ocupantes do quarto',
        'altPrice','Valor por pessoa sem transfer: R$ 1.300',
        'ctaUrl','https://wa.link/q7bfzu'
      ),
      jsonb_build_object(
        'name','Camping','capacity','Área delimitada para barracas','priceLabel','Valor por pessoa',
        'price','R$ 1.000','badge','Últimas vagas','badgeTone','last',
        'includes', jsonb_build_array('Hospedagem em camping','Transfer','Lanches noturnos','Kit Exclusivo Way Home','Kits de Higiene','Acesso à piscina e áreas comuns','Todas interações do evento'),
        'bathroom','Banheiro coletivo exclusivo para campistas',
        'altPrice','Valor por pessoa sem transfer: R$ 800',
        'ctaUrl','https://wa.link/q7bfzu'
      )
    )
  )),
  (_page_id, 'camping', 3, jsonb_build_object(
    'eyebrow','Camping Way Home',
    'title','Faltam poucas vagas!',
    'description','O Tomorrowland está chegando e nosso camping exclusivo quase lotou! Garanta agora a sua vaga e viva o festival em meio à natureza com todo o conforto Way Home:',
    'ctaLabel','Garanta sua vaga agora',
    'ctaUrl','https://wa.link/q7bfzu',
    'images', '{}'::jsonb
  )),
  (_page_id, 'location', 4, jsonb_build_object(
    'lines', jsonb_build_array(
      jsonb_build_object('left','Apenas 30 minutos','italic','do Tomorrowland'),
      jsonb_build_object('left','Conforto, praticidade','italic','e a melhor experiência')
    )
  )),
  (_page_id, 'feedback', 5, jsonb_build_object(
    'eyebrow','Feedback',
    'title','O que dizem sobre nós?',
    'description','Depoimentos reais de hóspedes Way Home.',
    'testimonials', jsonb_build_array(
      jsonb_build_object('name','Isabela Santos','quote','Minha experiência foi muito boa porque me senti muito acolhida e bem recebida, os quartos são maravilhosos e chegamos já com kit redução de danos e brindes. Me senti como se estivesse com a minha família no sítio. Os hosters (Hudson e Letícia) são maravilhosos. Com certeza irei com a Way Home para o Tomorrowland 2025 e outros festivais.','avatar',''),
      jsonb_build_object('name','Alan Moreira','quote','Sem palavras para descrever a minha experiência na Way Home. Café da manhã todos os dias, traslados ao Tomorrowland, galera animada e tudo bem organizado pelos responsáveis. Teve até kit de recuperação. Foi top demais 💯💯','avatar',''),
      jsonb_build_object('name','Wendell de Camillo','quote','A Tomorrowland pra mim sempre foi um sonho desde mais novo, e poder realizá-la aqui onde nasci e na companhia dos melhores amigos só fez se tornar ainda mais especial. Do momento em que coloquei os pés nas acomodações da Way Home eu pude me sentir em casa. Tudo foi impecável do começo ao fim.','avatar',''),
      jsonb_build_object('name','Bruna','quote','Foi uma experiência muito confortável. O pessoal da Way Home foi muito receptivo, solícito e atencioso para que pudéssemos viver o melhor da festa.','avatar',''),
      jsonb_build_object('name','Sarah Carvalho','quote','Eu indico super a Way Home, minha estadia por lá durante a Tomorrowland foi maravilhosa: pessoas legais, quartos amplos com banheiros individuais, equipe bem animada e organizada. Os brindes Way Home super pensados para evitar perrengues durante o evento. Nota 10!','avatar',''),
      jsonb_build_object('name','Helena','quote','Só agradecer a Way Home por essa experiência incrível! Vocês pensaram em cada detalhe. Os brindes, kit de boas-vindas, kit redução de danos, café da manhã e lanches ótimos! Quarto com banheiro, limpo e organizado. A paciência, cuidado e comunicação foram excelentes! Obrigada ✨✨','avatar','')
    ),
    'images', '{}'::jsonb
  )),
  (_page_id, 'cta', 6, jsonb_build_object(
    'titleLine1','Garanta sua hospedagem',
    'titleLine2','hoje mesmo!',
    'description','Way Home – Transformando o Tomorrowland em uma experiência inesquecível.',
    'ctaLabel','Reserve agora',
    'ctaUrl','https://wa.link/q7bfzu'
  ));
END $$;
