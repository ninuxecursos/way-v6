
DO $$
DECLARE
  v_page_id uuid;
  v_data jsonb;
  v_slug text;
  v_updates jsonb := jsonb_build_object(
    'hospedagem', jsonb_build_object(
      'banner','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1920&q=80&auto=format&fit=crop',
      'info', jsonb_build_array(
        jsonb_build_object('label','Check-in','value','A partir das 14h'),
        jsonb_build_object('label','Check-out','value','Até as 12h'),
        jsonb_build_object('label','Distância do festival','value','Acesso facilitado'),
        jsonb_build_object('label','Capacidade','value','Até 4 pessoas por quarto')
      ),
      'gallery', jsonb_build_array(
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1551776235-dde6d4829808?w=1200&q=80&auto=format&fit=crop'
      ),
      'institutional', jsonb_build_object(
        'title','Uma estadia desenhada para festivaleiros',
        'text','Camas confortáveis, climatização e equipe de apoio selecionada para que você tenha o melhor descanso entre as noites de festival.',
        'image','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1400&q=80&auto=format&fit=crop'
      )
    ),
    'transfer', jsonb_build_object(
      'banner','https://images.unsplash.com/photo-1597926329625-93ed1fcc8b95?w=1920&q=80&auto=format&fit=crop',
      'info', jsonb_build_array(
        jsonb_build_object('label','Frequência','value','Saídas contínuas'),
        jsonb_build_object('label','Tempo médio','value','15-25 min'),
        jsonb_build_object('label','Embarque','value','Direto na hospedagem'),
        jsonb_build_object('label','Operação','value','24h durante o festival')
      ),
      'gallery', jsonb_build_array(
        'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1503416997304-7f8bf166c121?w=1200&q=80&auto=format&fit=crop'
      ),
      'institutional', jsonb_build_object(
        'title','Sem stress de carro, Uber ou caminhada',
        'text','Nossa frota dedicada leva você direto da Way Home até os portões do Tomorrowland Brasil — com pontualidade, conforto e segurança a qualquer hora.',
        'image','https://images.unsplash.com/photo-1570125909517-53cb21c89ff2?w=1400&q=80&auto=format&fit=crop'
      )
    ),
    'experiencia', jsonb_build_object(
      'banner','https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80&auto=format&fit=crop',
      'info', jsonb_build_array(
        jsonb_build_object('label','Festas exclusivas','value','Pré e pós festival'),
        jsonb_build_object('label','Open bar','value','Horários definidos'),
        jsonb_build_object('label','Áreas de convivência','value','24h'),
        jsonb_build_object('label','Surpresas','value','Ativações exclusivas')
      ),
      'gallery', jsonb_build_array(
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1571266028243-d220c6a9d9c6?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80&auto=format&fit=crop'
      ),
      'institutional', jsonb_build_object(
        'title','A festa não para quando os portões fecham',
        'text','Open bar, line-ups exclusivos e uma comunidade global vivendo o Tomorrowland Brasil junto com você — antes, durante e depois.',
        'image','https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1400&q=80&auto=format&fit=crop'
      )
    ),
    'cafe-da-manha', jsonb_build_object(
      'banner','https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1920&q=80&auto=format&fit=crop',
      'info', jsonb_build_array(
        jsonb_build_object('label','Horário','value','07h às 12h'),
        jsonb_build_object('label','Formato','value','Buffet brunch'),
        jsonb_build_object('label','Opções','value','Veg, sem glúten, sem lactose'),
        jsonb_build_object('label','Cafés','value','Especiais ilimitados')
      ),
      'gallery', jsonb_build_array(
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=1200&q=80&auto=format&fit=crop'
      ),
      'institutional', jsonb_build_object(
        'title','Energia para encarar mais uma noite',
        'text','Buffet completo todas as manhãs com opções quentes, frutas frescas, pães artesanais e cafés especiais — em horário estendido para quem voltou tarde da pista.',
        'image','https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1400&q=80&auto=format&fit=crop'
      )
    ),
    'kits', jsonb_build_object(
      'banner','https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=1920&q=80&auto=format&fit=crop',
      'info', jsonb_build_array(
        jsonb_build_object('label','Redução de danos','value','Incluso'),
        jsonb_build_object('label','Kit higiene','value','Diário'),
        jsonb_build_object('label','Protetor solar','value','Disponível'),
        jsonb_build_object('label','Apoio médico','value','24h no local')
      ),
      'gallery', jsonb_build_array(
        'https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1583947581924-860bda3c4f29?w=1200&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop'
      ),
      'institutional', jsonb_build_object(
        'title','Curta com responsabilidade — a gente cuida do resto',
        'text','Cada hóspede Way Home recebe kits pensados para sua saúde, conforto e segurança. Informação, prevenção e apoio médico para festivaleiros conscientes.',
        'image','https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1400&q=80&auto=format&fit=crop'
      )
    )
  );
BEGIN
  FOR v_slug, v_data IN SELECT * FROM jsonb_each(v_updates)
  LOOP
    SELECT id INTO v_page_id FROM pages WHERE slug = v_slug;
    IF v_page_id IS NOT NULL THEN
      UPDATE page_sections
      SET data = data || v_data
      WHERE page_id = v_page_id AND type = 'experience_detail';
    END IF;
  END LOOP;
END $$;
