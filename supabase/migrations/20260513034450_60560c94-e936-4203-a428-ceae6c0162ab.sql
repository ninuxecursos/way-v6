-- Allow anyone to read objects in the public media bucket so storage upsert
-- and public URL listings work for authenticated editors and anonymous viewers.
CREATE POLICY "Public read media-public"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-public');