-- ============ ORDERS extra columns ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS base_price_cents bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_price_cents bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS installment_quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- ============ PROFILES extra ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_secondary text;

-- ============ PRODUCTS extra ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS event_date date,
  ADD COLUMN IF NOT EXISTS event_ends_at timestamptz;

-- ============ RESERVATION GROUPS (Galera) ============
CREATE TABLE public.reservation_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code text NOT NULL UNIQUE,
  holder_user_id uuid NOT NULL,
  holder_name text NOT NULL,
  holder_email text,
  product_slug text NOT NULL,
  product_name text,
  capacity integer NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'open',
  notified_complete_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rg_status_check CHECK (status IN ('open','completed','closed_manual','cancelled'))
);
ALTER TABLE public.reservation_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own groups" ON public.reservation_groups FOR SELECT TO authenticated
  USING (holder_user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Staff manage groups" ON public.reservation_groups FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE TRIGGER rg_updated_at BEFORE UPDATE ON public.reservation_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reservation_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.reservation_groups(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'member',
  payment_status text NOT NULL DEFAULT 'pending',
  room_id uuid,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rgm_role_check CHECK (role IN ('holder','member')),
  CONSTRAINT rgm_pay_check CHECK (payment_status IN ('pending','paid','failed','refunded'))
);
ALTER TABLE public.reservation_group_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_rgm_group ON public.reservation_group_members(group_id);
CREATE POLICY "Members view own" ON public.reservation_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.reservation_groups g WHERE g.id = group_id AND g.holder_user_id = auth.uid())
    OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Staff manage members" ON public.reservation_group_members FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

CREATE TABLE public.reservation_group_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.reservation_groups(id) ON DELETE CASCADE,
  room_number integer NOT NULL,
  capacity integer NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_group_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view group rooms" ON public.reservation_group_rooms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reservation_groups g WHERE g.id = group_id AND (
    g.holder_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.reservation_group_members m WHERE m.group_id = g.id AND m.user_id = auth.uid())
    OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))));
CREATE POLICY "Staff manage group rooms" ON public.reservation_group_rooms FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));

-- ============ RESERVATION DRAFTS ============
CREATE TABLE public.reservation_drafts (
  user_id uuid PRIMARY KEY,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own draft" ON public.reservation_drafts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ EVENT REVIEWS ============
CREATE TABLE public.event_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL UNIQUE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  comment text,
  display_name text,
  city text,
  avatar_url text,
  photos text[] DEFAULT ARRAY[]::text[],
  video_url text,
  experience_date date,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT er_status_check CHECK (status IN ('pending','approved','rejected','hidden'))
);
ALTER TABLE public.event_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads approved reviews" ON public.event_reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved');
CREATE POLICY "Users view own reviews" ON public.event_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Users insert own review" ON public.event_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own pending review" ON public.event_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending','approved'))
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage reviews" ON public.event_reviews FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER er_updated_at BEFORE UPDATE ON public.event_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TERMS ACCEPTANCE ============
CREATE TABLE public.terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  terms_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own acceptance" ON public.terms_acceptance FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Users insert own acceptance" ON public.terms_acceptance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============ PROMO COUPONS ============
CREATE TABLE public.promo_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value integer NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  min_order_cents bigint NOT NULL DEFAULT 0,
  product_slugs text[],
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pc_disc_check CHECK (discount_type IN ('percent','fixed'))
);
ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage promo coupons" ON public.promo_coupons FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE TRIGGER pc_updated_at BEFORE UPDATE ON public.promo_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPCs ============

