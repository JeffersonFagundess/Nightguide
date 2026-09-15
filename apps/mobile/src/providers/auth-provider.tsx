import type { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { env, hasSupabaseEnv } from '@/src/lib/env';
import { isNetworkReachable, queueOfflineAction, syncOfflineActions } from '@/src/lib/offline-sync';
import { readJson, scopedKey, writeJson } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';
import type { Profile, UserRole } from '@/src/types';
import type { LocalReviewPhoto } from '@/src/lib/review-media';

WebBrowser.maybeCompleteAuthSession();

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type UpdateProfileInput = {
  fullName: string;
  avatarPhoto?: LocalReviewPhoto;
  avatarUrl?: string;
};

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  googleEnabled: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (user: User | null) => {
    if (!user || !supabase) {
      setProfile(null);
      return;
    }

    const profileKey = scopedKey('nightguide:profile', user.id);
    const cached = await readJson<Profile | null>(profileKey, null);
    if (cached) setProfile(cached);

    if (!(await isNetworkReachable())) {
      if (!cached) {
        setProfile({
          id: user.id,
          fullName: user.user_metadata?.full_name || user.email || 'NightGuide',
          avatarUrl: user.user_metadata?.avatar_url || undefined,
          role: normalizeRole(user.user_metadata?.role),
        });
      }
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,avatar_url,role')
      .eq('id', user.id)
      .maybeSingle();

    const nextProfile: Profile = {
      id: user.id,
      fullName: data?.full_name || cached?.fullName || user.user_metadata?.full_name || user.email || 'NightGuide',
      avatarUrl: data?.avatar_url || cached?.avatarUrl || user.user_metadata?.avatar_url || undefined,
      role: normalizeRole(data?.role || cached?.role || user.user_metadata?.role),
    };
    setProfile(nextProfile);
    await writeJson(profileKey, nextProfile);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setReady(true);
      return;
    }

    let mounted = true;
    void client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      void loadProfile(data.session?.user ?? null).finally(() => setReady(true));
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setTimeout(() => void loadProfile(nextSession?.user ?? null), 0);
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      appState.remove();
    };
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    requireSupabase();
    const { error } = await supabase!.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error('E-mail ou senha inválidos.');
  }, []);

  const register = useCallback(async ({ name, email, password }: RegisterInput) => {
    requireSupabase();
    const { data, error } = await supabase!.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('A conta foi criada, mas o login imediato ainda não foi liberado pelo servidor.');
  }, []);

  const loginWithGoogle = useCallback(async () => {
    requireSupabase();
    if (!env.googleAuthEnabled) throw new Error('Login com Google ainda não foi habilitado neste ambiente.');

    const redirectTo = makeRedirectUri({ scheme: 'nightguide', path: 'auth/callback' });
    const { data, error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw new Error(error?.message || 'Não foi possível iniciar o login com Google.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      preferEphemeralSession: Platform.OS === 'ios',
    });
    if (result.type !== 'success') return;

    const callback = new URL(result.url);
    const code = callback.searchParams.get('code');
    const callbackError = callback.searchParams.get('error_description');
    if (callbackError) throw new Error(callbackError);

    if (code) {
      const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return;
    }

    const hash = new URLSearchParams(callback.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase!.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (sessionError) throw sessionError;
      return;
    }

    throw new Error('O Google não retornou uma sessão válida.');
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    requireSupabase();
    const redirectTo = makeRedirectUri({
      scheme: 'nightguide',
      path: 'auth/callback',
      queryParams: { next: '/auth/reset-password' },
    });
    const { error } = await supabase!.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    requireSupabase();
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    requireSupabase();
    if (!session?.user) throw new Error('Entre na sua conta novamente.');
    const fullName = input.fullName.trim();
    if (fullName.length < 2) throw new Error('Digite um nome válido.');

    const localProfile: Profile = {
      id: session.user.id,
      role: profile?.role || 'customer',
      fullName,
      avatarUrl: input.avatarPhoto?.uri || input.avatarUrl || profile?.avatarUrl,
    };
    setProfile(localProfile);
    await writeJson(scopedKey('nightguide:profile', session.user.id), localProfile);

    await queueOfflineAction({
      type: 'profile_updated',
      userId: session.user.id,
      entityId: session.user.id,
      payload: {
        fullName,
        avatarPhotoUri: input.avatarPhoto?.uri,
        avatarMimeType: input.avatarPhoto?.mimeType,
        avatarFileName: input.avatarPhoto?.fileName,
        avatarUrl: input.avatarUrl,
      },
    });

    if (await isNetworkReachable()) {
      const result = await syncOfflineActions();
      if (!result.failed) await loadProfile(session.user);
    }
  }, [loadProfile, profile?.avatarUrl, profile?.role, session?.user]);

  const logout = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const refreshProfile = useCallback(async () => loadProfile(session?.user ?? null), [loadProfile, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: hasSupabaseEnv,
      googleEnabled: env.googleAuthEnabled,
      session,
      user: session?.user ?? null,
      profile,
      login,
      register,
      loginWithGoogle,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      logout,
      refreshProfile,
    }),
    [login, loginWithGoogle, logout, profile, ready, refreshProfile, register, requestPasswordReset, session, updatePassword, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY para usar contas.');
  }
}

function normalizeRole(value: unknown): UserRole {
  return value === 'admin' || value === 'owner' || value === 'promoter' ? value : 'customer';
}
