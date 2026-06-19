-- Create the 'sources' storage bucket for file uploads
-- The bucket is private; access is managed via service role key
insert into storage.buckets (id, name, public, file_size_limit)
values ('sources', 'sources', false, 10485760)
on conflict (id) do nothing;

-- Allow service role full access (already granted by default, but explicit is safer)
create policy "Service role full access to sources bucket"
on storage.objects for all
to service_role
using (bucket_id = 'sources')
with check (bucket_id = 'sources');
