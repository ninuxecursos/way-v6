
CREATE OR REPLACE FUNCTION public.validate_promo_coupon(_code text, _product_slug text, _amount_cents bigint)
 RETURNS TABLE(valid boolean, reason text, code text, discount_type text, discount_value integer, discount_cents bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.promo_coupons; _disc bigint := 0;
BEGIN
  SELECT pc.* INTO c FROM public.promo_coupons pc WHERE upper(pc.code) = upper(_code);
  IF NOT FOUND THEN RETURN QUERY SELECT false,'not_found',null::text,null::text,null::int,0::bigint; RETURN; END IF;
  IF NOT c.active THEN RETURN QUERY SELECT false,'inactive',c.code,c.discount_type,c.discount_value,0::bigint; RETURN; END IF;
  IF c.starts_at IS NOT NULL AND c.starts_at > now() THEN RETURN QUERY SELECT false,'not_started',c.code,c.discount_type,c.discount_value,0::bigint; RETURN; END IF;
  IF c.ends_at IS NOT NULL AND c.ends_at < now() THEN RETURN QUERY SELECT false,'expired',c.code,c.discount_type,c.discount_value,0::bigint; RETURN; END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RETURN QUERY SELECT false,'max_uses',c.code,c.discount_type,c.discount_value,0::bigint; RETURN; END IF;
  IF c.min_order_cents > _amount_cents THEN RETURN QUERY SELECT false,'min_order',c.code,c.discount_type,c.discount_value,0::bigint; RETURN; END IF;
  IF c.product_slugs IS NOT NULL AND array_length(c.product_slugs,1) > 0 AND (_product_slug IS NULL OR NOT (_product_slug = ANY(c.product_slugs))) THEN
    RETURN QUERY SELECT false,'product_mismatch',c.code,c.discount_type,c.discount_value,0::bigint; RETURN;
  END IF;
  IF c.discount_type = 'percent' THEN _disc := (_amount_cents * c.discount_value) / 100;
  ELSE _disc := c.discount_value::bigint * 100; END IF;
  IF _disc > _amount_cents THEN _disc := _amount_cents; END IF;
  RETURN QUERY SELECT true,'ok',c.code,c.discount_type,c.discount_value,_disc;
END; $function$;
