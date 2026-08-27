-- The home dashboard reads the active visa, process stage, and document
-- requirements through the public Supabase client. RLS policies remain the
-- authority for which rows are visible.
grant usage on schema public to anon, authenticated;
grant select on public.visa_requirements to anon, authenticated;
grant select on public.visa_process_stages to anon, authenticated;
grant select on public.document_requirements to anon, authenticated;

