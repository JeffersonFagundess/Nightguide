import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Network from 'expo-network';
import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { ProfileAvatar } from '@/src/components/profile-avatar';
import { Screen } from '@/src/components/screen';
import { EmptyState, LoadingState } from '@/src/components/state';
import { publicProfileFromOwn } from '@/src/lib/public-profile-data';
import { fetchPublicProfile, readCachedPublicProfile } from '@/src/lib/public-profiles';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';
import type { PublicProfile } from '@/src/types';

export default function PublicProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { profile: ownProfile } = useAuth();
  const { language } = usePreferences();
  const t = copy[language];
  const [remote, setRemote] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [retry, setRetry] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    let busy = false;
    setRemote(null);
    const load = async () => {
      if (busy) return;
      busy = true;
      if (active) setLoading(true);
      try {
        const cached = await readCachedPublicProfile(id);
        if (active) setRemote(cached);
        const next = await fetchPublicProfile(id);
        if (active) { setRemote(next); setUnavailable(false); }
      } catch {
        if (active) setUnavailable(true);
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const network = Network.addNetworkStateListener(state => { if (state.isConnected) void load(); });
    return () => { active = false; network.remove(); };
  }, [id, retry]));

  // Own pending edits appear immediately, without copying private account fields.
  const profile = ownProfile && ownProfile.id === id ? publicProfileFromOwn(ownProfile) : remote;
  const cover = profile?.coverLocalUri || profile?.coverUrl;
  if (!profile) return <Screen contentStyle={styles.center}>
    {loading ? <LoadingState label={t.loading} /> : <EmptyState
      title={unavailable ? t.unavailable : t.notFound}
      text={unavailable ? t.needConnection : t.notFoundText}
      action={{ label: t.retry, onPress: () => setRetry(value => value + 1) }} />}
  </Screen>;

  return <Screen contentStyle={styles.content}>
    <View style={styles.card}>
      {cover ? <Image source={{ uri: cover }} resizeMode="cover" style={styles.cover} /> : <View pointerEvents="none" style={styles.glow} />}
      <View style={styles.details}>
        <ProfileAvatar name={profile.fullName} uri={profile.avatarLocalUri || profile.avatarUrl} size={88} />
        <Text style={styles.eyebrow}>{t.publicProfile}</Text>
        <Text selectable style={styles.name}>{profile.fullName}</Text>
        <Text selectable style={styles.bio}>{profile.bio?.trim() || t.noBio}</Text>
      </View>
    </View>
    {unavailable ? <View style={styles.status}>
      <Text style={styles.note}>{t.cached}</Text>
      <Button label={t.retry} variant="secondary" onPress={() => setRetry(value => value + 1)} />
    </View> : loading ? <Text style={styles.note}>{t.updating}</Text> : null}
  </Screen>;
}

const copy = {
  pt: { publicProfile: 'PERFIL PÚBLICO', loading: 'Carregando perfil…', updating: 'Atualizando perfil…', noBio: 'Esta pessoa ainda não adicionou uma descrição.', cached: 'Sem atualização agora. Mostrando o perfil salvo neste aparelho.', unavailable: 'Perfil indisponível agora', needConnection: 'Conecte-se à internet para abrir este perfil pela primeira vez. Depois ele ficará salvo para consulta offline.', notFound: 'Perfil não encontrado', notFoundText: 'Este perfil não está mais disponível.', retry: 'Tentar novamente' },
  en: { publicProfile: 'PUBLIC PROFILE', loading: 'Loading profile…', updating: 'Updating profile…', noBio: 'This person has not added a bio yet.', cached: 'Unable to update. Showing the profile saved on this device.', unavailable: 'Profile unavailable right now', needConnection: 'Connect to the internet to open this profile for the first time. It will then be saved for offline viewing.', notFound: 'Profile not found', notFoundText: 'This profile is no longer available.', retry: 'Try again' },
} as const;

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingTop: 12, paddingBottom: 40, gap: 16 },
  card: { overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cover: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '100%', height: '100%', opacity: 0.26 },
  glow: { position: 'absolute', right: -60, top: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(226,255,84,0.10)' },
  details: { padding: 24, gap: 16, alignItems: 'flex-start' },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 8 },
  name: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.7, width: '100%' },
  bio: { color: colors.text, fontSize: 15, lineHeight: 23, width: '100%' },
  status: { gap: 12 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
