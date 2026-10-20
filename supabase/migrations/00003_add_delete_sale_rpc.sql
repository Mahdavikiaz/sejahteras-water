-- ============================================================
-- Migration: Fitur Hapus Transaksi (delete_sale RPC)
-- Jalankan di Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Perbarui foreign key agar ON DELETE CASCADE untuk sale_items
--    dan ON DELETE SET NULL untuk stock_movements
DO $$
BEGIN
  -- Update foreign key sale_items.sale_id -> CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sale_items_sale_id_fkey'
  ) THEN
    ALTER TABLE sale_items DROP CONSTRAINT sale_items_sale_id_fkey;
  END IF;
  ALTER TABLE sale_items 
    ADD CONSTRAINT sale_items_sale_id_fkey 
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;

  -- Update foreign key stock_movements.reference_sale_id -> SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_movements_reference_sale_id_fkey'
  ) THEN
    ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_reference_sale_id_fkey;
  END IF;
  ALTER TABLE stock_movements 
    ADD CONSTRAINT stock_movements_reference_sale_id_fkey 
    FOREIGN KEY (reference_sale_id) REFERENCES sales(id) ON DELETE SET NULL;
END $$;

-- 2. Kebijakan RLS untuk DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete sales' AND tablename = 'sales'
  ) THEN
    CREATE POLICY "Authenticated users can delete sales"
      ON sales FOR DELETE
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete sale_items' AND tablename = 'sale_items'
  ) THEN
    CREATE POLICY "Authenticated users can delete sale_items"
      ON sale_items FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 3. FUNCTION RPC: delete_sale()
CREATE OR REPLACE FUNCTION delete_sale(
  p_sale_id uuid,
  p_restore_stock boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale record;
  v_item record;
  v_stock_before integer;
  v_code text;
BEGIN
  -- Kunci data transaksi
  SELECT * INTO v_sale
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi dengan ID % tidak ditemukan', p_sale_id;
  END IF;

  v_code := v_sale.transaction_code;

  -- Jika transaksi masih status completed dan user meminta kembalikan stok
  IF v_sale.status = 'completed' AND p_restore_stock = true THEN
    FOR v_item IN
      SELECT si.*, p.stock AS current_stock
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = p_sale_id
      ORDER BY si.product_id
      FOR UPDATE OF p
    LOOP
      v_stock_before := v_item.current_stock;

      -- Tambah stok barang kembali
      UPDATE products
      SET stock = stock + v_item.quantity
      WHERE id = v_item.product_id;

      -- Catat riwayat pergerakan stok
      INSERT INTO stock_movements (
        product_id,
        movement_type,
        quantity_delta,
        stock_before,
        stock_after,
        reference_sale_id,
        reason
      )
      VALUES (
        v_item.product_id,
        'cancellation_return',
        v_item.quantity,
        v_stock_before,
        v_stock_before + v_item.quantity,
        NULL,
        'Pengembalian stok dari penghapusan transaksi ' || v_code
      );
    END LOOP;
  END IF;

  -- Lepaskan relasi reference_sale_id di stock_movements
  UPDATE stock_movements
  SET reference_sale_id = NULL
  WHERE reference_sale_id = p_sale_id;

  -- Hapus item transaksi
  DELETE FROM sale_items
  WHERE sale_id = p_sale_id;

  -- Hapus data transaksi dari sales
  DELETE FROM sales
  WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'success', true,
    'sale_id', p_sale_id,
    'transaction_code', v_code
  );
END;
$$;

-- Izin eksekusi untuk user yang terautentikasi
REVOKE EXECUTE ON FUNCTION delete_sale FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_sale TO authenticated;
