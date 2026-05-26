do $$
declare
  v_page_id uuid;
  v_existing uuid;
  v_slug text;
  v_title text;
  v_desc text;
  v_eyebrow text;
  v_banner text;
  v_data jsonb;
  pages_seed jsonb := '[
    {
      "slug": "hospedagem",
      "title": "Hospedagem Way Home",
      "description": "Conforto premium e segurança ao lado do Tomorrowland Brasil — suítes equipadas, área comum elegante e atendimento exclusivo.",
      "eyebrow": "Hospedagem",
      "banner": "/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp",
      "subtitle": "Sua casa no Tomorrowland",
      "intro": "Hospedagem pensada para quem quer viver o festival com conforto absoluto. Quartos amplos, roupas de cama premium, áreas de convivência elegantes e equipe dedicada do check-in ao check-out.",
      "benefits": [
        {"icon":"BedDouble","title":"Quartos premium","text":"Camas confortáveis, climatização e roupa de cama selecionada para sua melhor noite de sono."},
        {"icon":"ShieldCheck","title":"Segurança 24h","text":"Equipe presente em tempo integral, controle de acesso e ambiente monitorado."},
        {"icon":"Sparkles","title":"Áreas comuns","text":"Espaços de convivência elegantes para descansar entre as noites do festival."},
        {"icon":"Users2","title":"Capacidade flexível","text":"Quartos single ou compartilhados — até 8 pessoas por quarto, com tarifas progressivas."}
      ],
      "info": [
        {"label":"Check-in","value":"A partir das 14h"},
        {"label":"Check-out","value":"Até as 12h"},
        {"label":"Distância do palco","value":"Acesso facilitado ao festival"},
        {"label":"Capacidade","value":"Máximo de 8 pessoas por quarto"}
      ],
      "institutional": {
        "title":"Uma estadia desenhada para festivaleiros",
        "text":"Cada detalhe da Way Home foi pensado para que você acorde renovado e pronto para a próxima noite. Da decoração à logística, tudo opera em torno da sua experiência.",
        "image":"/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp"
      },
      "gallery": [
        "/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp",
        "/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp",
        "/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp",
        "/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp"
      ]
    },
    {
      "slug": "transfer",
      "title": "Transfer Way Home",
      "description": "Transporte oficial entre a Way Home e o Tomorrowland Brasil. Saídas contínuas, conforto e segurança em todas as direções.",
      "eyebrow": "Transfer",
      "banner": "/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp",
      "subtitle": "Entradas e saídas contínuas durante todo o festival",
      "intro": "Frota dedicada, motoristas profissionais e roteiros planejados para você não perder nenhum minuto do festival. Saídas frequentes da Way Home até o evento e retorno.",
      "benefits": [
        {"icon":"Bus","title":"Saídas contínuas","text":"Operação durante todo o festival, com horários sincronizados aos sets principais."},
        {"icon":"QrCode","title":"QR Code único","text":"O mesmo QR Code é usado no transfer e na hospedagem, válido para 2 utilizações oficiais."},
        {"icon":"ShieldCheck","title":"Veículos credenciados","text":"Frota oficial com motoristas profissionais e seguro completo."},
        {"icon":"Clock","title":"Logística inteligente","text":"Rotas otimizadas e tempo reduzido de espera entre os trajetos."}
      ],
      "info": [
        {"label":"Trajeto","value":"Way Home ↔ Tomorrowland Brasil"},
        {"label":"Frequência","value":"Saídas contínuas durante o festival"},
        {"label":"Validação","value":"QR Code único — 2 utilizações"},
        {"label":"Bagagem","value":"Permitida bagagem de mão"}
      ],
      "institutional": {
        "title":"Mobilidade premium incluída na sua estadia",
        "text":"Você não precisa se preocupar com aplicativos, fila ou trânsito. O transfer oficial Way Home é parte da sua experiência completa.",
        "image":"/wh/lhAqI3SkQvc8rU1J20IT1rFoEo.webp"
      },
      "gallery": [
        "/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp",
        "/wh/lhAqI3SkQvc8rU1J20IT1rFoEo.webp",
        "/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp"
      ]
    },
    {
      "slug": "experiencia",
      "title": "Experiência Way Home",
      "description": "Mais do que hospedagem: uma vivência completa em torno do Tomorrowland Brasil, com áreas exclusivas, ambientação e momentos curados.",
      "eyebrow": "Experiência",
      "banner": "/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp",
      "subtitle": "Uma vivência completa, do despertar ao after",
      "intro": "A Way Home é uma extensão do festival. Curamos cada detalhe — da ambientação à trilha sonora — para que sua jornada continue mesmo fora dos palcos oficiais.",
      "benefits": [
        {"icon":"Sparkles","title":"Ambientação imersiva","text":"Espaços decorados com identidade visual exclusiva e iluminação cenográfica."},
        {"icon":"Music","title":"Trilha contínua","text":"Sets curados de DJs convidados nas áreas comuns durante o dia."},
        {"icon":"Users2","title":"Comunidade","text":"Conexões reais com outros festivaleiros num ambiente acolhedor e seguro."},
        {"icon":"Camera","title":"Momentos eternizados","text":"Conteúdo fotográfico profissional disponível para todos os hóspedes."}
      ],
      "info": [
        {"label":"Inclusos","value":"Áreas comuns, ambientação e curadoria"},
        {"label":"Horários","value":"Programação durante todo o dia"},
        {"label":"Idiomas","value":"PT, EN, ES"},
        {"label":"Acessibilidade","value":"Espaços adaptados"}
      ],
      "institutional": {
        "title":"Curadoria do começo ao fim",
        "text":"Tudo o que você vê, ouve e sente na Way Home foi pensado para amplificar a sua experiência no Tomorrowland Brasil.",
        "image":"/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp"
      },
      "gallery": [
        "/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp",
        "/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp",
        "/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp",
        "/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp"
      ]
    },
    {
      "slug": "cafe-da-manha",
      "title": "Café da manhã Way Home",
      "description": "Café da manhã completo e contínuo, com opções fresquinhas, frutas, pães artesanais e bebidas quentes para começar bem o dia.",
      "eyebrow": "Café da manhã",
      "banner": "/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp",
      "subtitle": "Para começar (ou terminar) a noite com energia",
      "intro": "Buffet com ingredientes selecionados, opções vegetarianas e veganas, frutas da estação, pães artesanais, café especial e tudo o que você precisa para recompor a energia.",
      "benefits": [
        {"icon":"Coffee","title":"Café especial","text":"Grãos selecionados e preparação artesanal — espresso, coado e bebidas à base de leite."},
        {"icon":"Sandwich","title":"Buffet completo","text":"Frutas, pães, frios, bolos, ovos preparados na hora e opções salgadas."},
        {"icon":"Leaf","title":"Opções saudáveis","text":"Versões vegetarianas, veganas e sem glúten disponíveis."},
        {"icon":"Clock","title":"Horário estendido","text":"Servido por mais tempo nos dias do festival — você decide a hora."}
      ],
      "info": [
        {"label":"Horário","value":"Servido em horário estendido"},
        {"label":"Inclusos","value":"Buffet completo + bebidas quentes"},
        {"label":"Restrições","value":"Opções vegana, vegetariana e sem glúten"},
        {"label":"Local","value":"Salão principal da Way Home"}
      ],
      "institutional": {
        "title":"Combustível para a próxima noite",
        "text":"Sabemos que o festival exige energia. Nosso café da manhã foi desenhado por nutricionistas e chefs parceiros para te manter no ritmo.",
        "image":"/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp"
      },
      "gallery": [
        "/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp",
        "/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp",
        "/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp"
      ]
    },
    {
      "slug": "kits",
      "title": "Kits Especiais Way Home",
      "description": "Kits exclusivos com itens curados para potencializar sua experiência no Tomorrowland Brasil — do conforto à recordação.",
      "eyebrow": "Kits Way Home",
      "banner": "/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp",
      "subtitle": "Itens curados para você viver o festival sem preocupação",
      "intro": "Cada hóspede recebe um kit Way Home preparado para os dias do festival. Itens de higiene, conforto, hidratação e uma lembrança exclusiva da experiência.",
      "benefits": [
        {"icon":"Gift","title":"Kit boas-vindas","text":"Recebido no check-in com itens essenciais e uma carta da equipe."},
        {"icon":"Sparkles","title":"Higiene completa","text":"Produtos premium para sua rotina diária durante o festival."},
        {"icon":"Droplets","title":"Hidratação","text":"Garrafa reutilizável Way Home e pontos de reabastecimento na hospedagem."},
        {"icon":"Heart","title":"Lembrança exclusiva","text":"Item colecionável de edição limitada para você levar para casa."}
      ],
      "info": [
        {"label":"Inclusos","value":"Kit higiene + garrafa + lembrança"},
        {"label":"Edição","value":"Limitada — exclusiva da temporada 2027"},
        {"label":"Entrega","value":"No check-in"},
        {"label":"Personalização","value":"Disponível para grupos"}
      ],
      "institutional": {
        "title":"Pequenos detalhes que fazem toda a diferença",
        "text":"Os kits Way Home são preparados artesanalmente por parceiros locais. Mais do que utilitários — são uma extensão da nossa hospitalidade.",
        "image":"/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp"
      },
      "gallery": [
        "/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp",
        "/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp",
        "/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp"
      ]
    }
  ]'::jsonb;
  rec jsonb;