-- get_auth_user_basic: dados básicos do auth.users (admin only)
CREATE OR REPLACE FUNCTION public.get_auth_user_basic(_user_id uuid)
RETURNS TABLE(email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz, phone text, provider text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT u.email::text, u.email_confirmed_at, u.last_sign_in_at, u.created_at, u.phone::text,
         COALESCE((u.raw_app_meta_data->>'provider'), 'email')::text
  FROM auth.users u WHERE u.id = _user_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.get_auth_user_basic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_basic(uuid) TO authenticated;

-- get_public_avatars
CREATE OR REPLACE FUNCTION public.get_public_avatars(_ids uuid[])
RETURNS TABLE(id uuid, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.avatar_url FROM public.profiles p WHERE p.id = ANY(_ids);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_avatars(uuid[]) TO anon, authenticated;

-- validate_promo_coupon
CREATE OR REPLACE FUNCTION public.validate_promo_coupon(_code text, _product_slug text, _amount_cents bigint)
RETURNS TABLE(valid boolean, reason text, code text, discount_type text, discount_value integer, discount_cents bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE c public.promo_coupons; _disc bigint := 0;
BEGIN
  SELECT * INTO c FROM public.promo_coupons WHERE upper(code) = upper(_code);
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
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_promo_coupon(text,text,bigint) TO anon, authenticated;

-- increment_promo_coupon_usage
CREATE OR REPLACE FUNCTION public.increment_promo_coupon_usage(_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.promo_coupons SET used_count = used_count + 1 WHERE upper(code) = upper(_code);
$$;
GRANT EXECUTE ON FUNCTION public.increment_promo_coupon_usage(text) TO authenticated;

-- register_participant
CREATE OR REPLACE FUNCTION public.register_participant(_full_name text, _email text, _gender text, _document text, _phone text, _birthdate date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.participants(user_id, full_name, email, gender, document, phone, birthdate)
  VALUES (auth.uid(), _full_name, _email, _gender, _document, _phone, _birthdate)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.register_participant(text,text,text,text,text,date) TO authenticated;

-- reservation_group_create
CREATE OR REPLACE FUNCTION public.reservation_group_create(
  _coupon_code text, _holder_user_id uuid, _holder_name text, _holder_email text,
  _product_slug text, _product_name text, _capacity integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.reservation_groups(coupon_code, holder_user_id, holder_name, holder_email, product_slug, product_name, capacity)
  VALUES (upper(_coupon_code), _holder_user_id, _holder_name, _holder_email, _product_slug, _product_name, _capacity)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reservation_group_create(text,uuid,text,text,text,text,integer) TO authenticated;

-- reservation_group_member_set_room
CREATE OR REPLACE FUNCTION public.reservation_group_member_set_room(_member_id uuid, _room_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.reservation_group_members SET room_id = _room_id WHERE id = _member_id;
$$;
GRANT EXECUTE ON FUNCTION public.reservation_group_member_set_room(uuid,uuid) TO authenticated;

-- reservation_group_room_add: cria sala automaticamente até preencher capacidade
CREATE OR REPLACE FUNCTION public.reservation_group_room_add(_group_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _next_num int; _id uuid;
BEGIN
  SELECT COALESCE(MAX(room_number), 0) + 1 INTO _next_num FROM public.reservation_group_rooms WHERE group_id = _group_id;
  INSERT INTO public.reservation_group_rooms(group_id, room_number) VALUES (_group_id, _next_num) RETURNING id INTO _id;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reservation_group_room_add(uuid) TO authenticated;

-- get_group_coupon_public
CREATE OR REPLACE FUNCTION public.get_group_coupon_public(_coupon text)
RETURNS TABLE(coupon_code text, holder_first_name text, product_slug text, product_name text,
              capacity integer, used integer, available integer, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.reservation_groups; _used int;
BEGIN
  SELECT * INTO g FROM public.reservation_groups WHERE upper(coupon_code) = upper(_coupon);
  IF NOT FOUND THEN RETURN; END IF;
  SELECT COUNT(*) INTO _used FROM public.reservation_group_members WHERE group_id = g.id;
  RETURN QUERY SELECT g.coupon_code, split_part(g.holder_name,' ',1), g.product_slug, g.product_name,
                      g.capacity, _used, GREATEST(g.capacity - _used, 0), g.status, g.created_at;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_group_coupon_public(text) TO anon, authenticated;

-- reservation_group_join_paid: vincula pedido pago a um membro do grupo (chamado pelo webhook)
CREATE OR REPLACE FUNCTION public.reservation_group_join_paid(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.reservation_group_members m
  SET payment_status = 'paid', order_id = _order_id
  FROM public.orders o
  WHERE o.id = _order_id AND m.email = o.customer_email AND m.payment_status = 'pending';
END; $$;
GRANT EXECUTE ON FUNCTION public.reservation_group_join_paid(uuid) TO authenticated;