-- Allow authenticated users to access the public schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions.
-- Existing RLS policies will still restrict which rows
-- each authenticated user can access.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.workspaces, public.documents
TO authenticated;