-- Fix infinite RLS recursion by using a security definer function
-- The admin policies were querying `users` table inline, which triggered
-- the admin policy on `users` that also queries `users`, causing infinite recursion.

-- Create is_admin() function that bypasses RLS via security definer
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users where users.id = auth.uid() and users.is_admin = true
  );
$$;

-- Drop problematic admin policies that cause recursion
drop policy if exists "Admins can read all admin_logs" on admin_logs;
drop policy if exists "Admins can insert admin_logs" on admin_logs;
drop policy if exists "Admins can read platform_settings" on platform_settings;
drop policy if exists "Admins can upsert platform_settings" on platform_settings;
drop policy if exists "Admins can read all users" on users;
drop policy if exists "Admins can update any user" on users;
drop policy if exists "Admins can read all chatbots" on chatbots;
drop policy if exists "Admins can update any chatbot" on chatbots;
drop policy if exists "Admins can delete any chatbot" on chatbots;
drop policy if exists "Admins can read all conversations" on conversations;
drop policy if exists "Admins can read all messages" on messages;
drop policy if exists "Admins can read all sources" on sources;

-- Recreate policies using is_admin() function (bypasses RLS)
create policy "Admins can read all admin_logs" on admin_logs
  for select using (public.is_admin());

create policy "Admins can insert admin_logs" on admin_logs
  for insert with check (public.is_admin());

create policy "Admins can read platform_settings" on platform_settings
  for select using (public.is_admin());

create policy "Admins can upsert platform_settings" on platform_settings
  for all using (public.is_admin());

create policy "Admins can read all users" on users
  for select using (public.is_admin());

create policy "Admins can update any user" on users
  for update using (public.is_admin());

create policy "Admins can read all chatbots" on chatbots
  for select using (public.is_admin());

create policy "Admins can update any chatbot" on chatbots
  for update using (public.is_admin());

create policy "Admins can delete any chatbot" on chatbots
  for delete using (public.is_admin());

create policy "Admins can read all conversations" on conversations
  for select using (public.is_admin());

create policy "Admins can read all messages" on messages
  for select using (public.is_admin());

create policy "Admins can read all sources" on sources
  for select using (public.is_admin());
