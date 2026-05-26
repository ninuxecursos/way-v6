DO $$
DECLARE
  v_page_id uuid;
  v_pages jsonb := jsonb_build_array(
    jsonb_build_object(
      'slug','hospedagem','title','Hospedagem Way Home',
      'description','Quartos aconchegantes ou camping com toda a infraestrutura para o Tomorrowland Brasil.',
      'data', jsonb_build_object(
        'eyebrow','Hospedagem','title','Hospedagem Way Home',
        'subtitle','Quartos aconchegantes ou camping com toda a infraestrutura para os dias do festival.',
        'intro','Escolha entre quartos compartilhados, galera com amigos, casal privativo ou área de camping. Estrutura completa para descansar e voltar pra pista.',
        'benefits', jsonb_build_array(
          jsonb_build_object('icon','BedDouble','title','Quartos completos','text','Cama, roupa de cama e energia 24h.'),
          jsonb_build_object('icon','ShowerHead','title','Banho quente','text','Estrutura sanitária limpa e organizada.'),
          jsonb_build_object('icon','Tent','title','Área de camping','text','Espaço seguro com apoio para sua barraca.'),
          jsonb_build_object('icon','ShieldCheck','title','Segurança 24h','text','Equipe presente em todos os turnos.')),
        'ctaLabel','Reservar minha vaga','ctaUrl','/reservation')),
    jsonb_build_object(
      'slug','transfer','title','Transfer Way Home',
      'description','Ida e volta para o festival com pontualidade e segurança.',
      'data', jsonb_build_object(
        'eyebrow','Transfer Incluso','title','Transfer Way Home',
        'subtitle','Ida e volta para o festival com pontualidade e segurança.',
        'intro','Sem preocupação com carro, Uber ou estacionamento. Transfers contínuos entre a Way Home e os portões do Tomorrowland Brasil.',
        'benefits', jsonb_build_array(
          jsonb_build_object('icon','Bus','title','Frota dedicada','text','Veículos exclusivos para hóspedes Way Home.'),
          jsonb_build_object('icon','Clock','title','Horários contínuos','text','Saídas frequentes durante todo o festival.'),
          jsonb_build_object('icon','ShieldCheck','title','Motoristas habilitados','text','Equipe identificada e treinada.'),
          jsonb_build_object('icon','MapPin','title','Embarque na porta','text','Direto na hospedagem, sem caminhadas.')),
        'ctaLabel','Garantir transfer + hospedagem','ctaUrl','/reservation')),
    jsonb_build_object(
      'slug','experiencia','title','Experiência Contínua Way Home',
      'description','Open bar, festas exclusivas e ambiente de comunidade.',
      'data', jsonb_build_object(
        'eyebrow','Experiência Contínua','title','Experiência Contínua Way Home',
        'subtitle','Open bar, festas exclusivas e ambiente de comunidade.',
        'intro','Antes e depois do Tomorrowland Brasil, a Way Home oferece line-ups exclusivos, espaços de convivência e a energia da comunidade.',
        'benefits', jsonb_build_array(
          jsonb_build_object('icon','Music','title','Festas exclusivas','text','DJs e line-ups só para hóspedes.'),
          jsonb_build_object('icon','Beer','title','Open bar','text','Drinks e bebidas inclusos em horários definidos.'),
          jsonb_build_object('icon','Users','title','Comunidade','text','Conheça gente do mundo todo.'),
          jsonb_build_object('icon','Sparkles','title','Surpresas','text','Ativações e experiências exclusivas.')),
        'ctaLabel','Quero viver essa experiência','ctaUrl','/reservation')),
    jsonb_build_object(
      'slug','cafe-da-manha','title','Café da Manhã Way Home',
      'description','Café da manhã estilo brunch para começar o dia com energia.',
      'data', jsonb_build_object(
        'eyebrow','Café da manhã','title','Café da Manhã Way Home',
        'subtitle','Comece o dia com energia, no estilo brunch.',
        'intro','Buffet completo todas as manhãs com opções quentes, frutas, sucos naturais, pães artesanais e cafés especiais. Horário estendido para quem voltou tarde da pista.',
        'benefits', jsonb_build_array(
          jsonb_build_object('icon','Coffee','title','Cafés especiais','text','Espresso, cappuccino e opções sem cafeína.'),
          jsonb_build_object('icon','Croissant','title','Pães e bolos','text','Frescos, feitos diariamente.'),
          jsonb_build_object('icon','Apple','title','Frutas e sucos','text','Frutas da estação e sucos naturais.'),
          jsonb_build_object('icon','EggFried','title','Quentes','text','Ovos, panquecas e opções proteicas.')),
        'ctaLabel','Reservar com café incluso','ctaUrl','/reservation')),
    jsonb_build_object(
      'slug','kits','title','Kits Especiais Way Home',
      'description','Kit redução de danos e kit de higiene básica inclusos.',
      'data', jsonb_build_object(
        'eyebrow','Kits Especiais','title','Kits Especiais Way Home',
        'subtitle','Redução de danos e higiene básica inclusos na hospedagem.',
        'intro','Você curte com responsabilidade e a gente garante o suporte. Todo hóspede recebe kits para sua saúde, conforto e segurança nos dias de festival.',
        'benefits', jsonb_build_array(
          jsonb_build_object('icon','HeartPulse','title','Redução de danos','text','Informação e itens para curtir com segurança.'),
          jsonb_build_object('icon','Droplets','title','Higiene básica','text','Itens essenciais para sua rotina.'),
          jsonb_build_object('icon','SunMedium','title','Protetor solar','text','Para os dias sob o sol.'),
          jsonb_build_object('icon','Pill','title','Apoio médico','text','Equipe disponível 24h no local.')),
        'ctaLabel','Reservar com kits inclusos','ctaUrl','/reservation'))
  );
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_pages)
  LOOP
    INSERT INTO pages (slug, title, description, status)
    VALUES (v_item->>'slug', v_item->>'title', v_item->>'description', 'published')
    ON CONFLICT (slug) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = 'published',
          updated_at = now()
    RETURNING id INTO v_page_id;

    DELETE FROM page_sections WHERE page_id = v_page_id;

    INSERT INTO page_sections (page_id, type, position, visible, visible_mobile, visible_desktop, data, data_i18n)
    VALUES (v_page_id, 'experience_detail', 0, true, true, true, v_item->'data', '{}'::jsonb);
  END LOOP;
END $$;