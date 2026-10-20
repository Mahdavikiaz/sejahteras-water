# AgenKu

**Dashboard admin untuk bisnis agen air minum dan gas** — mencatat penjualan, memantau stok, dan melihat laporan keuangan dengan tampilan yang sederhana dan mudah dipakai siapa saja, termasuk orang tua yang tidak terbiasa dengan software.

![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)

## Latar Belakang

Banyak agen air galon dan gas masih mencatat penjualan dan stok di buku tulis. Cara ini rawan salah hitung, stok sulit dipantau, dan laporan keuntungan baru bisa dibuat setelah rekap manual yang melelahkan.

AgenKu dibuat untuk menggantikan buku catatan itu dengan aplikasi web yang **cepat dipakai, jelas, dan datanya akurat**. Prioritas utamanya adalah ketepatan data transaksi dan stok, lalu kemudahan pemakaian, baru kemudian estetika.

## Fitur Utama

### Ringkasan
Halaman pertama yang menampilkan kondisi bisnis hari ini: total pemasukan, total keuntungan, jumlah transaksi, produk yang stoknya menipis atau habis, serta transaksi terbaru. Tersedia tombol **Catat Transaksi** dan **Tambah Produk** yang mudah ditemukan.

### Produk & Stok
- Tambah, ubah, dan nonaktifkan produk (kategori, satuan, harga modal, harga jual).
- Keuntungan per unit dihitung otomatis.
- Pencarian dan filter: Semua, Stok Menipis, Stok Habis, Aktif, Nonaktif.
- Penyesuaian stok manual wajib disertai alasan dan tercatat di riwayat stok.
- Produk yang sudah pernah terjual tidak dihapus permanen, cukup dinonaktifkan agar histori tetap utuh.

### Transaksi
- Satu transaksi bisa berisi beberapa produk sekaligus.
- Subtotal dan total dihitung langsung, dengan peringatan jika jumlah melebihi stok.
- Ringkasan ditampilkan sebelum transaksi disimpan.
- Riwayat transaksi dengan pencarian (kode atau nama pembeli) dan filter tanggal.
- Pembatalan transaksi mengembalikan stok secara otomatis, mencatat alasan, dan tidak menghapus data.

### Laporan Keuangan
- Filter per hari, rentang tanggal, bulan, atau tahun.
- Total pemasukan, total keuntungan, jumlah transaksi, dan rata-rata nilai transaksi.
- Rekap per tanggal dan detail transaksi.
- Ekspor CSV yang bisa langsung dibuka di Excel, mengikuti filter yang sedang aktif.

## Yang Membuat Proyek Ini Menarik

**Transaksi atomik di level database.** Pembuatan dan pembatalan transaksi diproses lewat fungsi PostgreSQL (RPC) di Supabase, bukan dari beberapa request terpisah di browser. Penyimpanan transaksi, pengurangan stok, dan pencatatan riwayat stok terjadi dalam satu transaksi database. Jika satu produk stoknya kurang, seluruh transaksi dibatalkan dan tidak ada stok yang berkurang sebagian.

**Pencegahan overselling.** Baris produk dikunci secara konsisten saat transaksi diproses sehingga dua transaksi yang masuk hampir bersamaan tidak bisa membuat stok menjadi negatif.

**Snapshot harga.** Harga jual dan harga modal disimpan pada setiap item transaksi saat transaksi terjadi. Mengubah harga produk di kemudian hari tidak akan mengubah laporan transaksi lama.

**Audit trail stok.** Setiap perubahan stok (penjualan, pembatalan, penyesuaian) tercatat lengkap dengan jumlah sebelum dan sesudah, alasan, dan referensi transaksi.

**Idempotency.** Request yang sama tidak membuat transaksi ganda ketika terjadi klik berulang atau retry.

**Uang tanpa floating point.** Seluruh nilai rupiah disimpan sebagai bilangan bulat untuk menghindari kesalahan pembulatan.

**Zona waktu konsisten.** Pengelompokan harian, bulanan, dan tahunan memakai zona waktu Asia/Jakarta agar transaksi di akhir hari tidak salah periode.

**Keamanan.** Login dengan Supabase Auth, Row Level Security pada tabel, serta fungsi database yang membatasi hak akses dan menetapkan `search_path` dengan aman. Service role key tidak pernah dipakai di sisi browser.

## Desain dan Pengalaman Pengguna

Aplikasi dirancang untuk pengguna yang tidak terbiasa dengan aplikasi admin:

- Seluruh antarmuka berbahasa Indonesia yang natural dan minim istilah teknis.
- Tombol besar, teks minimal 15–16px, kontras tinggi, dan label teks pada aksi penting, bukan ikon saja.
- Status seperti stok menipis atau habis dibedakan dengan label teks, tidak hanya warna.
- Tampilan sederhana dan hangat dengan satu warna aksen, tanpa dekorasi berlebihan.
- Responsif untuk laptop, tablet, dan ponsel, dengan sidebar di desktop dan drawer di mobile.
- Tersedia loading state, empty state, error state, dan konfirmasi sebelum aksi yang tidak bisa dibatalkan.

## Tech Stack

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Database dan Auth | Supabase (PostgreSQL, Supabase Auth, RLS) |
| Akses Supabase | `@supabase/supabase-js`, `@supabase/ssr` |
| Validasi dan form | Zod, React Hook Form |
| Pendukung | lucide-react, date-fns, library toast |

## Struktur Proyek

```text
src/
  app/
    (auth)/login/          # Halaman login
    (dashboard)/           # Ringkasan, Transaksi, Produk & Stok, Laporan
  components/              # Layout, UI, form, dan tabel
  lib/
    supabase/              # Klien Supabase (browser dan server)
    validations/           # Skema Zod
    formatters/            # Format rupiah dan tanggal
    reports/               # Logika laporan dan ekspor CSV
supabase/
  migrations/              # Skema, RLS, trigger, dan fungsi RPC
```

## Model Data

- `products` — data produk, stok, harga modal, dan harga jual.
- `sales` — header transaksi (kode, pembeli, waktu, status, catatan pembatalan).
- `sale_items` — item transaksi beserta snapshot harga jual dan modal.
- `stock_movements` — riwayat setiap perubahan stok.

Fungsi database utama: `create_sale` untuk membuat transaksi dan `cancel_sale` untuk membatalkan transaksi, keduanya berjalan atomik.

## Menjalankan Secara Lokal

```bash
npm install
cp .env.example .env.local   # isi dengan URL dan key dari project Supabase kamu
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Jalankan migration SQL di folder `supabase/migrations/` pada project Supabase sebelum memakai aplikasi, lalu buat user login pertama lewat Supabase Auth.

## Catatan

Nama aplikasi (AgenKu) dan ambang stok menipis (default 5 unit) dapat diubah lewat konfigurasi di kode.
