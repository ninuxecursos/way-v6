
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  status TEXT NOT NULL DEFAULT 'new',
  user_agent TEXT,
  ip_address TEXT,
  admin_notes TEXT,
  user_id UUID,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact messages"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff view contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Staff manage contact messages"
ON public.contact_messages FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Admins delete contact messages"
ON public.contact_messages FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE TRIGGER update_contact_messages_updated_at
BEFORE UPDATE ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contact_messages_status_created ON public.contact_messages(status, created_at DESC);
CREATE INDEX idx_contact_messages_email ON public.contact_messages(email);
