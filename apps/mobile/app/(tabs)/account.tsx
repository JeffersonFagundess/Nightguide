import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Heart, Image as ImageIcon, MessageSquare, Pencil, Plus, QrCode, Settings, Store, Ticket, UserRound } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountPostsList, SavedEventsList } from '@/src/components/account-lists';
import { Brand } from '@/src/components/brand';
import { Button } from '@/src/components/button';
import { LanguageSwitch } from '@/src/components/language-switch';
import { ProfileAvatar } from '@/src/components/profile-avatar';
import { Screen } from '@/src/components/screen';
import { LoadingState } from '@/src/components/state';
import { ThemeSwitch } from '@/src/components/theme-switch';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';

const previewLimit = 3;

export default function AccountScreen() {
  const params = useLocalSearchParams<{ venueId?: string }>();
  const { ready, configured, user, profile } = useAuth();
  const { events } = useNightData();
  const { favoriteIds, tickets, reviews } = useUserData();
  const { language } = usePreferences();
  const t = { ...accountCopy[language], ...profileCopy[language] };
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const handledVenue = useRef<string | undefined>(undefined);
  const requestedVenueId = Array.isArray(params.venueId) ? params.venueId[0] : params.venueId;

  useEffect(() => {
    if (!ready || !user || !requestedVenueId || handledVenue.current === requestedVenueId) return;
    handledVenue.current = requestedVenueId;
    router.push({ pathname: '/account/post', params: { venueId: requestedVenueId } } as never);
  }, [ready, requestedVenueId, user]);

  if (!ready) return <LoadingState label={t.loading} />;

  if (!user) {
    return (
      <Screen contentStyle={styles.guestContent}>
        <View style={styles.guestTop}>
          <Brand />
          <View style={styles.guestPreferences}><ThemeSwitch /><LanguageSwitch /></View>
        </View>
        <View style={styles.guestHero}>
          <View style={styles.guestIcon}><UserRound size={30} color={colors.accent} /></View>
          <Text style={styles.guestTitle}>{t.guestTitle}</Text>
          <Text style={styles.guestText}>{t.guestText}</Text>
        </View>
        {!configured ? <View style={styles.notice}><Text style={styles.noticeText}>{t.configure}</Text></View> : null}
        <Button label={t.signInEmail} onPress={() => router.push('/auth/login')} />
        <Button label={t.createAccount} variant="secondary" onPress={() => router.push('/auth/register')} />
        <View style={styles.guestPublishCard}>
          <View style={styles.guestPublishIcon}><ImageIcon size={22} color={colors.accent} /></View>
          <View style={styles.guestPublishCopy}><Text style={styles.guestPublishTitle}>{t.photoPosts}</Text><Text style={styles.guestPublishText}>{t.photoPostsText}</Text></View>
        </View>
      </Screen>
    );
  }

  const savedEvents = events.filter((event) => favoriteIds.includes(event.id));
  const visibleEvents = showAllSaved ? savedEvents : savedEvents.slice(0, previewLimit);
  const visiblePosts = showAllPosts ? reviews : reviews.slice(0, previewLimit);
  const displayName = profile?.fullName || user.email || 'NightGuide';

  function openActivity(section: 'saved' | 'posts') {
    router.push({ pathname: '/account/activity', params: { section } } as never);
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.profileCard}>
        <View pointerEvents="none" style={styles.cover}>
          {profile?.coverLocalUri || profile?.coverUrl ? <Image source={{ uri: profile.coverLocalUri || profile.coverUrl }} resizeMode="cover" style={[StyleSheet.absoluteFill, styles.coverImage]} /> : <View style={styles.profileGlow} />}
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.profileTop}>
            <Pressable accessibilityRole="button" accessibilityLabel={t.editProfile} onPress={() => router.push('/account/edit-profile' as never)} style={styles.avatarFrame}><ProfileAvatar name={displayName} uri={profile?.avatarLocalUri || profile?.avatarUrl} size={80} /></Pressable>
            <View style={styles.profileTools}>
              <Pressable accessibilityRole="button" accessibilityLabel={t.cover} onPress={() => router.push('/account/edit-profile' as never)} style={styles.settingsButton}><ImageIcon size={20} color={colors.text} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t.settings} onPress={() => router.push('/account/settings' as never)} style={styles.settingsButton}>
                <Settings size={21} color={colors.text} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.eyebrow}>{profile?.role === 'owner' ? t.venue : t.myAccount}</Text>
          <Text numberOfLines={2} style={styles.title}>{t.hello}, {displayName.split(' ')[0]}</Text>
          <Text numberOfLines={1} style={styles.email}>{user.email}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : <Pressable accessibilityRole="button" onPress={() => router.push('/account/edit-profile' as never)}><Text style={styles.bioPrompt}>{t.addBio}</Text></Pressable>}
          <View style={styles.roleBadge}><Text style={styles.roleText}>{profile?.role === 'owner' ? t.owner : t.explorer}</Text></View>
          {profile?.pendingActionId ? <Text accessibilityLiveRegion="polite" style={styles.syncHint}>{profile.syncError ? t.pendingError : t.pending}</Text> : null}
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric icon={Heart} label={t.favorites} value={favoriteIds.length} onPress={() => openActivity('saved')} />
        <Metric icon={Ticket} label={t.tickets} value={tickets.length} onPress={() => router.push('/(tabs)/tickets')} />
        <Metric icon={MessageSquare} label={t.reviews} value={reviews.length} onPress={() => openActivity('posts')} />
      </View>

      <View style={styles.quickActions}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/account/post' as never)} style={[styles.quickAction, styles.quickActionPrimary]}>
          <View style={styles.quickIconPrimary}><Plus size={21} color={colors.ink} /></View>
          <Text style={styles.quickTitlePrimary}>{t.createPost}</Text>
          <Text style={styles.quickTextPrimary}>{t.createPostHint}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/account/edit-profile' as never)} style={styles.quickAction}>
          <View style={styles.quickIcon}><Pencil size={19} color={colors.accent} /></View>
          <Text style={styles.quickTitle}>{t.editProfile}</Text>
          <Text style={styles.quickText}>{t.editProfileHint}</Text>
        </Pressable>
      </View>

      {profile?.role === 'owner' ? (
        <View style={styles.ownerActions}>
          <Button label={t.manageVenue} icon={Store} onPress={() => router.push('/owner')} style={styles.flexButton} />
          <Button label={t.openScanner} icon={QrCode} variant="secondary" onPress={() => router.push('/scanner')} style={styles.flexButton} />
        </View>
      ) : null}

      <Section title={t.savedEvents} action={savedEvents.length > previewLimit ? (showAllSaved ? t.showLess : t.showAll) : undefined} onAction={() => setShowAllSaved((value) => !value)}>
        <SavedEventsList events={visibleEvents} />
      </Section>

      <Section title={t.myPosts} action={reviews.length > previewLimit ? (showAllPosts ? t.showLess : t.showAll) : undefined} onAction={() => setShowAllPosts((value) => !value)}>
        <AccountPostsList reviews={visiblePosts} />
      </Section>

      <Pressable accessibilityRole="button" onPress={() => router.push('/account/settings' as never)} style={styles.settingsRow}>
        <View style={styles.settingsRowIcon}><Settings size={20} color={colors.accent} /></View>
        <View style={styles.rowCopy}><Text style={styles.rowTitle}>{t.settings}</Text><Text style={styles.rowMeta}>{t.settingsHint}</Text></View>
        <ChevronRight size={19} color={colors.muted} />
      </Pressable>
    </Screen>
  );
}

