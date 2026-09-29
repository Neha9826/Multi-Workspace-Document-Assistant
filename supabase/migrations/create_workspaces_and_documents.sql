
-- =========================================
-- 1. WORKSPACES
-- =========================================

CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
        CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
    owner_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id
    ON public.workspaces(owner_id);


-- =========================================
-- 2. DOCUMENTS
-- =========================================

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    size_bytes BIGINT NOT NULL
        CHECK (size_bytes > 0),
    uploaded_by UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace_id
    ON public.documents(workspace_id);


-- =========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;


-- =========================================
-- 4. WORKSPACE POLICIES
-- =========================================

CREATE POLICY "Owners can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Owners can create their workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Owners can update their workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Owners can delete their workspaces"
ON public.workspaces
FOR DELETE
TO authenticated
USING (owner_id = (SELECT auth.uid()));


-- =========================================
-- 5. DOCUMENT POLICIES
-- =========================================

CREATE POLICY "Owners can view workspace documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = documents.workspace_id
          AND w.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can add workspace documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = documents.workspace_id
          AND w.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can update workspace documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = documents.workspace_id
          AND w.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = documents.workspace_id
          AND w.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can delete workspace documents"
ON public.documents
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = documents.workspace_id
          AND w.owner_id = (SELECT auth.uid())
    )
);