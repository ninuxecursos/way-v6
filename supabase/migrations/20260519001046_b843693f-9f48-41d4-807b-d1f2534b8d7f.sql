-- Token único por pedido para QR Code de check-in
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkin_token text,
  ADD COLUMN IF NOT EXISTS checkin_method text;

-- Backfill pedidos existentes sem token
UPDATE public.orders
SET checkin_token = encode(gen_random_bytes(16), 'hex')
WHERE checkin_token IS NULL;

-- Default para futuros inserts
ALTER TABLE public.orders
  ALTER COLUMN checkin_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- Unicidade + busca rápida
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkin_token
  ON public.orders (checkin_token)
  WHERE checkin_token IS NOT NULL;

-- Tornar NOT NULL agora que está preenchido
ALTER TABLE public.orders
  ALTER COLUMN checkin_token SET NOT NULL;