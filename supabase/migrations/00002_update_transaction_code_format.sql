-- ============================================================
-- Migration: Update format kode transaksi menjadi INV-YYYYMMDD-XXX
-- Contoh hasil: INV-20261020-001, INV-20261020-002, dst.
-- Jalankan di Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_seq bigint;
  v_date text;
BEGIN
  v_seq := nextval('sale_code_seq');
  v_date := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
  RETURN 'INV-' || v_date || '-' || lpad(v_seq::text, 3, '0');
END;
$$;

-- Opsional: Jika ingin mereset nomor urutan agar mulai dari 001 lagi, jalankan baris berikut:
-- ALTER SEQUENCE sale_code_seq RESTART WITH 1;
