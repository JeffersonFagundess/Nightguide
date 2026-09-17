import type { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { env, hasSupabaseEnv } from '@/src/lib/env';
import { getOfflineActions, isNetworkReachable, onOfflineQueueChange, queueOfflineAction, syncOfflineActions } from '@/src/lib/offline-sync';
import { profileFromRemote, withProfileCacheLock } from '@/src/lib/profile-data';
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
  bio?: string;
  avatarPhoto?: LocalReviewPhoto;
  avatarUrl?: string;
  coverPhoto?: LocalReviewPhoto;
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
  updateProfile: (input: UpdateProfileInput) => Promise<{ synced: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileRequest = useRef(0);

  const loadProfile = useCallback(async (user: User | null) => {
    const request = ++profileRequest.current;
    if (!user || !supabase) {
      setProfile(null);
      return;
    }

    const profileKey = scopedKey('nightguide:profile', user.id);
    const cached = await readJson<Profile | null>(profileKey, null);
    if (request !== profileRequest.current) return;
    setProfile(cached || {
      id: user.id,
      fullName: user.user_metadata?.full_name || user.email || 'NightGuide',
      avatarUrl: user.user_metadata?.avatar_url || undefined,
      coverUrl: user.user_metadata?.cover_url || undefined,
      bio: user.user_metadata?.bio || '',
      role: normalizeRole(user.user_metadata?.role),
    });

    if (!(await isNetworkReachable())) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,avatar_url,cover_url,bio,role')
      .eq('id', user.id)
      .maybeSingle();

    await withProfileCacheLock(async () => {
      const latest = await readJson<Profile | null>(profileKey, null);
      const pending = (await getOfflineActions()).find((action) => action.type === 'profile_updated' && action.userId === user.id);
      if (request !== profileRequest.current) return;
      if (error || !data) {
        if (latest) setProfile({ ...latest, syncError: pending?.lastError });
        return;
      }
      const nextProfile = profileFromRemote({
        id: user.id,
        fullName: data.full_name || user.email || 'NightGuide',
        avatarUrl: data.avatar_url || undefined,
        coverUrl: data.cover_url || undefined,
        bio: data.bio || '',
        role: normalizeRole(data.role),
      }, latest, pending);
      setProfile(nextProfile);
      await writeJson(profileKey, nextProfile);
    });
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    return onOfflineQueueChange(() => { void loadProfile(session.user); });
  }, [loadProfile, session?.user]);

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
    const user = session?.user;
    if (!user) throw new Error('Entre na sua conta novamente.');
    const fullName = input.fullName.trim();
    if (fullName.length < 2) throw new Error('Digite um nome válido.');
    if ((input.bio?.trim().length || 0) > 300) throw new Error('Use até 300 caracteres na descrição.');
    ++profileRequest.current;
    const actionId = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = scopedKey('nightguide:profile', user.id);
    await withProfileCacheLock(async () => {
      const current = await readJson<Profile | null>(key, profile);
      const localProfile: Profile = {
        ...current,
        id: user.id,
        role: current?.role || 'customer',
        fullName,
        bio: input.bio === undefined ? current?.bio || '' : input.bio.trim(),
        avatarLocalUri: input.avatarPhoto?.uri || (input.avatarUrl ? undefined : current?.avatarLocalUri),
        coverLocalUri: input.coverPhoto?.uri || current?.coverLocalUri,
        avatarUrl: input.avatarUrl || current?.avatarUrl,
        pendingActionId: actionId,
        syncError: undefined,
      };
      await writeJson(key, localProfile);
      try {
        await queueOfflineAction({
          id: actionId,
          type: 'profile_updated',
          userId: user.id,
          entityId: user.id,
          payload: {
            fullName,
            bio: localProfile.bio,
            ...(input.avatarPhoto ? { avatarPhotoUri: input.avatarPhoto.uri, avatarMimeType: input.avatarPhoto.mimeType, avatarFileName: input.avatarPhoto.fileName } : {}),
            ...(input.coverPhoto ? { coverPhotoUri: input.coverPhoto.uri, coverMimeType: input.coverPhoto.mimeType, coverFileName: input.coverPhoto.fileName } : {}),
            ...(input.avatarUrl && /^https?:\/\//.test(input.avatarUrl) ? { avatarUrl: input.avatarUrl } : {}),
          },
        });
      } catch (error) {
        await writeJson(key, current);
        throw error;
      }
      setProfile(localProfile);
    });
    if (await isNetworkReachable()) {
      await syncOfflineActions();
      const remaining = (await getOfflineActions()).find((action) => action.id === actionId);
      if (remaining && remaining.attempts === 0) await syncOfflineActions();
      await loadProfile(user);
    }
    const pending = (await getOfflineActions()).find((action) => action.type === 'profile_updated' && action.userId === user.id);
    return { synced: !pending, error: pending?.lastError };
  }, [loadProfile, profile, session?.user]);

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