function Metric({ icon: Icon, label, value, onPress }: { icon: typeof Heart; label: string; value: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => [styles.metric, pressed && styles.pressed]}><Icon size={18} color={colors.accent} /><Text style={styles.metricValue}>{value}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricLabel}>{label}</Text></Pressable>;
}

function Section({ title, action, onAction, children }: React.PropsWithChildren<{ title: string; action?: string; onAction?: () => void }>) {
  return <View style={styles.section}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View><View style={styles.sectionBody}>{children}</View></View>;
}

const accountCopy = {
  pt: { loading: 'Abrindo sua conta…', guestTitle: 'Sua noite, do seu jeito.', guestText: 'Entre para salvar eventos, comprar ingressos e compartilhar experiências com fotos — até mesmo offline.', configure: 'Preencha as variáveis do Supabase para habilitar cadastro e login reais.', signInEmail: 'Entrar com e-mail', createAccount: 'Criar conta', photoPosts: 'Publique mesmo sem internet', photoPostsText: 'O NightGuide salva sua foto e seu comentário no aparelho e envia tudo quando a conexão voltar.', venue: 'ESTABELECIMENTO', myAccount: 'MINHA CONTA', hello: 'Olá', owner: 'Perfil de estabelecimento', explorer: 'Explorador NightGuide', favorites: 'Favoritos', tickets: 'Ingressos', reviews: 'Avaliações', createPost: 'Criar publicação', createPostHint: 'Foto, nota e comentário', editProfile: 'Editar perfil', editProfileHint: 'Nome e foto', manageVenue: 'Gerenciar local', openScanner: 'Ler ingresso', savedEvents: 'Eventos salvos', savedEventsEmpty: 'Salve eventos na tela Descobrir para vê-los aqui.', myPosts: 'Minhas publicações', postsEmpty: 'Você ainda não publicou nenhuma experiência.', firstPost: 'Fazer primeira publicação', editPost: 'Editar publicação', deleteTitle: 'Excluir publicação?', deleteText: 'Ela será removida agora. Se você estiver offline, a exclusão será sincronizada depois.', cancel: 'Cancelar', delete: 'Excluir', showAll: 'Ver tudo', showLess: 'Mostrar menos', settings: 'Configurações', settingsHint: 'Perfil, aparência, idioma e conta' },
  en: { loading: 'Opening your account…', guestTitle: 'Your night, your way.', guestText: 'Sign in to save events, buy tickets and share photo experiences — even while offline.', configure: 'Add the Supabase environment variables to enable real sign-up and sign-in.', signInEmail: 'Sign in with email', createAccount: 'Create account', photoPosts: 'Post even while offline', photoPostsText: 'NightGuide saves your photo and review on the device, then uploads everything when your connection returns.', venue: 'VENUE', myAccount: 'MY ACCOUNT', hello: 'Hello', owner: 'Venue profile', explorer: 'NightGuide explorer', favorites: 'Favorites', tickets: 'Tickets', reviews: 'Reviews', createPost: 'Create post', createPostHint: 'Photo, rating and review', editProfile: 'Edit profile', editProfileHint: 'Name and photo', manageVenue: 'Manage venue', openScanner: 'Scan ticket', savedEvents: 'Saved events', savedEventsEmpty: 'Save events on Discover to see them here.', myPosts: 'My posts', postsEmpty: 'You have not shared an experience yet.', firstPost: 'Create first post', editPost: 'Edit post', deleteTitle: 'Delete post?', deleteText: 'It will be removed now. If you are offline, deletion will sync later.', cancel: 'Cancel', delete: 'Delete', showAll: 'View all', showLess: 'Show less', settings: 'Settings', settingsHint: 'Profile, appearance, language and account' },
} as const;

