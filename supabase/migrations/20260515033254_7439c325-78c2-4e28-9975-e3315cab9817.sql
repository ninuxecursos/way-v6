SELECT cron.schedule(
  'event-reminders-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url:='https://project--3a1103b8-3d36-43d8-b2ed-81086d2e5e46.lovable.app/api/public/hooks/event-reminders',
    headers:=jsonb_build_object('Content-Type','application/json'),
    body:='{}'::jsonb
  ) AS request_id;
  $$
);