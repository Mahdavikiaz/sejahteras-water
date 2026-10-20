// ============================================================
// AgenKu — Format Helper
// Rupiah, tanggal, dan utilitas format lainnya
// ============================================================

import { BUSINESS_TIMEZONE } from '@/types';

/**
 * Format angka menjadi Rupiah
 * Contoh: 15000 → "Rp15.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal menjadi format lokal Indonesia
 * Contoh: "2026-10-18T10:30:00Z" → "18 Okt 2026"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
}

/**
 * Format tanggal dan waktu
 * Contoh: "2026-10-18T10:30:00Z" → "18 Okt 2026, 17:30"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
}

/**
 * Format tanggal untuk input date HTML
 * Contoh: → "2026-10-18"
 */
export function formatDateForInput(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  });
  return year;
}

/**
 * Mendapatkan awal hari ini di zona waktu bisnis (sebagai ISO string)
 */
export function getTodayStart(): string {
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).format(now);
  // jakartaDate = "2026-10-18"
  return `${jakartaDate}T00:00:00+07:00`;
}

/**
 * Mendapatkan akhir hari ini (awal hari berikutnya) di zona waktu bisnis
 */
export function getTodayEnd(): string {
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).format(now);
  const date = new Date(jakartaDate + 'T00:00:00+07:00');
  date.setDate(date.getDate() + 1);
  const nextDay = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).format(date);
  return `${nextDay}T00:00:00+07:00`;
}

/**
 * Mendapatkan awal bulan ini di zona waktu bisnis
 */
export function getMonthStart(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: BUSINESS_TIMEZONE,
  }).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  return `${year}-${month}-01T00:00:00+07:00`;
}

/**
 * Mendapatkan awal tahun ini di zona waktu bisnis
 */
export function getYearStart(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    timeZone: BUSINESS_TIMEZONE,
  }).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  return `${year}-01-01T00:00:00+07:00`;
}

/**
 * Konversi tanggal lokal (YYYY-MM-DD) menjadi awal hari di zona bisnis
 */
export function localDateToStartOfDay(dateStr: string): string {
  return `${dateStr}T00:00:00+07:00`;
}

/**
 * Konversi tanggal lokal (YYYY-MM-DD) menjadi akhir hari (awal hari berikutnya) di zona bisnis
 */
export function localDateToEndOfDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00+07:00');
  date.setDate(date.getDate() + 1);
  const nextDay = date.toISOString().slice(0, 10);
  return `${nextDay}T00:00:00+07:00`;
}

/**
 * Format angka biasa (non-currency)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Mendapatkan waktu sekarang dalam format datetime-local input
 * Contoh: "2026-10-18T17:30"
 */
export function getNowForDatetimeInput(): string {
  const now = new Date();
  // Format ke waktu Jakarta
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BUSINESS_TIMEZONE,
  }).formatToParts(now);

  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
