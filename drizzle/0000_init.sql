-- Initial schema. Hand-authored (not drizzle-kit generated) so we control the pgvector
-- extension, the halfvec(2048) column, and the HNSW index precisely (DECISIONS.md §5).
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  source_type   text NOT NULL,
  status        text NOT NULL DEFAULT 'processing',
  error         text,
  content_hash  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Idempotency guard for seeding: a document's content hash is unique.
CREATE UNIQUE INDEX IF NOT EXISTS documents_content_hash_key ON documents (content_hash);

CREATE TABLE IF NOT EXISTS chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   integer NOT NULL,
  content       text NOT NULL,
  page          integer,
  embedding     halfvec(2048) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ANN index for cosine similarity over the 2048-d halfvec embeddings.
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
  ON chunks USING hnsw (embedding halfvec_cosine_ops);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks (document_id);
