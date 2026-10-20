'use server';

import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ============================================================
// Auth Actions — Login, Logout, dan helper
// ============================================================

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email atau password salah' };
    }
    return { error: 'Gagal masuk. Silakan coba lagi.' };
  }

  redirect('/dashboard');
}

export async function signUpAction(formData: FormData): Promise<{ error?: string; successMessage?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi' };
  }

  if (password.length < 6) {
    return { error: 'Password minimal 6 karakter' };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Email ini sudah terdaftar. Silakan pilih tab "Masuk".' };
    }
    return { error: error.message || 'Gagal mendaftarkan akun. Silakan coba lagi.' };
  }

  // Jika auto-confirm aktif di Supabase, user langsung dapat session
  if (data?.session) {
    redirect('/dashboard');
  }

  return {
    successMessage: 'Pendaftaran berhasil! Akun Anda telah dibuat. Silakan coba masuk dengan email dan password Anda.',
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Helper: pastikan user sudah login, throw error jika belum
 */
export async function requireAuth() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
