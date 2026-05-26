
-- 1) Tabela de quartos
CREATE TABLE public.reservation_group_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.reservation_groups(id) ON DELETE CASCADE,
  room_number integer NOT NULL,
  capacity integer NOT NULL DEFAULT 9,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_group_rooms_capacity_chk CHECK (capacity > 0 AND capacity <= 9),
  CONSTRAINT reservation_group_rooms_number_chk CHECK (room_number > 0),
  UNIQUE (group_id, room_number)
);

CREATE INDEX idx_rgr_group ON public.reservation_group_rooms(group_id);

ALTER TABLE public.reservation_group_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage group rooms"
ON public.reservation_group_rooms
FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Group members read rooms"
ON public.reservation_group_rooms
FOR SELECT TO authenticated
USING (is_group_member(group_id, auth.uid()));

CREATE TRIGGER trg_rgr_updated_at
BEFORE UPDATE ON public.reservation_group_rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Coluna room_id em members
ALTER TABLE public.reservation_group_members
  ADD COLUMN room_id uuid NULL REFERENCES public.reservation_group_rooms(id) ON DELETE SET NULL;

CREATE INDEX idx_rgm_room ON public.reservation_group_members(room_id);

-- 3) Capacidade do grupo: 2..20
ALTER TABLE public.reservation_groups
  DROP CONSTRAINT IF EXISTS reservation_groups_capacity_check;
ALTER TABLE public.reservation_groups
  ADD CONSTRAINT reservation_groups_capacity_check
  CHECK (capacity >= 2 AND capacity <= 20);

-- 4) Função auto-assign
CREATE OR REPLACE FUNCTION public.reservation_group_auto_assign_rooms(_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _capacity int;
  _paid_count int;
  _rooms_needed int;
  _existing_rooms int;
  _i int;
  _max_existing_number int;
  _room_record record;
  _member record;
  _current_room_id uuid;
  _current_room_count int;
  _per_room constant int := 9;
BEGIN
  SELECT capacity INTO _capacity FROM public.reservation_groups WHERE id = _group_id;
  IF _capacity IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO _paid_count
    FROM public.reservation_group_members
    WHERE group_id = _group_id AND payment_status = 'paid';

  -- Só organiza quando o grupo está cheio (todos pagos = capacidade)
  IF _paid_count < _capacity THEN RETURN; END IF;

  _rooms_needed := CEIL(_capacity::numeric / _per_room)::int;

  SELECT count(*), COALESCE(MAX(room_number), 0)
    INTO _existing_rooms, _max_existing_number
    FROM public.reservation_group_rooms WHERE group_id = _group_id;

  -- Cria quartos faltantes
  IF _existing_rooms < _rooms_needed THEN
    FOR _i IN (_max_existing_number + 1)..(_max_existing_number + (_rooms_needed - _existing_rooms)) LOOP
      INSERT INTO public.reservation_group_rooms (group_id, room_number, capacity)
      VALUES (_group_id, _i, _per_room);
    END LOOP;
  END IF;

  -- Distribui membros sem quarto, ordem joined_at, preenchendo cada quarto até a capacidade
  FOR _room_record IN
    SELECT id, capacity FROM public.reservation_group_rooms
    WHERE group_id = _group_id
    ORDER BY room_number
  LOOP
    SELECT count(*) INTO _current_room_count
      FROM public.reservation_group_members
      WHERE room_id = _room_record.id;
    _current_room_id := _room_record.id;

    FOR _member IN
      SELECT id FROM public.reservation_group_members
      WHERE group_id = _group_id AND room_id IS NULL
      ORDER BY joined_at ASC
    LOOP
      EXIT WHEN _current_room_count >= _room_record.capacity;
      UPDATE public.reservation_group_members
      SET room_id = _current_room_id
      WHERE id = _member.id;
      _current_room_count := _current_room_count + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- 5) Trigger ao mudar payment_status para 'paid'
CREATE OR REPLACE FUNCTION public.reservation_group_member_after_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    PERFORM public.reservation_group_auto_assign_rooms(NEW.group_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rgm_after_paid ON public.reservation_group_members;
CREATE TRIGGER trg_rgm_after_paid
AFTER INSERT OR UPDATE OF payment_status ON public.reservation_group_members
FOR EACH ROW EXECUTE FUNCTION public.reservation_group_member_after_paid();

-- 6) Helpers admin
CREATE OR REPLACE FUNCTION public.reservation_group_room_add(_group_id uuid)
RETURNS public.reservation_group_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next int;
  _row public.reservation_group_rooms;
BEGIN
  IF NOT (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT COALESCE(MAX(room_number), 0) + 1 INTO _next
    FROM public.reservation_group_rooms WHERE group_id = _group_id;
  INSERT INTO public.reservation_group_rooms (group_id, room_number, capacity)
  VALUES (_group_id, _next, 9)
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.reservation_group_member_set_room(_member_id uuid, _room_id uuid)
RETURNS public.reservation_group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member public.reservation_group_members;
  _room public.reservation_group_rooms;
  _count int;
BEGIN
  IF NOT (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _member FROM public.reservation_group_members WHERE id = _member_id;
  IF _member.id IS NULL THEN RAISE EXCEPTION 'member_not_found'; END IF;

  IF _room_id IS NOT NULL THEN
    SELECT * INTO _room FROM public.reservation_group_rooms WHERE id = _room_id;
    IF _room.id IS NULL THEN RAISE EXCEPTION 'room_not_found'; END IF;
    IF _room.group_id <> _member.group_id THEN RAISE EXCEPTION 'room_not_in_group'; END IF;

    SELECT count(*) INTO _count FROM public.reservation_group_members
      WHERE room_id = _room.id AND id <> _member_id;
    IF _count >= _room.capacity THEN RAISE EXCEPTION 'room_full'; END IF;
  END IF;

  UPDATE public.reservation_group_members
    SET room_id = _room_id
    WHERE id = _member_id
  RETURNING * INTO _member;
  RETURN _member;
END;
$$;