const profileCopy = {
  pt: { cover: 'Alterar capa do perfil', addBio: 'Adicione uma descrição sobre você', editProfileHint: 'Foto, capa e descrição', reviews: 'Publicações', pending: 'Perfil salvo no aparelho · aguardando envio', pendingError: 'O envio do perfil falhou · alterações preservadas no aparelho' },
  en: { cover: 'Change profile cover', addBio: 'Add a little about yourself', editProfileHint: 'Photo, cover and bio', reviews: 'Posts', pending: 'Profile saved on this device · waiting to sync', pendingError: 'Profile upload failed · changes are safe on this device' },
} as const;

const styles = StyleSheet.create({
  content: { paddingTop: 8 },
  guestContent: { justifyContent: 'center', gap: 12 },
  guestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  guestPreferences: { flex: 1, alignItems: 'flex-end', gap: 7 },
  guestHero: { marginTop: 22, marginBottom: 10 },
  guestIcon: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  guestTitle: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.2, marginTop: 18 },
  guestText: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 10 },
  guestPublishCard: { flexDirection: 'row', gap: 13, marginTop: 12, padding: 15, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  guestPublishIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  guestPublishCopy: { flex: 1 },
  guestPublishTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  guestPublishText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  notice: { borderWidth: 1, borderColor: 'rgba(255,203,102,0.4)', backgroundColor: 'rgba(255,203,102,0.08)', padding: 13, borderRadius: 13, marginBottom: 4 },
  noticeText: { color: colors.warning, fontSize: 13, lineHeight: 19 },
  profileCard: { overflow: 'hidden', position: 'relative', borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cover: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  coverImage: { opacity: 0.26 },
  profileInfo: { padding: 20 },
  profileTools: { flexDirection: 'row', gap: 8 },
  avatarFrame: { borderWidth: 4, borderColor: colors.surface, borderRadius: 46, backgroundColor: colors.surface },
  bio: { color: colors.text, fontSize: 14, lineHeight: 21, marginTop: 12 },
  bioPrompt: { color: colors.accent, fontSize: 12, marginTop: 12 },
  syncHint: { color: colors.warning, fontSize: 11, lineHeight: 17, marginTop: 12 },
  profileGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -105, right: -55, backgroundColor: 'rgba(226,255,84,0.09)' },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  settingsButton: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.elevated },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 17 },
  title: { color: colors.text, fontSize: 30, lineHeight: 35, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  email: { color: colors.muted, marginTop: 5 },
  roleBadge: { alignSelf: 'flex-start', marginTop: 13, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(226,255,84,0.10)' },
  roleText: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  metrics: { flexDirection: 'row', gap: 9, marginTop: 12 },
  metric: { flex: 1, minWidth: 0, minHeight: 92, padding: 12, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 6 },
  metricLabel: { color: colors.muted, fontSize: 10, marginTop: 1 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  quickAction: { flex: 1, minHeight: 144, padding: 15, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickActionPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  quickIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
  quickIconPrimary: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,9,11,0.12)' },
  quickTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 13 },
  quickTitlePrimary: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 13 },
  quickText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  quickTextPrimary: { color: 'rgba(17,18,7,0.70)', fontSize: 11, lineHeight: 16, marginTop: 4 },
  ownerActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flexButton: { flex: 1 },
  section: { marginTop: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 11 },
  sectionTitle: { flex: 1, color: colors.text, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  sectionAction: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  sectionBody: { gap: 10 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontWeight: '900' },
  rowMeta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  settingsRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  settingsRowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.10)' },
});
