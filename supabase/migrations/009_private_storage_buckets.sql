-- 009_private_storage_buckets.sql
-- Make the documents and agreements buckets private so Supabase CDN never
-- serves files without authentication. Storage-object RLS policies (added in
-- 007_rls_hardening.sql) already gate row-level access; this migration
-- removes the bucket-level public-URL bypass that overrides those policies.

UPDATE storage.buckets
SET public = false
WHERE id IN ('documents', 'agreements');
