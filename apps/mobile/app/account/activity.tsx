import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPostsList, SavedEventsList } from '@/src/components/account-lists';
import { Button } from '@/src/components/button';
import { Screen } from '@/src/components/screen';
import { LoadingState } from '@/src/components/state';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { colors } from '@/src/theme';

export default function AccountActivityScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const saved = section === 'saved';
  const { ready: authReady, user } = useAuth();
  const { ready, favoriteIds, reviews } = useUserData();
  const { events } = useNightData();
  const { language } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  const savedEvents = events.filter((event) => favoriteIds.includes(event.id));
  const total = saved ? savedEvents.length : reviews.length;

  useEffect(() => { if (authReady && !user) router.replace('/auth/login'); }, [authReady, user?.id]);
  if (!authReady || !ready || !user) return <LoadingState label={language === 'pt' ? 'Carregando…' : 'Loading…'} />;

  return <Screen contentStyle={styles.content}>
    <Text style={styles.eyebrow}>{language === 'pt' ? 'SUA ATIVIDADE' : 'YOUR ACTIVITY'}</Text>
    <Text style={styles.title}>{saved ? language === 'pt' ? 'Meus favoritos' : 'My favorites' : language === 'pt' ? 'Minhas publicações' : 'My posts'}</Text>
    <Text style={styles.subtitle}>{saved ? language === 'pt' ? 'Os eventos que você curtiu e salvou.' : 'The events you liked and saved.' : language === 'pt' ? 'Suas fotos, avaliações e experiências.' : 'Your photos, ratings and experiences.'}</Text>
    <View style={styles.list}>{saved ? <SavedEventsList events={expanded ? savedEvents : savedEvents.slice(0, 5)} /> : <AccountPostsList reviews={expanded ? reviews : reviews.slice(0, 5)} />}</View>
    {total > 5 ? <Button variant="secondary" label={expanded ? language === 'pt' ? 'Mostrar menos' : 'Show less' : language === 'pt' ? 'Ver tudo' : 'Show all'} onPress={() => setExpanded((value) => !value)} style={styles.more} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 14 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 8, letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  list: { marginTop: 24 },
  more: { marginTop: 16 },
});
