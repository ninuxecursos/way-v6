UPDATE page_sections
SET data = data || jsonb_build_object(
  'intro', 'Café da manhã servido todas as manhãs durante a experiência WayHome, conforme o cardápio oficial definido no Termo de Uso. Itens pensados para repor a energia entre as noites de festival.',
  'subtitle', 'Cardápio oficial WayHome — servido todas as manhãs da experiência.',
  'info', jsonb_build_array(
    jsonb_build_object('label','Servido','value','Todas as manhãs'),
    jsonb_build_object('label','Formato','value','Buffet self-service'),
    jsonb_build_object('label','Bebidas','value','Café, leite, chocolate, chá e suco'),
    jsonb_build_object('label','Cardápio','value','Definido no Termo WayHome')
  ),
  'benefits', jsonb_build_array(
    jsonb_build_object('icon','Coffee','title','Bebidas quentes','text','Café, leite, chocolate e chá à vontade.'),
    jsonb_build_object('icon','CupSoda','title','Sucos e chás','text','Suco de máquina e chá disponíveis no buffet.'),
    jsonb_build_object('icon','Sandwich','title','Frios','text','Queijo, presunto e mortadela.'),
    jsonb_build_object('icon','EggFried','title','Quentes','text','Ovos mexidos e salsicha ao molho.'),
    jsonb_build_object('icon','Croissant','title','Pães','text','Pão francês e Pão Pullman fresquinhos.'),
    jsonb_build_object('icon','Cookie','title','Bolachas','text','3 tipos de bolachas para acompanhar.'),
    jsonb_build_object('icon','Apple','title','Frutas','text','Mamão e melão fatiados na hora.'),
    jsonb_build_object('icon','Info','title','Ajustes operacionais','text','O cardápio pode sofrer ajustes pontuais conforme disponibilidade da operação.')
  ),
  'institutional', jsonb_build_object(
    'title','Energia para encarar mais uma noite',
    'text','Buffet completo com bebidas quentes, frios, ovos, pães, frutas e bolachas — tudo conforme o cardápio oficial WayHome descrito no Termo de Uso.',
    'image','https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1400&q=80&auto=format&fit=crop'
  )
)
WHERE id = '9bf4c862-1deb-477d-86b4-a7b6f0d08ad7';

UPDATE page_sections
SET data = data || jsonb_build_object(
  'intro', 'Quartos WayHome com capacidade para até 8 participantes por unidade, todos equipados com ar-condicionado, televisão e frigobar. Estrutura, equipe e suporte operacional durante todo o período do festival.',
  'subtitle', 'Quartos para até 8 hóspedes, com ar, TV e frigobar — e equipe WayHome 24h.',
  'info', jsonb_build_array(
    jsonb_build_object('label','Capacidade','value','Até 8 participantes por quarto'),
    jsonb_build_object('label','Quartos','value','Ar-condicionado, TV e frigobar'),
    jsonb_build_object('label','Equipe','value','Suporte operacional WayHome'),
    jsonb_build_object('label','Idade mínima','value','18 anos')
  ),
  'benefits', jsonb_build_array(
    jsonb_build_object('icon','Users','title','Até 8 hóspedes por quarto','text','Quartos planejados para acomodar a galera com conforto.'),
    jsonb_build_object('icon','Snowflake','title','Ar-condicionado','text','Climatização em todas as unidades.'),
    jsonb_build_object('icon','Tv','title','Televisão','text','TV no quarto para relaxar entre as noites.'),
    jsonb_build_object('icon','Refrigerator','title','Frigobar','text','Para suas bebidas e snacks pessoais.'),
    jsonb_build_object('icon','ShieldCheck','title','Equipe operacional','text','Suporte WayHome presente durante toda a experiência.'),
    jsonb_build_object('icon','HeartHandshake','title','Convivência respeitosa','text','Ambiente seguro: zero tolerância a agressões, assédio ou discriminação.')
  ),
  'institutional', jsonb_build_object(
    'title','Uma estadia desenhada para festivaleiros',
    'text','Mais do que hospedagem: estrutura, acolhimento, alimentação e suporte operacional durante todo o Tomorrowland Brasil — exatamente como descrito no Termo WayHome.',
    'image','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1400&q=80&auto=format&fit=crop'
  )
)
WHERE id = '041197fd-015f-4024-9c72-d2df2e4465da';

