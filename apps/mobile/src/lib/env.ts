const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const env = {
  supabaseUrl,
  supabaseKey,
  apiUrl: (process.env.EXPO_PUBLIC_API_URL?.trim() || 'https://nightguide-modern.vercel.app').replace(/\/$/, ''),
  googleAuthEnabled: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true',
} as const;

export const hasSupabaseEnv = Boolean(
  supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('seu-projeto') &&
    !supabaseKey.includes('sua_chave'),
);
