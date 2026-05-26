-- Drop my unused rooms tables (replace with accommodation_rooms used by code)
DROP TABLE IF EXISTS public.room_availability CASCADE;
DROP TABLE IF EXISTS public.room_bookings CASCADE;
DROP TABLE IF EXISTS public.room_translations CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- ========== participants ==========
CREATE TABLE public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  email text,
  gender text, -- 'm' | 'f' | 'o' | null
  document text,
  birthdate date,
  phone text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own participants" ON public.participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE POLICY "Users manage own participants" ON public.participants FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE TRIGGER participants_updated_at BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== accommodation_rooms ==========
CREATE TABLE public.accommodation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number integer NOT NULL UNIQUE,
  capacity integer NOT NULL DEFAULT 8,
  kind text, -- 'individual' | 'galera' | NULL (neutro)
  status text NOT NULL DEFAULT 'available', -- available|partial|full|blocked|maintenance
  active boolean NOT NULL DEFAULT true,
  group_id uuid,
  gender_policy text NOT NULL DEFAULT 'mixed', -- mixed|male|female
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accommodation_rooms_kind_check CHECK (kind IS NULL OR kind IN ('individual','galera')),
  CONSTRAINT accommodation_rooms_status_check CHECK (status IN ('available','partial','full','blocked','maintenance')),
  CONSTRAINT accommodation_rooms_gender_check CHECK (gender_policy IN ('mixed','male','female'))
);
ALTER TABLE public.accommodation_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads rooms" ON public.accommodation_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff manage rooms" ON public.accommodation_rooms FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'financeiro'));
CREATE TRIGGER accommodation_rooms_updated_at BEFORE UPDATE ON public.accommodation_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== orders: colunas para hostel/check-in ==========
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.accommodation_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS allocation_status text DEFAULT 'pending_manual',
  ADD COLUMN IF NOT EXISTS reservation_type text, -- 'individual' | 'galera' | null
  ADD COLUMN IF NOT EXISTS checkin_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid,
  ADD COLUMN IF NOT EXISTS checkin_method text;

CREATE INDEX IF NOT EXISTS idx_orders_room ON public.orders(room_id);
CREATE INDEX IF NOT EXISTS idx_orders_group ON public.orders(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkin_token ON public.orders(checkin_token);

-- ========== notifications: rename link_url -> link ==========
ALTER TABLE public.notifications RENAME COLUMN link_url TO link;

-- ========== Auth lockout RPCs ==========
CREATE OR REPLACE FUNCTION public.check_auth_lockout(_email text)
RETURNS TABLE(locked boolean, attempts_left integer, max_attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _max int := 5; _row public.auth_lockouts; _window interval := interval '15 minutes';
BEGIN
  SELECT * INTO _row FROM public.auth_lockouts WHERE email = lower(_email);
  IF _row.email IS NULL THEN
    RETURN QUERY SELECT false, _max, _max; RETURN;
  END IF;
  -- Auto-unlock após janela
  IF _row.locked AND _row.locked_at IS NOT NULL AND now() - _row.locked_at > _window THEN
    UPDATE public.auth_lockouts SET locked = false, failed_attempts = 0, locked_at = NULL WHERE email = _row.email;
    RETURN QUERY SELECT false, _max, _max; RETURN;
  END IF;
  RETURN QUERY SELECT _row.locked, GREATEST(_max - _row.failed_attempts, 0), _max;
END; $$;

CREATE OR REPLACE FUNCTION public.register_failed_login(_email text)
RETURNS TABLE(locked boolean, attempts_left integer, max_attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _max int := 5; _row public.auth_lockouts;
BEGIN
  INSERT INTO public.auth_lockouts(email, failed_attempts, last_attempt_at)
  VALUES (lower(_email), 1, now())
  ON CONFLICT (email) DO UPDATE
    SET failed_attempts = public.auth_lockouts.failed_attempts + 1,
        last_attempt_at = now(),
        updated_at = now(),
        locked = (public.auth_lockouts.failed_attempts + 1 >= _max),
        locked_at = CASE WHEN public.auth_lockouts.failed_attempts + 1 >= _max THEN now() ELSE public.auth_lockouts.locked_at END
  RETURNING * INTO _row;
  RETURN QUERY SELECT _row.locked, GREATEST(_max - _row.failed_attempts, 0), _max;
END; $$;

CREATE OR REPLACE FUNCTION public.clear_auth_lockout(_email text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  DELETE FROM public.auth_lockouts WHERE email = lower(_email);
$$;

-- auth_lockouts precisa de PK em email
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_lockouts_pkey') THEN
    ALTER TABLE public.auth_lockouts ADD PRIMARY KEY (email);
  END IF;
END $$;

-- Policies mínimas (acesso direto bloqueado — uso só via RPC security definer ou service role)
CREATE POLICY "No direct access lockouts" ON public.auth_lockouts FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "No direct access rate_limits" ON public.rate_limits FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Revoga execução pública das RPCs de lockout (usadas pelo servidor com publishable key — manter authenticated/anon? sim)
GRANT EXECUTE ON FUNCTION public.check_auth_lockout(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_failed_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_auth_lockout(text) TO anon, authenticated;

-- ========== allocate_individual_room (stub simples) ==========
CREATE OR REPLACE FUNCTION public.allocate_individual_room(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _room_id uuid; _order public.orders;
BEGIN
  SELECT * INTO _order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND OR _order.status <> 'paid' OR _order.room_id IS NOT NULL THEN
    RETURN false;
  END IF;
  -- Procura quarto individual com vaga
  SELECT r.id INTO _room_id
  FROM public.accommodation_rooms r
  WHERE r.active = true
    AND r.status NOT IN ('blocked','maintenance','full')
    AND (r.kind = 'individual' OR r.kind IS NULL)
    AND (SELECT COUNT(*) FROM public.orders o WHERE o.room_id = r.id AND o.status='paid') < r.capacity
  ORDER BY r.room_number
  LIMIT 1;
  IF _room_id IS NULL THEN RETURN false; END IF;
  UPDATE public.orders SET room_id = _room_id, allocation_status = 'allocated' WHERE id = _order_id;
  -- Se quarto era neutro, marca como individual
  UPDATE public.accommodation_rooms SET kind = 'individual' WHERE id = _room_id AND kind IS NULL;
  RETURN true;
END; $$;