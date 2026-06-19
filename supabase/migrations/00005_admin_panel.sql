-- Admin Panel: add is_admin to users, create admin_logs & platform_settings tables

-- Add is_admin column to users table
alter table users add column if not exists is_admin boolean not null default false;

-- Create admin_logs table for auditing admin actions
create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references users(id) on delete cascade,
  action text not null,
  target_user_id uuid references users(id) on delete set null,
  target_resource text,
  resource_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp not null default now()
);

-- Create platform_settings table for dynamic configuration
create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp not null default now(),
  updated_by uuid references users(id) on delete set null
);

-- Enable RLS
alter table admin_logs enable row level security;
alter table platform_settings enable row level security;

-- Admins can read all admin_logs
create policy "Admins can read all admin_logs" on admin_logs
  for select using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admins can insert admin_logs
create policy "Admins can insert admin_logs" on admin_logs
  for insert with check (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admins can read all platform_settings
create policy "Admins can read platform_settings" on platform_settings
  for select using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admins can upsert platform_settings
create policy "Admins can upsert platform_settings" on platform_settings
  for all using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admins can read ALL users (for admin panel)
create policy "Admins can read all users" on users
  for select using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admins can update users
create policy "Admins can update any user" on users
  for update using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admin can read all chatbots
create policy "Admins can read all chatbots" on chatbots
  for select using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admin can update any chatbot
create policy "Admins can update any chatbot" on chatbots
  for update using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admin can delete any chatbot
create policy "Admins can delete any chatbot" on chatbots
  for delete using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admin can read all conversations
create policy "Admins can read all conversations" on conversations
  for select using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admin can read all messages
create policy "Admins can read all messages" on messages
  for select using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Admin can read all sources
create policy "Admins can read all sources" on sources
  for select using (
    exists (select 1 from users where users.id = auth.uid() and users.is_admin = true)
  );

-- Insert default platform settings
insert into platform_settings (key, value) values
  ('platform_name', '"BotbaseAI"'),
  ('platform_logo', 'null'),
  ('maintenance_mode', 'false'),
  ('announcement_banner_enabled', 'false'),
  ('announcement_banner_message', '""'),
  ('default_free_credits', '50'),
  ('default_hobby_credits', '500'),
  ('default_standard_credits', '4000'),
  ('default_pro_credits', '15000'),
  ('default_enterprise_credits', '999999'),
  ('feature_allow_export', 'true'),
  ('feature_allow_team', 'false'),
  ('feature_allow_custom_domain', 'false'),
  ('smtp_host', '""'),
  ('smtp_port', '""'),
  ('smtp_user', '""'),
  ('smtp_pass', '""'),
  ('webhook_notification_url', '""')
on conflict (key) do nothing;
