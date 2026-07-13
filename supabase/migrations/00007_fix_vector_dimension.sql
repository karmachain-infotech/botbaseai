-- Fix vector dimension to match the embedding model
-- Model: Xenova/all-MiniLM-L6-v2 → 384 dimensions
-- Previously set to vector(1536) which caused all training inserts to fail

-- Drop index first (depends on the column type)
drop index if exists idx_embeddings_vector;

-- Alter column type
alter table embeddings alter column embedding type vector(384);

-- Drop and recreate match_embeddings function with correct dimensions
drop function if exists match_embeddings;

create or replace function match_embeddings(
  query_embedding vector(384),
  match_chatbot_id uuid,
  match_threshold float default 0.25,
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

-- Recreate the IVFFlat index for similarity search
create index if not exists idx_embeddings_vector on embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
