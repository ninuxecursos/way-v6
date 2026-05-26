-- Update Hero Section
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "line1": "YOUR HOME",
    "line2a": "AT ",
    "line2b": "TOMORROWLAND",
    "line3": "BRAZIL 2027",
    "title": "Get your package now",
    "ctaLabel": "Get your package now",
    "subtitle": "Way Home: full lodging and unique experiences at Tomorrowland Brazil. Many smiles, memories and connections have already passed through here."
  }'::jsonb),
  '{es}', '{
    "line1": "TU CASA",
    "line2a": "EN ",
    "line2b": "TOMORROWLAND",
    "line3": "BRASIL 2027",
    "title": "Reserva tu paquete ahora",
    "ctaLabel": "Reserva tu paquete ahora",
    "subtitle": "Way Home: alojamiento completo y experiencias únicas en Tomorrowland Brasil. Muchas sonrisas, recuerdos y conexiones ya han pasado por aquí."
  }'::jsonb
)
WHERE id = 'b9d60f1e-2dad-4ff0-9628-65b8fc3aede1';

-- Update Experience Section
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "eyebrow": "Experience",
    "titleA": "Why choose ",
    "titleB": "Way Home?",
    "desc": "Way Home offers personalized lodging and exclusive services to transform your experience at Tomorrowland Brazil.",
    "ctaLabel": "Book now",
    "big": [
      {"title": "Comfortable Lodging", "text": "Cozy rooms or camping space with full infrastructure."},
      {"title": "Transfer Included", "text": "Round trip to the festival with punctuality and safety."}
    ],
    "small": [
      {"title": "Continuous Experience", "text": "Open bar, exclusive parties and a community vibe."},
      {"title": "Breakfast", "text": "Start your day with energy with our brunch-style breakfast."},
      {"title": "Special Kits", "text": "Harm-reduction kit, basic hygiene kit and much more."}
    ]
  }'::jsonb),
  '{es}', '{
    "eyebrow": "Experiencia",
    "titleA": "¿Por qué elegir ",
    "titleB": "Way Home?",
    "desc": "Way Home ofrece alojamiento personalizado y servicios exclusivos para transformar tu experiencia en Tomorrowland Brasil.",
    "ctaLabel": "Reserva ahora",
    "big": [
      {"title": "Alojamiento Confortable", "text": "Habitaciones acogedoras o espacio de camping con toda la infraestructura."},
      {"title": "Transfer Incluido", "text": "Ida y vuelta al festival con puntualidad y seguridad."}
    ],
    "small": [
      {"title": "Experiencia Continua", "text": "Open bar, fiestas exclusivas y ambiente de comunidad."},
      {"title": "Desayuno", "text": "Comienza tu día con energía con nuestro desayuno tipo brunch."},
      {"title": "Kits Especiales", "text": "Kit de reducción de daños, kit de higiene básico y mucho más."}
    ]
  }'::jsonb
)
WHERE id = 'b39cae28-056e-46eb-9d36-513a69da8aeb';

-- Update Lodging Section
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "eyebrow": "Lodging",
    "titleA": "Find the perfect package for your ",
    "titleB": "experience",
    "titleC": " at Tomorrowland",
    "desc": "Choose from our lodging options and live the festival with comfort, convenience and safety. Each package is designed to make your experience unforgettable!"
  }'::jsonb),
  '{es}', '{
    "eyebrow": "Alojamiento",
    "titleA": "Encuentra el paquete perfecto para tu ",
    "titleB": "experiencia",
    "titleC": " en Tomorrowland",
    "desc": "Elige entre nuestras opciones de alojamiento y vive el festival con comodidad, practicidad y seguridad. ¡Cada paquete está pensado para hacer tu experiencia inolvidable!"
  }'::jsonb
)
WHERE id = '28a63ecd-214e-488b-8e97-25af8f2f9451';

-- Update Location Section
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "marquee1": "Strategic location",
    "marquee2": "easy access to the event",
    "marquee3": "Comfort, convenience",
    "marquee4": "and the best experience"
  }'::jsonb),
  '{es}', '{
    "marquee1": "Ubicación estratégica",
    "marquee2": "acceso fácil al evento",
    "marquee3": "Comodidad, practicidad",
    "marquee4": "y la mejor experiencia"
  }'::jsonb
)
WHERE id = 'fd687c67-a2c9-41a7-a868-f540f5c6794c';

-- Update Feedback Section
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "eyebrow": "Feedback",
    "titleA": "What they say ",
    "titleB": "about us?",
    "desc": "Guests who have already lived the Way Home experience share their stories."
  }'::jsonb),
  '{es}', '{
    "eyebrow": "Feedback",
    "titleA": "Qué dicen ",
    "titleB": "¿sobre nosotros?",
    "desc": "Huéspedes que ya vivieron la experiencia Way Home comparten sus historias."
  }'::jsonb
)
WHERE id = '94c32744-4c52-44b4-951a-ee461e0c3898';

-- Update Final CTA Section
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "ctaLabel": "Book now",
    "desc1": "Way Home – Transforming Tomorrowland",
    "desc2": "into an unforgettable experience.",
    "title1": "Secure your ",
    "title2": "lodging",
    "title3": "today!"
  }'::jsonb),
  '{es}', '{
    "ctaLabel": "Reserva ahora",
    "desc1": "Way Home – Transformando Tomorrowland",
    "desc2": "en una experiencia inolvidable.",
    "title1": "Asegura tu ",
    "title2": "alojamiento",
    "title3": "¡hoy mismo!"
  }'::jsonb
)
WHERE id = '246fbb7a-afd9-4162-b335-d8a3bd92860a';

-- ExperienceDetail: Transfer
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "title": "Transfer Way Home",
    "subtitle": "Round trip to the festival with punctuality and safety.",
    "intro": "No worries about cars, Uber or parking. Continuous transfers between Way Home and the Tomorrowland Brazil gates.",
    "ctaLabel": "Secure transfer + lodging",
    "eyebrow": "Transfer Included"
  }'::jsonb),
  '{es}', '{
    "title": "Transfer Way Home",
    "subtitle": "Ida y vuelta al festival con puntualidad y seguridad.",
    "intro": "Sin preocupaciones por el coche, Uber o el aparcamiento. Traslados continuos entre Way Home y las puertas de Tomorrowland Brasil.",
    "ctaLabel": "Asegurar transfer + hospedaje",
    "eyebrow": "Transfer Incluido"
  }'::jsonb
)
WHERE id = '03efbb94-7ecc-47e2-a59b-df9698657077';

-- ExperienceDetail: Breakfast
UPDATE public.page_sections
SET data_i18n = jsonb_set(
  jsonb_set(COALESCE(data_i18n, '{}'::jsonb), '{en}', '{
    "title": "Café da Manhã Way Home",
    "subtitle": "Start your day with energy, in style brunch.",
    "intro": "Full buffet every morning with hot options, fruits, natural juices, artisanal breads and special coffees. Extended hours for those who returned late from the track.",
    "ctaLabel": "Book with breakfast included",
    "eyebrow": "Breakfast"
  }'::jsonb),
  '{es}', '{
    "title": "Desayuno Way Home",
    "subtitle": "Comienza el día con energía, al estilo brunch.",
    "intro": "Buffet completo cada mañana con opciones calientes, frutas, jugos naturales, panes artesanales y cafés especiales. Horario extendido para quienes regresaron tarde de la pista.",
    "ctaLabel": "Reservar con desayuno incluido",
    "eyebrow": "Desayuno"
  }'::jsonb
)
WHERE id = '9bf4c862-1deb-477d-86b4-a7b6f0d08ad7';
