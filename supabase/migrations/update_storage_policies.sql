
-- Remove the existing Storage policies
DROP POLICY IF EXISTS "Users can view their own documents"
ON storage.objects;

DROP POLICY IF EXISTS "Users can upload their own documents"
ON storage.objects;

DROP POLICY IF EXISTS "Users can delete their own documents"
ON storage.objects;


-- SELECT: View existing files and workspace-owned files
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (
        -- Legacy files: userId/file.pdf
        (storage.foldername(name))[2] IS NULL

        OR

        -- Workspace files: userId/workspaceId/file.pdf
        EXISTS (
            SELECT 1
            FROM public.workspaces w
            WHERE w.id::text = (storage.foldername(name))[2]
              AND w.owner_id = (SELECT auth.uid())
        )
    )
);


-- INSERT: Upload to owned folders only
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (
        (storage.foldername(name))[2] IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.workspaces w
            WHERE w.id::text = (storage.foldername(name))[2]
              AND w.owner_id = (SELECT auth.uid())
        )
    )
);


-- DELETE: Delete only owned files
CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (
        (storage.foldername(name))[2] IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.workspaces w
            WHERE w.id::text = (storage.foldername(name))[2]
              AND w.owner_id = (SELECT auth.uid())
        )
    )
);