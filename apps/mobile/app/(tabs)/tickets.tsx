import { router } from 'expo-router';
import { QrCode, Ticket as TicketIcon, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/src/components/button';
import { LanguageSwitch } from '@/src/components/language-switch';
import { Screen } from '@/src/components/screen';
import { EmptyState, LoadingState } from '@/src/components/state';
import { formatBRL } from '@/src/lib/storage';
import { useAuth } from '@/src/providers/auth-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';
import type { Ticket } from '@/src/types';

export default function TicketsScreen() {
  const { ready: authReady, user } = useAuth();
  const { ready, tickets, cancelTicket } = useUserData();
  const { language } = usePreferences();
  const t = ticketCopy[language];

  if (!authReady || !ready) return <LoadingState label={t.loading} />;

  if (!user) {
    return (
      <Screen contentStyle={styles.centerContent}>
        <EmptyState
          icon={TicketIcon}
          title={t.signInTitle}
          text={t.signInText}
          action={{ label: t.signIn, onPress: () => router.push('/auth/login') }}
        />
        <Button label={t.createAccount} variant="secondary" onPress={() => router.push('/auth/register')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}><Text style={styles.eyebrow}>{t.eyebrow}</Text><Text style={styles.title}>{t.title}</Text></View>
        <LanguageSwitch />
      </View>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.list}>
        {tickets.length ? tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            language={language}
            onRemove={() => Alert.alert(t.removeTitle, t.removeText, [
              { text: t.cancel, style: 'cancel' },
              { text: t.remove, style: 'destructive', onPress: () => void cancelTicket(ticket.id) },
            ])}
          />
        )) : (
          <EmptyState
            icon={QrCode}
            title={t.emptyTitle}
            text={t.emptyText}
            action={{ label: t.discover, onPress: () => router.navigate('/(tabs)') }}
          />
        )}
      </View>
    </Screen>
  );
}

function TicketCard({ ticket, onRemove, language }: { ticket: Ticket; onRemove: () => void; language: 'pt' | 'en' }) {
  return (
    <View style={styles.ticket}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketCopy}>
          <Text style={styles.ticketTag}>{language === 'pt' ? 'INGRESSO APROVADO' : 'APPROVED TICKET'}</Text>
          <Text style={styles.ticketTitle}>{ticket.eventTitle}</Text>
          <Text style={styles.ticketMeta}>{ticket.venue}</Text>
          <Text style={styles.ticketMeta}>{ticket.date} • {ticket.time} • {ticket.quantity}x</Text>
        </View>
        <View style={styles.qr}><QRCode value={ticket.id} size={86} backgroundColor="#FFFFFF" color="#09090B" /></View>
      </View>
      <View style={styles.dash} />
      <View style={styles.ticketFooter}>
        <View>
          <Text style={styles.code}>{ticket.id}</Text>
          <Text style={styles.payment}>{ticket.paymentLabel} • {formatBRL(ticket.totalAmount)}</Text>
        </View>
        <Pressable accessibilityLabel={language === 'pt' ? 'Remover ingresso' : 'Remove ticket'} hitSlop={8} onPress={onRemove} style={styles.trash}>
          <Trash2 size={18} color={colors.rose} />
        </Pressable>
      </View>
    </View>
  );
}

const ticketCopy = {
  pt: { loading: 'Carregando seus ingressos…', signInTitle: 'Entre para ver seus ingressos', signInText: 'Crie uma conta normal com e-mail e senha ou use o Google quando ele estiver configurado.', signIn: 'Entrar', createAccount: 'Criar minha conta', eyebrow: 'CARTEIRA DIGITAL', title: 'Meus ingressos', subtitle: 'Apresente o QR Code na entrada do evento.', removeTitle: 'Remover ingresso?', removeText: 'Esta ação remove o ingresso deste aparelho.', cancel: 'Cancelar', remove: 'Remover', emptyTitle: 'Nenhum ingresso ainda', emptyText: 'Escolha um evento e conclua o checkout de teste. O ingresso aparecerá aqui.', discover: 'Descobrir eventos' },
  en: { loading: 'Loading your tickets…', signInTitle: 'Sign in to see your tickets', signInText: 'Create an account with email and password, or use Google when available.', signIn: 'Sign in', createAccount: 'Create my account', eyebrow: 'DIGITAL WALLET', title: 'My tickets', subtitle: 'Show the QR code at the event entrance.', removeTitle: 'Remove ticket?', removeText: 'This removes the ticket from this device.', cancel: 'Cancel', remove: 'Remove', emptyTitle: 'No tickets yet', emptyText: 'Choose an event and complete the test checkout. Your ticket will appear here.', discover: 'Discover events' },
} as const;

const styles = StyleSheet.create({
  centerContent: { justifyContent: 'center', gap: 12 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 14 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: colors.muted, marginTop: 8, lineHeight: 21 },
  list: { gap: 14, marginTop: 24 },
  ticket: { backgroundColor: colors.surface, borderRadius: 19, borderWidth: 1, borderColor: colors.border, padding: 17 },
  ticketHeader: { flexDirection: 'row', gap: 14 },
  ticketCopy: { flex: 1 },
  ticketTag: { color: colors.success, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  ticketTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 7 },
  ticketMeta: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  qr: { backgroundColor: '#FFFFFF', padding: 7, borderRadius: 10 },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.border, marginVertical: 16 },
  ticketFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  code: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  payment: { color: colors.muted, fontSize: 11, marginTop: 4 },
  trash: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,107,131,0.10)', alignItems: 'center', justifyContent: 'center' },
});
