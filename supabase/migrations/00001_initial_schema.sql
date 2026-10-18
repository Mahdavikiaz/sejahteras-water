-- ============================================================
-- AgenKu — Migration: Initial Schema
-- Jalankan di Supabase SQL Editor atau via Supabase CLI
-- ============================================================

-- ============================================================
-- 1. TABEL: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NULL,
  unit text NOT NULL DEFAULT 'pcs',
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  cost_price bigint NOT NULL CHECK (cost_price >= 0),
  selling_price bigint NOT NULL CHECK (selling_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin (name gin_trgm_ops);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 2. TABEL: sales
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code text UNIQUE NOT NULL,
  buyer_name text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'cancelled')),
  notes text NULL,
  idempotency_key uuid NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz NULL,
  cancellation_reason text NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (status);
CREATE INDEX IF NOT EXISTS idx_sales_occurred_at ON sales (occurred_at);
CREATE INDEX IF NOT EXISTS idx_sales_buyer_name ON sales USING gin (buyer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_code ON sales (transaction_code);


-- ============================================================
-- 3. TABEL: sale_items
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost_snapshot bigint NOT NULL CHECK (unit_cost_snapshot >= 0),
  unit_selling_price_snapshot bigint NOT NULL CHECK (unit_selling_price_snapshot >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);


-- ============================================================
-- 4. TABEL: stock_movements
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type text NOT NULL
    CHECK (movement_type IN ('opening', 'sale', 'cancellation_return', 'adjustment')),
  quantity_delta integer NOT NULL,
  stock_before integer NOT NULL,
  stock_after integer NOT NULL,
  reference_sale_id uuid NULL REFERENCES sales(id) ON DELETE RESTRICT,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_sale_id ON stock_movements (reference_sale_id);


-- ============================================================
-- 5. EXTENSION: pg_trgm (untuk pencarian teks)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- 6. SEQUENCE untuk kode transaksi
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS sale_code_seq START 1;


-- ============================================================
-- 7. VIEW: sales_with_totals
--    Total pemasukan & keuntungan per transaksi
-- ============================================================
CREATE OR REPLACE VIEW sales_with_totals AS
SELECT
  s.id,
  s.transaction_code,
  s.buyer_name,
  s.occurred_at,
  s.status,
  s.notes,
  s.created_at,
  s.cancelled_at,
  s.cancellation_reason,
  COALESCE(agg.total_revenue, 0) AS total_revenue,
  COALESCE(agg.total_profit, 0) AS total_profit,
  COALESCE(agg.item_count, 0) AS item_count
FROM sales s
LEFT JOIN LATERAL (
  SELECT
    SUM(si.quantity * si.unit_selling_price_snapshot) AS total_revenue,
    SUM(si.quantity * (si.unit_selling_price_snapshot - si.unit_cost_snapshot)) AS total_profit,
    SUM(si.quantity) AS item_count
  FROM sale_items si
  WHERE si.sale_id = s.id
) agg ON true;


-- ============================================================
-- 8. FUNCTION: generate_transaction_code()
--    Format: TRX-YYYYMMDD-XXXX
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
  RETURN 'TRX-' || v_date || '-' || lpad(v_seq::text, 4, '0');
END;
$$;


-- ============================================================
-- 9. RPC: create_sale
--    Transaksi atomik: validasi, insert, kurangi stok
-- ============================================================
CREATE OR REPLACE FUNCTION create_sale(
  p_buyer_name text,
  p_occurred_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_transaction_code text;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_product_id uuid;
  v_stock_before integer;
  v_items_arr jsonb[];
  v_seen_products uuid[];
  v_result jsonb;
  v_existing_sale_id uuid;
BEGIN
  -- Validasi: nama pembeli tidak boleh kosong
  IF p_buyer_name IS NULL OR trim(p_buyer_name) = '' THEN
    RAISE EXCEPTION 'Nama pembeli tidak boleh kosong';
  END IF;

  -- Validasi: harus ada minimal 1 item
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Transaksi harus memiliki minimal 1 item produk';
  END IF;

  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_sale_id
    FROM sales
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_sale_id IS NOT NULL THEN
      -- Return existing transaction
      SELECT jsonb_build_object(
        'sale_id', s.id,
        'transaction_code', s.transaction_code,
        'buyer_name', s.buyer_name,
        'occurred_at', s.occurred_at,
        'status', s.status,
        'notes', s.notes,
        'total_revenue', swt.total_revenue,
        'total_profit', swt.total_profit,
        'duplicate', true
      )
      INTO v_result
      FROM sales s
      JOIN sales_with_totals swt ON swt.id = s.id
      WHERE s.id = v_existing_sale_id;

      RETURN v_result;
    END IF;
  END IF;

  -- Validasi duplikat product_id dalam items
  v_seen_products := ARRAY[]::uuid[];
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    IF v_product_id = ANY(v_seen_products) THEN
      RAISE EXCEPTION 'Produk % terduplikasi dalam transaksi. Gabungkan kuantitas menjadi satu baris.', v_product_id;
    END IF;
    v_seen_products := array_append(v_seen_products, v_product_id);
  END LOOP;

  -- Generate transaction code
  v_transaction_code := generate_transaction_code();
  v_sale_id := gen_random_uuid();

  -- Insert sale record
  INSERT INTO sales (id, transaction_code, buyer_name, occurred_at, status, notes, idempotency_key)
  VALUES (v_sale_id, v_transaction_code, trim(p_buyer_name), p_occurred_at, 'completed', p_notes, p_idempotency_key);

  -- Process setiap item — kunci produk berdasarkan urutan UUID untuk cegah deadlock
  FOR v_item IN
    SELECT * FROM jsonb_array_elements(p_items) elem
    ORDER BY (elem->>'product_id')::uuid
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    -- Validasi kuantitas
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Kuantitas harus bilangan bulat positif untuk produk %', v_product_id;
    END IF;

    -- Lock & ambil data produk
    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan', v_product_id;
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Produk "%" sudah tidak aktif dan tidak dapat digunakan untuk transaksi baru', v_product.name;
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Stok produk "%" tidak mencukupi. Tersedia: %, diminta: %', v_product.name, v_product.stock, v_quantity;
    END IF;

    v_stock_before := v_product.stock;

    -- Insert sale_item dengan snapshot harga
    INSERT INTO sale_items (sale_id, product_id, product_name_snapshot, quantity, unit_cost_snapshot, unit_selling_price_snapshot)
    VALUES (v_sale_id, v_product_id, v_product.name, v_quantity, v_product.cost_price, v_product.selling_price);

    -- Kurangi stok
    UPDATE products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;

    -- Catat stock movement
    INSERT INTO stock_movements (product_id, movement_type, quantity_delta, stock_before, stock_after, reference_sale_id, reason)
    VALUES (v_product_id, 'sale', -v_quantity, v_stock_before, v_stock_before - v_quantity, v_sale_id, 'Penjualan ' || v_transaction_code);
  END LOOP;

  -- Return hasil transaksi
  SELECT jsonb_build_object(
    'sale_id', s.id,
    'transaction_code', s.transaction_code,
    'buyer_name', s.buyer_name,
    'occurred_at', s.occurred_at,
    'status', s.status,
    'notes', s.notes,
    'total_revenue', swt.total_revenue,
    'total_profit', swt.total_profit,
    'duplicate', false
  )
  INTO v_result
  FROM sales s
  JOIN sales_with_totals swt ON swt.id = s.id
  WHERE s.id = v_sale_id;

  RETURN v_result;
END;
$$;


-- ============================================================
-- 10. RPC: cancel_sale
--     Pembatalan transaksi atomik + pengembalian stok
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_sale(
  p_sale_id uuid,
  p_reason text DEFAULT NULL
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
  v_result jsonb;
BEGIN
  -- Validasi alasan pembatalan
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Alasan pembatalan wajib diisi';
  END IF;

  -- Lock sale record
  SELECT * INTO v_sale
  FROM sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi dengan ID % tidak ditemukan', p_sale_id;
  END IF;

  IF v_sale.status = 'cancelled' THEN
    RAISE EXCEPTION 'Transaksi % sudah dibatalkan sebelumnya', v_sale.transaction_code;
  END IF;

  -- Update status transaksi
  UPDATE sales
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = trim(p_reason)
  WHERE id = p_sale_id;

  -- Kembalikan stok untuk setiap item — kunci berdasarkan urutan UUID
  FOR v_item IN
    SELECT si.*, p.stock AS current_stock
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    WHERE si.sale_id = p_sale_id
    ORDER BY si.product_id
    FOR UPDATE OF p
  LOOP
    v_stock_before := v_item.current_stock;

    -- Tambah stok kembali
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;

    -- Catat stock movement
    INSERT INTO stock_movements (product_id, movement_type, quantity_delta, stock_before, stock_after, reference_sale_id, reason)
    VALUES (
      v_item.product_id,
      'cancellation_return',
      v_item.quantity,
      v_stock_before,
      v_stock_before + v_item.quantity,
      p_sale_id,
      'Pembatalan transaksi ' || v_sale.transaction_code || ': ' || trim(p_reason)
    );
  END LOOP;

  -- Return hasil
  SELECT jsonb_build_object(
    'sale_id', s.id,
    'transaction_code', s.transaction_code,
    'status', s.status,
    'cancelled_at', s.cancelled_at,
    'cancellation_reason', s.cancellation_reason
  )
  INTO v_result
  FROM sales s
  WHERE s.id = p_sale_id;

  RETURN v_result;
END;
$$;


-- ============================================================
-- 11. RPC: adjust_stock
--     Penyesuaian stok manual dengan alasan wajib
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id uuid,
  p_new_stock integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product record;
  v_stock_before integer;
  v_delta integer;
BEGIN
  -- Validasi
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Alasan penyesuaian stok wajib diisi';
  END IF;

  IF p_new_stock < 0 THEN
    RAISE EXCEPTION 'Stok baru tidak boleh negatif';
  END IF;

  -- Lock produk
  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan', p_product_id;
  END IF;

  v_stock_before := v_product.stock;
  v_delta := p_new_stock - v_stock_before;

  -- Jika tidak ada perubahan
  IF v_delta = 0 THEN
    RETURN jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'stock_before', v_stock_before,
      'stock_after', p_new_stock,
      'delta', 0,
      'message', 'Stok tidak berubah'
    );
  END IF;

  -- Update stok
  UPDATE products
  SET stock = p_new_stock
  WHERE id = p_product_id;

  -- Catat stock movement
  INSERT INTO stock_movements (product_id, movement_type, quantity_delta, stock_before, stock_after, reason)
  VALUES (p_product_id, 'adjustment', v_delta, v_stock_before, p_new_stock, trim(p_reason));

  RETURN jsonb_build_object(
    'product_id', v_product.id,
    'product_name', v_product.name,
    'stock_before', v_stock_before,
    'stock_after', p_new_stock,
    'delta', v_delta,
    'message', 'Stok berhasil disesuaikan'
  );
END;
$$;


-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
--     Hanya authenticated users yang bisa mengakses
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Products: authenticated users full access
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sales: authenticated users full access
CREATE POLICY "Authenticated users can view sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sale Items: authenticated users full access
CREATE POLICY "Authenticated users can view sale_items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sale_items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Stock Movements: authenticated users full access
CREATE POLICY "Authenticated users can view stock_movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock_movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================================
-- 13. GRANTS untuk RPC (SECURITY DEFINER functions)
--     RPC berjalan sebagai definer, tapi tetap batasi EXECUTE
-- ============================================================
REVOKE EXECUTE ON FUNCTION create_sale FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_sale TO authenticated;

REVOKE EXECUTE ON FUNCTION cancel_sale FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_sale TO authenticated;

REVOKE EXECUTE ON FUNCTION adjust_stock FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_stock TO authenticated;

-- Grant usage pada sequence untuk authenticated users (via RPC)
GRANT USAGE ON SEQUENCE sale_code_seq TO authenticated;
