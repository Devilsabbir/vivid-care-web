-- Migration 012: Add client_type field to clients table
-- Distinguishes NDIS participants from standard (non-NDIS) clients.
-- Signature collection and NDIS agreements are only required for 'ndis' clients.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'ndis'
  CHECK (client_type IN ('ndis', 'standard'));

COMMENT ON COLUMN clients.client_type IS
  'Client classification: ''ndis'' for NDIS participants (require service agreements and signatures), ''standard'' for non-NDIS clients (no signature collection required).';

-- Back-fill existing rows: clients that already have an ndis_number keep 'ndis'.
-- Clients with no ndis_number are also left as 'ndis' for safety, since the platform
-- was originally built exclusively for NDIS work. Admins can update individual records.
