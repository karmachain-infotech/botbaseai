-- Allow authenticated users to insert their own row into users table.
-- The signup flow: auth creates the user (sets the session), then we
-- insert into the public.users table from the browser client (anon key).
-- Without this policy, RLS blocks the insert with a 401.
create policy "Users can insert own record" on users
  for insert with check (auth.uid() = id);
