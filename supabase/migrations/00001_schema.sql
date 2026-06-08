-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- ============================================
-- TABLES
-- ============================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'hobby', 'standard', 'pro', 'enterprise')),
  message_credits_used int not null default 0,
  message_credits_limit int not null default 50,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp not null default now()
);

create table if not exists chatbots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  instructions text not null default '',
  model text not null default 'gpt-4o',
  language text not null default 'en',
  status text not null default 'draft' check (status in ('draft', 'live')),
  widget_config jsonb not null default '{"primaryColor":"#7c3aed","backgroundColor":"#1e1b4b","textColor":"#ffffff","logoUrl":null,"greeting":"Hi! How can I help you?","bubbleIcon":"message","botName":"BotbaseAI Agent"}'::jsonb,
  allowed_domains text[] not null default array[]::text[],
  escalation_rules text,
  message_count int not null default 0,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references chatbots(id) on delete cascade,
  type text not null check (type in ('file', 'url', 'text', 'qa')),
  name text not null,
  content text not null default '',
  status text not null default 'pending' check (status in ('pending', 'processing', 'trained', 'failed')),
  file_size int,
  created_at timestamp not null default now()
);

create table if not exists embeddings (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references chatbots(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

-- Index for vector similarity search
create index if not exists idx_embeddings_chatbot_id on embeddings(chatbot_id);
create index if not exists idx_embeddings_vector on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references chatbots(id) on delete cascade,
  session_id text not null,
  user_identifier text,
  status text not null default 'open' check (status in ('open', 'resolved', 'escalated')),
  escalated boolean not null default false,
  rating int check (rating >= 1 and rating <= 5),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  sources_used jsonb[] not null default array[]::jsonb[],
  tokens_used int not null default 0,
  response_time_ms int not null default 0,
  created_at timestamp not null default now()
);

create table if not exists ai_actions (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references chatbots(id) on delete cascade,
  name text not null,
  description text not null default '',
  method text not null default 'GET' check (method in ('GET', 'POST', 'PUT', 'DELETE')),
  url text not null,
  headers jsonb not null default '{}'::jsonb,
  body_template text,
  enabled boolean not null default true,
  created_at timestamp not null default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table users enable row level security;
alter table chatbots enable row level security;
alter table sources enable row level security;
alter table embeddings enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table ai_actions enable row level security;

-- Users can only see their own record
create policy "Users can read own record" on users
  for select using (auth.uid() = id);
create policy "Users can update own record" on users
  for update using (auth.uid() = id);

-- Chatbots belong to users
create policy "Users can CRUD own chatbots" on chatbots
  for all using (auth.uid() = user_id);

-- Sources belong to chatbots
create policy "Users can CRUD own sources" on sources
  for all using (
    exists (select 1 from chatbots where chatbots.id = sources.chatbot_id and chatbots.user_id = auth.uid())
  );

-- Embeddings belong to chatbots
create policy "Users can CRUD own embeddings" on embeddings
  for all using (
    exists (select 1 from chatbots where chatbots.id = embeddings.chatbot_id and chatbots.user_id = auth.uid())
  );

-- Conversations belong to chatbots
create policy "Users can CRUD own conversations" on conversations
  for all using (
    exists (select 1 from chatbots where chatbots.id = conversations.chatbot_id and chatbots.user_id = auth.uid())
  );

-- Messages belong to conversations
create policy "Users can CRUD own messages" on messages
  for all using (
    exists (
      select 1 from conversations
      join chatbots on chatbots.id = conversations.chatbot_id
      where conversations.id = messages.conversation_id and chatbots.user_id = auth.uid()
    )
  );

-- AI Actions belong to chatbots
create policy "Users can CRUD own ai_actions" on ai_actions
  for all using (
    exists (select 1 from chatbots where chatbots.id = ai_actions.chatbot_id and chatbots.user_id = auth.uid())
  );

-- Public policy for widget (allow select on chatbots and conversations by id)
create policy "Public can read widget config" on chatbots
  for select using (status = 'live');

-- ============================================
-- VECTOR SEARCH FUNCTION
-- ============================================

create or replace function match_embeddings(
  query_embedding vector(1536),
  match_chatbot_id uuid,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  chatbot_id uuid,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    embeddings.id,
    embeddings.chatbot_id,
    embeddings.source_id,
    embeddings.content,
    embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  where embeddings.chatbot_id = match_chatbot_id
    and 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  order by embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;
