-- =========================================
-- DOCUMENT CHUNKS
-- =========================================

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL
        REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL
        CHECK (chunk_index >= 0),
    content TEXT NOT NULL
        CHECK (char_length(trim(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
    ON public.document_chunks(document_id);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view document chunks"
ON public.document_chunks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.documents d
        JOIN public.workspaces w
          ON w.id = d.workspace_id
        WHERE d.id = document_chunks.document_id
          AND w.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can add document chunks"
ON public.document_chunks
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.documents d
        JOIN public.workspaces w
          ON w.id = d.workspace_id
        WHERE d.id = document_chunks.document_id
          AND w.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can update document chunks"
ON public.document_chunks
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.documents d
        JOIN public.workspaces w
          ON w.id = d.workspace_id
        WHERE d.id = document_chunks.document_id
          AND w.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.documents d
        JOIN public.workspaces w
          ON w.id = d.workspace_id
        WHERE d.id = document_chunks.document_id
          AND w.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can delete document chunks"
ON public.document_chunks
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.documents d
        JOIN public.workspaces w
          ON w.id = d.workspace_id
        WHERE d.id = document_chunks.document_id
          AND w.owner_id = (SELECT auth.uid())
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.document_chunks
TO authenticated;