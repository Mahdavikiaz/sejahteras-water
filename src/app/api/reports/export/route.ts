import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { BUSINESS_TIMEZONE } from '@/types';

// ============================================================
// API Route: Export CSV Laporan
// GET /api/reports/export?start_date=...&end_date=...
// ============================================================

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase belum dikonfigurasi di file .env.local' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Cek auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Parameter start_date dan end_date wajib diisi' },
        { status: 400 }
      );
    }

    // Ambil transaksi completed dalam periode
    const { data: sales, error: salesError } = await supabase
      .from('sales_with_totals')
      .select('*')
      .eq('status', 'completed')
      .gte('occurred_at', startDate)
      .lt('occurred_at', endDate)
      .order('occurred_at', { ascending: true });

    if (salesError) {
      console.error('Error exporting report:', salesError);
      return NextResponse.json(
        { error: 'Gagal mengambil data laporan' },
        { status: 500 }
      );
    }

    // Ambil detail item untuk setiap transaksi
    const saleIds = (sales ?? []).map((s) => s.id);
    let items: Record<string, Array<{
      product_name_snapshot: string;
      quantity: number;
      unit_selling_price_snapshot: number;
      unit_cost_snapshot: number;
    }>> = {};

    if (saleIds.length > 0) {
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('sale_id, product_name_snapshot, quantity, unit_selling_price_snapshot, unit_cost_snapshot')
        .in('sale_id', saleIds);

      // Group by sale_id
      items = (saleItems ?? []).reduce((acc, item) => {
        if (!acc[item.sale_id]) {
          acc[item.sale_id] = [];
        }
        acc[item.sale_id].push(item);
        return acc;
      }, {} as typeof items);
    }

    // Bangun CSV
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const header = [
      'Kode Transaksi',
      'Tanggal',
      'Nama Pembeli',
      'Produk',
      'Jumlah',
      'Harga Satuan',
      'Harga Modal',
      'Subtotal Pemasukan',
      'Subtotal Keuntungan',
      'Total Pemasukan Transaksi',
      'Total Keuntungan Transaksi',
      'Catatan',
    ].join(';');

    const rows: string[] = [];

    for (const sale of sales ?? []) {
      const saleItems = items[sale.id] ?? [];
      const dateStr = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: BUSINESS_TIMEZONE,
      }).format(new Date(sale.occurred_at));

      if (saleItems.length === 0) {
        // Transaksi tanpa item (seharusnya tidak terjadi)
        rows.push([
          sale.transaction_code,
          dateStr,
          escapeCsv(sale.buyer_name),
          '',
          '',
          '',
          '',
          '',
          '',
          sale.total_revenue,
          sale.total_profit,
          escapeCsv(sale.notes || ''),
        ].join(';'));
      } else {
        for (const item of saleItems) {
          const subtotalRevenue = item.quantity * item.unit_selling_price_snapshot;
          const subtotalProfit = item.quantity * (item.unit_selling_price_snapshot - item.unit_cost_snapshot);

          rows.push([
            sale.transaction_code,
            dateStr,
            escapeCsv(sale.buyer_name),
            escapeCsv(item.product_name_snapshot),
            item.quantity,
            item.unit_selling_price_snapshot,
            item.unit_cost_snapshot,
            subtotalRevenue,
            subtotalProfit,
            sale.total_revenue,
            sale.total_profit,
            escapeCsv(sale.notes || ''),
          ].join(';'));
        }
      }
    }

    const csv = BOM + header + '\n' + rows.join('\n');

    // Nama file dengan periode
    const startFormatted = startDate.slice(0, 10).replace(/-/g, '');
    const endFormatted = endDate.slice(0, 10).replace(/-/g, '');
    const filename = `laporan_${startFormatted}_${endFormatted}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengekspor data' },
      { status: 500 }
    );
  }
}

/**
 * Escape CSV value — handle semicolons, quotes, and newlines
 */
function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
