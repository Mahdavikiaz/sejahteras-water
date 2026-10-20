-- ============================================================
-- Migration: Update format kode transaksi menjadi INV-XXXX (e.g. INV-0001)
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_seq bigint;
BEGIN
  v_seq := nextval('sale_code_seq');
  RETURN 'INV-' || lpad(v_seq::text, 4, '0');
END;
$$;
