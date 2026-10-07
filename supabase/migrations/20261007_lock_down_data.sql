-- Lock down all app data to signed-in users only.
--
-- Before this, logged-out visitors could read plants, zones, gardens, diary
-- entries and more using the public anon key. This turns on Row Level
-- Security (RLS) for every table in the public schema, removes whatever
-- policies existed (some were letting anonymous visitors in), and adds one
-- policy per table: signed-in users can read and write; nobody else can.
--
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

begin;

-- 1. Every table in the public schema: RLS on, old policies out, one new policy in
do $$
declare
  t record;
  p record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);

    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.tablename loop
      execute format('drop policy %I on public.%I', p.policyname, t.tablename);
    end loop;

    execute format(
      'create policy "Signed-in users have full access" on public.%I for all to authenticated using (true) with check (true)',
      t.tablename
    );
  end loop;
end $$;

-- 2. Photo storage: only signed-in users can list, upload, change or delete
--    files in garden-images. (Viewing a photo by its public link still works;
--    making the bucket private is a separate change.)
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%garden-images%' or coalesce(with_check, '') like '%garden-images%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "Signed-in users manage garden images"
  on storage.objects for all to authenticated
  using (bucket_id = 'garden-images')
  with check (bucket_id = 'garden-images');

commit;

-- 3. Check: every public table should show rowsecurity = true and one policy
select t.tablename, t.rowsecurity, count(p.policyname) as policies
from pg_tables t
left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
group by t.tablename, t.rowsecurity
order by t.tablename;
