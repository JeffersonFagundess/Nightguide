import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, CreditCard, Minus, Plus, ShieldCheck, Ticket } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/src/components/button';
import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/state';
import { env } from '@/src/lib/env';
import { formatBRL, parsePrice } from '@/src/lib/storage';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';
import type { Ticket as TicketType } from '@/src/types';

export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { getEvent } = useNightData();
  const { user, session } = useAuth();
  const { createTicket } = useUserData();
  const { language } = usePreferences();
  const t = checkoutCopy[language];
  const event = getEvent(eventId);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [checkoutOpened, setCheckoutOpened] = useState(false);

  if (!event) return <Screen contentStyle={styles.center}><EmptyState title={t.eventNotFound} text={t.eventNotFoundText} action={{ label: t.back, onPress: () => router.back() }} /></Screen>;
  if (!user) return <Screen contentStyle={styles.center}><EmptyState title={t.signInTitle} text={t.signInText} action={{ label: t.signIn, onPress: () => router.replace({ pathname: '/auth/login', params: { next: `/checkout/${eventId}` } }) }} /></Screen>;

  const unitAmount = parsePrice(event.price);
  const total = unitAmount * quantity;
  const isFree = unitAmount === 0;

  async function finish(label: string, provider: TicketType['provider']) {
    setLoading(true);
    setError('');
    try {
      const created = await createTicket(event!, quantity, label, provider);
      setTicket(created);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.ticketError);
    } finally {
      setLoading(false);
    }
  }

  async function openMercadoPago() {
    setLoading(true);
    setError('');
    try {
      if (!session?.access_token) throw new Error(t.sessionExpired);
      const response = await fetch(`${env.apiUrl}/api/payments/mercadopago/preference`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ eventId: event!.id, quantity }),
      });
      const data = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || t.checkoutMissing);
      setCheckoutOpened(true);
      await WebBrowser.openBrowserAsync(data.checkoutUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.paymentError);
    } finally {
      setLoading(false);
    }
  }

  if (ticket) {
    return (
      <Screen contentStyle={styles.successContent}>
        <CheckCircle2 size={54} color={colors.success} />
        <Text style={styles.successTitle}>{t.successTitle}</Text>
        <Text style={styles.successText}>{t.successText}</Text>
        <View style={styles.qr}><QRCode value={ticket.id} size={174} color="#09090B" backgroundColor="#FFFFFF" /></View>
        <Text style={styles.ticketCode}>{ticket.id}</Text>
        <Button label={t.myTickets} icon={Ticket} onPress={() => router.replace('/(tabs)/tickets')} style={styles.fullButton} />
        <Button label={t.keepExploring} variant="secondary" onPress={() => router.replace('/(tabs)')} style={styles.fullButton} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.eyebrow}>{t.eyebrow}</Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.meta}>{event.date} • {event.time} • {event.venue}</Text>

      <View style={styles.panel}>
        <Text style={styles.label}>{t.quantity}</Text>
        <View style={styles.quantityRow}>
          <Pressable disabled={quantity <= 1} onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.quantityButton}><Minus size={20} color={colors.text} /></Pressable>
          <Text style={styles.quantity}>{quantity}</Text>
          <Pressable disabled={quantity >= 6} onPress={() => setQuantity((value) => Math.min(6, value + 1))} style={styles.quantityButton}><Plus size={20} color={colors.text} /></Pressable>
        </View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>{t.total}</Text><Text style={styles.total}>{isFree ? t.free : formatBRL(total)}</Text></View>
      </View>

      <View style={styles.safe}><ShieldCheck size={19} color={colors.success} /><Text style={styles.safeText}>{t.security}</Text></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isFree ? (
        <Button label={t.freeTicket} icon={Ticket} onPress={() => void finish(t.freeTicketLabel, 'free')} loading={loading} />
      ) : (
        <View style={styles.actions}>
          <Button label={t.openPayment} icon={CreditCard} onPress={() => void openMercadoPago()} loading={loading} />
          {checkoutOpened ? <Button label={t.testPaymentDone} icon={CheckCircle2} variant="secondary" onPress={() => void finish('Mercado Pago Checkout', 'mercadopago')} loading={loading} /> : null}
          <Button label={t.simulate} variant="secondary" onPress={() => void finish(t.demoPayment, 'demo')} loading={loading} />
          <Text style={styles.demoText}>{t.demoText}</Text>
        </View>
      )}
    </Screen>
  );
}

