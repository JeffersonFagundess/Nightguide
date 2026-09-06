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
import { colors } from '@/src/theme';
import type { Ticket } from '@/src/types';

export default function TicketsScreen() {
  const { ready: authReady, user } = useAuth();
  const { ready, tickets, cancelTicket } = useUserData();

  if (!authReady || !ready) return <LoadingState label="Carregando seus ingressos…" />;

  if (!user) {
    return (
      <Screen contentStyle={styles.centerContent}>
        <EmptyState
          icon={TicketIcon}
          title="Entre para ver seus ingressos"
          text="Crie uma conta normal com e-mail e senha ou use o Google quando ele estiver configurado."
          action={{ label: 'Entrar', onPress: () => router.push('/auth/login') }}
        />
        <Button label="Criar minha conta" variant="secondary" onPress={() => router.push('/auth/register')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}><Text style={styles.eyebrow}>CARTEIRA DIGITAL</Text><Text style={styles.title}>Meus ingressos</Text></View>
        <LanguageSwitch />
      </View>
      <Text style={styles.subtitle}>Apresente o QR Code na entrada do evento.</Text>

      <View style={styles.list}>
        {tickets.length ? tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onRemove={() => Alert.alert('Remover ingresso?', 'Esta ação remove o ingresso deste aparelho.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Remover', style: 'destructive', onPress: () => void cancelTicket(ticket.id) },
            ])}
          />
        )) : (
          <EmptyState
            icon={QrCode}
            title="Nenhum ingresso ainda"
            text="Escolha um evento e conclua o checkout de teste. O ingresso aparecerá aqui."
            action={{ label: 'Descobrir eventos', onPress: () => router.navigate('/(tabs)') }}
          />
        )}
      </View>
    </Screen>
  );
}

function TicketCard({ ticket, onRemove }: { ticket: Ticket; onRemove: () => void }) {
  return (
    <View style={styles.ticket}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketCopy}>
          <Text style={styles.ticketTag}>INGRESSO APROVADO</Text>
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
        <Pressable accessibilityLabel="Remover ingresso" hitSlop={8} onPress={onRemove} style={styles.trash}>
          <Trash2 size={18} color={colors.rose} />
        </Pressable>
      </View>
    </View>
  );
}

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
