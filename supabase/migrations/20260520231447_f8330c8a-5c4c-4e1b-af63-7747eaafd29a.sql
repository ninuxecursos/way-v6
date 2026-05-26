ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all realtime channel access" ON realtime.messages;
CREATE POLICY "Deny all realtime channel access"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);

DROP POLICY IF EXISTS "Deny all realtime channel writes" ON realtime.messages;
CREATE POLICY "Deny all realtime channel writes"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (false);