UPDATE page_sections
SET data = data || jsonb_build_object(
  'intro', 'Translados oficiais WayHome entre a hospedagem e o Tomorrowland Brasil. Os horários são definidos pela organização e devem ser rigorosamente respeitados pelos participantes.',
  'subtitle', 'Translados oficiais entre a WayHome e o festival, com horários definidos pela operação.',
  'info', jsonb_build_array(
    jsonb_build_object('label','Operação','value','Translados oficiais WayHome'),
    jsonb_build_object('label','Embarque','value','Direto na hospedagem'),
    jsonb_build_object('label','Horários','value','Definidos pela organização'),
    jsonb_build_object('label','Pontualidade','value','Obrigatória')
  ),
  'benefits', jsonb_build_array(
    jsonb_build_object('icon','Bus','title','Translados oficiais','text','Frota dedicada WayHome entre a hospedagem e o Tomorrowland Brasil.'),
    jsonb_build_object('icon','MapPin','title','Embarque na hospedagem','text','Saídas diretamente da WayHome — sem deslocamento extra.'),
    jsonb_build_object('icon','Clock','title','Horários definidos','text','Respeite os horários da organização. Atrasos do participante não geram reembolso ou reposição.'),
    jsonb_build_object('icon','ShieldCheck','title','Equipe identificada','text','Operação conduzida por equipe treinada e motoristas habilitados.'),
    jsonb_build_object('icon','AlertTriangle','title','Ajustes operacionais','text','Horários podem variar por trânsito, clima, hotel, festival ou segurança da operação.')
  ),
  'institutional', jsonb_build_object(
    'title','Sem stress de carro, Uber ou caminhada',
    'text','Os translados oficiais WayHome conectam a hospedagem ao festival com pontualidade e segurança. Cabe ao participante respeitar rigorosamente os horários definidos pela organização.',
    'image','https://images.unsplash.com/photo-1570125909517-53cb21c89ff2?w=1400&q=80&auto=format&fit=crop'
  )
)
WHERE id = '03efbb94-7ecc-47e2-a59b-df9698657077';

UPDATE page_sections
SET data = data || jsonb_build_object(
  'intro', 'A experiência WayHome vai além do quarto: AFTERs exclusivos, festa de iniciação, sorteios, experiências coletivas, área de convivência e lanche noturno para quem volta da pista.',
  'subtitle', 'AFTERs, festa de iniciação, sorteios, convivência e lanche noturno inclusos.',
  'info', jsonb_build_array(
    jsonb_build_object('label','AFTERs WayHome','value','Inclusos na hospedagem'),
    jsonb_build_object('label','Festa de iniciação','value','Abertura oficial'),
    jsonb_build_object('label','Sorteios','value','Durante a estadia'),
    jsonb_build_object('label','Lanche noturno','value','Servido após o festival')
  ),
  'benefits', jsonb_build_array(
    jsonb_build_object('icon','Music','title','AFTERs WayHome','text','Festas exclusivas para hóspedes depois do festival.'),
    jsonb_build_object('icon','PartyPopper','title','Festa de iniciação','text','Abertura oficial WayHome para receber a comunidade.'),
    jsonb_build_object('icon','Gift','title','Sorteios','text','Brindes e experiências sorteados ao longo da estadia.'),
    jsonb_build_object('icon','Users','title','Experiências coletivas','text','Atividades em grupo pensadas para conectar a galera WayHome.'),
    jsonb_build_object('icon','Sofa','title','Área de convivência','text','Espaço aberto para encontros, descanso e troca entre hóspedes.'),
    jsonb_build_object('icon','Cookie','title','Lanche noturno','text','Pão Pullman com patê, queijo e presunto, 4 tipos de bolachas, bolo, café, chá e suco.')
  ),
  'institutional', jsonb_build_object(
    'title','A festa não para quando os portões fecham',
    'text','AFTERs WayHome, festa de iniciação, sorteios, experiências coletivas e área de convivência — tudo previsto no Termo WayHome para que sua experiência continue antes e depois do festival.',
    'image','https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1400&q=80&auto=format&fit=crop'
  )
)
WHERE id = 'dce630d3-a9e5-4eaf-945d-1c99947b98f2';

UPDATE page_sections
SET data = data || jsonb_build_object(
  'intro', 'Cada hóspede WayHome recebe o Kit Exclusivo da marca e brindes dos patrocinadores oficiais. A operação também disponibiliza seguro e assistência conforme estrutura contratada.',
  'subtitle', 'Kit Exclusivo WayHome, brindes dos patrocinadores e assistência operacional.',
  'info', jsonb_build_array(
    jsonb_build_object('label','Kit Exclusivo','value','Entregue no check-in'),
    jsonb_build_object('label','Patrocinadores','value','Brindes oficiais'),
    jsonb_build_object('label','Seguro','value','Conforme operação contratada'),
    jsonb_build_object('label','Suporte','value','Equipe WayHome durante a experiência')
  ),
  'benefits', jsonb_build_array(
    jsonb_build_object('icon','Gift','title','Kit Exclusivo WayHome','text','Itens oficiais da marca entregues a cada hóspede no check-in.'),
    jsonb_build_object('icon','PackageOpen','title','Brindes dos patrocinadores','text','Produtos e mimos das marcas parceiras WayHome.'),
    jsonb_build_object('icon','HeartPulse','title','Seguro e assistência','text','Cobertura conforme a estrutura operacional contratada — não substitui plano de saúde.'),
    jsonb_build_object('icon','ShieldCheck','title','Apoio operacional','text','Equipe WayHome treinada disponível durante toda a experiência.')
  ),
  'institutional', jsonb_build_object(
    'title','Tudo o que você precisa, entregue no check-in',
    'text','Kit Exclusivo WayHome, brindes dos patrocinadores e suporte operacional fazem parte da experiência contratada — junto com seguro e assistência conforme o Termo oficial.',
    'image','https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=1400&q=80&auto=format&fit=crop'
  )
)
WHERE id = '624f34ea-59cd-4f13-a25d-b16bed991bfe';