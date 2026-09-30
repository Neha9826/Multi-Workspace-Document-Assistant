-- =========================================
-- DOCUMENT IDEMPOTENCY
-- =========================================

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_workspace_file_hash
ON public.documents(workspace_id, file_hash)
WHERE file_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_workspace_file_hash
ON public.documents(workspace_id, file_hash)
WHERE file_hash IS NOT NULL;