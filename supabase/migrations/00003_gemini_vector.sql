-- Switch from Gemini embedding dimensions (768) to local MiniLM-L6 (384).
-- Run this AFTER the 00001_schema migration.

alter table embeddings alter column embedding type vector(384);

create or replace function match_embeddings(
  query_embedding vector(384),
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

-- Rebuild the index for the new dimension
drop index if exists idx_embeddings_vector;
create index idx_embeddings_vector on embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 200);
