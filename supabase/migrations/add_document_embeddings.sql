CREATE EXTENSION IF NOT EXISTS vector
WITH SCHEMA extensions;


ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);


CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
ON public.document_chunks
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;


CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding extensions.vector(384),
    match_threshold FLOAT,
    match_count INTEGER,
    filter_workspace_id UUID
)
RETURNS TABLE (
    document_id UUID,
    chunk_index INTEGER,
    content TEXT,
    similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        dc.document_id,
        dc.chunk_index,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    INNER JOIN public.documents d
        ON d.id = dc.document_id
    INNER JOIN public.workspaces w
        ON w.id = d.workspace_id
    WHERE dc.embedding IS NOT NULL
      AND d.workspace_id = filter_workspace_id
      AND w.owner_id = (SELECT auth.uid())
      AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;


GRANT EXECUTE
ON FUNCTION public.match_document_chunks(
    extensions.vector(384),
    FLOAT,
    INTEGER,
    UUID
)
TO authenticated;