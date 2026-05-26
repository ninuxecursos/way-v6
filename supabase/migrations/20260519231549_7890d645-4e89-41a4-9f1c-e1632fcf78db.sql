
DO $$
DECLARE
  v_page_id uuid;
  v_updates jsonb := jsonb_build_object(
    'hospedagem', jsonb_build_object(
      'banner', '/wh/MiyBdR5sRH5u0R5wpUhuJOBVY.webp',
      'title', 'Hospedagem Way Home'
    ),
    'transfer', jsonb_build_object(
      'banner', '/wh/aX2ms4piPBPICe5GmcHASNOFZOo.webp',
      'title', 'Transfer Way Home'
    ),
    'experiencia', jsonb_build_object(
      'banner', '/wh/J4ZMBX4SZeVTCKE1SPacmEFOhQ.webp',
      'title', 'Experiência Contínua Way Home'
    ),
    'cafe-da-manha', jsonb_build_object(
      'banner', '/wh/Qj0ydYUqhNx64xhujaoMluJr9Ek.webp',
      'title', 'Café da Manhã Way Home'
    ),
    'kits', jsonb_build_object(
      'banner', '/wh/Ax4PsoLuTHcsnQh6vWmoOo8oAM.webp',
      'title', 'Kits Especiais Way Home'
    )
  );
  v_slug text;
  v_data jsonb;
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