const checkoutCopy = {
  pt: { eventNotFound: 'Evento não encontrado', eventNotFoundText: 'Volte e escolha outro evento.', back: 'Voltar', signInTitle: 'Faça login para continuar', signInText: 'O ingresso fica vinculado à sua conta.', signIn: 'Entrar', ticketError: 'Não foi possível gerar o ingresso.', sessionExpired: 'Sua sessão expirou. Entre novamente.', checkoutMissing: 'O Mercado Pago não retornou o checkout.', paymentError: 'Não foi possível abrir o Mercado Pago.', successTitle: 'Ingresso gerado!', successText: 'Ele já está salvo em sua carteira NightGuide.', myTickets: 'Ver meus ingressos', keepExploring: 'Continuar explorando', eyebrow: 'CHECKOUT SEGURO', quantity: 'Quantidade', total: 'Total', free: 'Grátis', security: 'O Access Token do Mercado Pago permanece somente no servidor.', freeTicket: 'Gerar ingresso grátis', freeTicketLabel: 'Ingresso grátis', openPayment: 'Abrir Mercado Pago', testPaymentDone: 'Pagamento teste concluído', simulate: 'Simular compra no ambiente de teste', demoPayment: 'Pagamento de demonstração', demoText: 'A simulação é identificada claramente e não realiza cobrança real.' },
  en: { eventNotFound: 'Event not found', eventNotFoundText: 'Go back and choose another event.', back: 'Back', signInTitle: 'Sign in to continue', signInText: 'The ticket will be linked to your account.', signIn: 'Sign in', ticketError: 'Unable to create the ticket.', sessionExpired: 'Your session expired. Sign in again.', checkoutMissing: 'Mercado Pago did not return the checkout.', paymentError: 'Unable to open Mercado Pago.', successTitle: 'Ticket created!', successText: 'It is already saved in your NightGuide wallet.', myTickets: 'View my tickets', keepExploring: 'Keep exploring', eyebrow: 'SECURE CHECKOUT', quantity: 'Quantity', total: 'Total', free: 'Free', security: 'The Mercado Pago access token remains on the server only.', freeTicket: 'Get free ticket', freeTicketLabel: 'Free ticket', openPayment: 'Open Mercado Pago', testPaymentDone: 'Test payment completed', simulate: 'Simulate purchase in test mode', demoPayment: 'Demo payment', demoText: 'The simulation is clearly identified and does not make a real charge.' },
} as const;

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginTop: 14 },
  title: { color: colors.text, fontSize: 33, lineHeight: 37, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  meta: { color: colors.muted, lineHeight: 21, marginTop: 8 },
  panel: { padding: 18, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: 24 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12 },
  quantityButton: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  quantity: { color: colors.text, fontSize: 26, fontWeight: '900', minWidth: 30, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 18 },
  totalLabel: { color: colors.muted, fontWeight: '700' },
  total: { color: colors.accent, fontSize: 19, fontWeight: '900' },
  safe: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 18 },
  safeText: { color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  error: { color: colors.rose, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,107,131,0.09)', marginBottom: 14 },
  actions: { gap: 11 },
  demoText: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 17 },
  successContent: { alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: colors.text, fontSize: 31, fontWeight: '900', marginTop: 17 },
  successText: { color: colors.muted, textAlign: 'center', marginTop: 8 },
  qr: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 18, marginTop: 25 },
  ticketCode: { color: colors.accent, fontSize: 13, fontWeight: '900', marginVertical: 17 },
  fullButton: { alignSelf: 'stretch', marginTop: 10 },
});