begin
  for rec in select * from jsonb_array_elements(pages_seed)
  loop
    v_slug := rec->>'slug';
    v_title := rec->>'title';
    v_desc := rec->>'description';
    v_eyebrow := rec->>'eyebrow';
    v_banner := rec->>'banner';

    select id into v_existing from public.pages where slug = v_slug;
    if v_existing is null then
      insert into public.pages (slug, title, description, status, og_image_url)
      values (v_slug, v_title, v_desc, 'published', v_banner)
      returning id into v_page_id;
    else
      v_page_id := v_existing;
      update public.pages
        set title = coalesce(title, v_title),
            description = coalesce(description, v_desc),
            og_image_url = coalesce(og_image_url, v_banner),
            status = 'published'
        where id = v_page_id;
    end if;

    v_data := jsonb_build_object(
      'eyebrow', v_eyebrow,
      'title', v_title,
      'subtitle', rec->>'subtitle',
      'banner', v_banner,
      'intro', rec->>'intro',
      'benefits', rec->'benefits',
      'info', rec->'info',
      'institutional', rec->'institutional',
      'gallery', rec->'gallery',
      'ctaLabel', 'Reservar agora',
      'ctaUrl', '/reservation'
    );

    if not exists (
      select 1 from public.page_sections
      where page_id = v_page_id and type = 'experience_detail'
    ) then
      insert into public.page_sections (page_id, type, position, visible, visible_mobile, visible_desktop, data)
      values (v_page_id, 'experience_detail', 0, true, true, true, v_data);
    end if;

    if not exists (
      select 1 from public.page_sections
      where page_id = v_page_id and type = 'cta'
    ) then
      insert into public.page_sections (page_id, type, position, visible, visible_mobile, visible_desktop, data)
      values (
        v_page_id, 'cta', 10, true, true, true,
        jsonb_build_object(
          'title1', 'Garanta sua',
          'title2', 'experiência',
          'title3', 'Way Home',
          'desc1', 'Vagas limitadas para a temporada 2027.',
          'desc2', 'Reserve agora e parcele em até 10x no cartão.',
          'ctaLabel', 'Reservar agora',
          'ctaUrl', '/reservation'
        )
      );
    end if;
  end loop;
end$$;