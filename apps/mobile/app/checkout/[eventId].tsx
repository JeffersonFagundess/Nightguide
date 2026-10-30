import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Copy, CreditCard, Minus, Plus, QrCode, ShieldCheck, Ticket } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/src/components/button';
import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/state';
import { env } from '@/src/lib/env';
import { formatBRL, parsePrice } from '@/src/lib/storage';
import { demoCards, demoInstallments, splitDemoInstallments } from '@/src/lib/demo-card-checkout';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { useUserData } from '@/src/providers/user-data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';
import type { Ticket as TicketType } from '@/src/types';

type PixPayment = {
  id: string;
  status: string;
  qrCode?: string;
  qrCodeBase64?: string;
};

export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { getEvent } = useNightData();
  const { user, session } = useAuth();
  const { createTicket } = useUserData();
  const { language } = usePreferences();
  const t = checkoutCopy[language];
  const d = demoCopy[language];
  const event = getEvent(eventId);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [demoCardOpen, setDemoCardOpen] = useState(false);
  const [selectedDemoCardId, setSelectedDemoCardId] = useState<string>(demoCards[0].id);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [pixEmail, setPixEmail] = useState(user?.email ?? '');
  const [pixCpf, setPixCpf] = useState('12345678909');
  const [pixCopied, setPixCopied] = useState(false);

  if (!event) return <Screen contentStyle={styles.center}><EmptyState title={t.eventNotFound} text={t.eventNotFoundText} action={{ label: t.back, onPress: () => router.back() }} /></Screen>;
  if (!user) return <Screen contentStyle={styles.center}><EmptyState title={t.signInTitle} text={t.signInText} action={{ label: t.signIn, onPress: () => router.replace({ pathname: '/auth/login', params: { next: `/checkout/${eventId}` } }) }} /></Screen>;

  const unitAmount = parsePrice(event.price);
  const total = unitAmount * quantity;
  const isFree = unitAmount === 0;
  const selectedDemoCard = demoCards.find(card => card.id === selectedDemoCardId) ?? demoCards[0];
  const installmentPlan = splitDemoInstallments(total, installmentCount);
  const pixInactive = pixPayment?.status === 'rejected' || pixPayment?.status === 'cancelled';

  async function finish(label: string, provider: TicketType['provider'], paymentId?: string) {
    setLoading(true);
    setError('');
    try {
      const created = await createTicket(event!, quantity, label, provider, paymentId);
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
      let nextId = preferenceId;
      let nextUrl = checkoutUrl;
      if (!nextId || !nextUrl) {
        const response = await fetch(`${env.apiUrl}/api/payments/mercadopago/preference`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ eventId: event!.id, quantity }),
        });
        const data = (await response.json()) as { checkoutUrl?: string; preferenceId?: string; error?: string };
        if (!response.ok || !data.checkoutUrl || !data.preferenceId) throw new Error(data.error || t.checkoutMissing);
        nextId = data.preferenceId;
        nextUrl = data.checkoutUrl;
        setPreferenceId(nextId);
        setCheckoutUrl(nextUrl);
      }
      await WebBrowser.openBrowserAsync(nextUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
      await checkPayment(nextId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.paymentError);
    } finally {
      setLoading(false);
    }
  }

  async function checkPayment(id: string) {
    setLoading(true);
    setError('');
    try {
      if (!session?.access_token) throw new Error(t.sessionExpired);
      const response = await fetch(`${env.apiUrl}/api/payments/mercadopago/preference/${encodeURIComponent(id)}?eventId=${encodeURIComponent(event!.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await response.json()) as { status?: string; payment?: { id?: string }; error?: string };
      if (!response.ok) throw new Error(data.error || t.paymentError);
      if (data.status === 'approved' && data.payment?.id) {
        await finish(`Mercado Pago #${data.payment.id}`, 'mercadopago', data.payment.id);
      } else {
        setError(data.status === 'rejected' || data.status === 'cancelled' ? t.paymentRejected : t.paymentPending);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.paymentError);
    } finally {
      setLoading(false);
    }
  }

  async function createPix() {
    setLoading(true);
    setError('');
    try {
      if (!session?.access_token) throw new Error(t.sessionExpired);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixEmail.trim()) || pixCpf.length !== 11) throw new Error(d.pixPayerInvalid);
      const response = await fetch(`${env.apiUrl}/api/payments/mercadopago`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ method: 'pix', eventId: event!.id, quantity, payerEmail: pixEmail.trim(), identificationType: 'CPF', identificationNumber: pixCpf }),
      });
      const data = (await response.json()) as { payment?: PixPayment; error?: string };
      if (!response.ok || !data.payment?.id) throw new Error(data.error || d.pixCreateError);
      if (!data.payment.qrCode && !data.payment.qrCodeBase64) throw new Error(d.pixQrMissing);
      setPixCopied(false);
      setPixPayment(data.payment);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : d.pixCreateError);
    } finally {
      setLoading(false);
    }
  }

  async function checkPix() {
    if (!pixPayment) return;
    setLoading(true);
    setError('');
    try {
      if (!session?.access_token) throw new Error(t.sessionExpired);
      const response = await fetch(`${env.apiUrl}/api/payments/mercadopago/${encodeURIComponent(pixPayment.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await response.json()) as { payment?: PixPayment; error?: string };
      if (!response.ok || !data.payment) throw new Error(data.error || t.paymentError);
      if (data.payment.status === 'approved') {
        await finish(`${d.pixPaymentLabel} #${data.payment.id}`, 'mercadopago', data.payment.id);
      } else {
        setPixPayment({ ...pixPayment, ...data.payment, qrCode: data.payment.qrCode || pixPayment.qrCode, qrCodeBase64: data.payment.qrCodeBase64 || pixPayment.qrCodeBase64 });
        setError(data.payment.status === 'rejected' || data.payment.status === 'cancelled' ? d.pixRejected : d.pixPending);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t.paymentError);
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!pixPayment?.qrCode) return;
    try {
      await Clipboard.setStringAsync(pixPayment.qrCode);
      setPixCopied(true);
      setError('');
    } catch {
      setError(d.pixCopyError);
    }
  }

  if (ticket) {
    return (
      <Screen contentStyle={styles.successContent}>
        <CheckCircle2 size={54} color={colors.success} />
        <Text style={styles.successTitle}>{ticket.provider === 'demo' ? d.demoSuccessTitle : t.successTitle}</Text>
        <Text style={styles.successText}>{ticket.provider === 'demo' ? d.demoSuccessText : t.successText}</Text>
        <View style={styles.qr}>{ticket.provider === 'demo'
          ? <Text style={styles.demoSuccessMark}>DEMO</Text>
          : <QRCode value={ticket.id} size={174} color="#09090B" backgroundColor="#FFFFFF" />}</View>
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
          <Pressable disabled={quantity <= 1 || Boolean(preferenceId || pixPayment)} onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.quantityButton}><Minus size={20} color={colors.text} /></Pressable>
          <Text style={styles.quantity}>{quantity}</Text>
          <Pressable disabled={quantity >= 6 || Boolean(preferenceId || pixPayment)} onPress={() => setQuantity((value) => Math.min(6, value + 1))} style={styles.quantityButton}><Plus size={20} color={colors.text} /></Pressable>
        </View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>{t.total}</Text><Text style={styles.total}>{isFree ? t.free : formatBRL(total)}</Text></View>
      </View>

      <View style={styles.safe}><ShieldCheck size={19} color={colors.success} /><Text style={styles.safeText}>{t.security}</Text></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isFree ? (
        <Button label={t.freeTicket} icon={Ticket} onPress={() => void finish(t.freeTicketLabel, 'free')} loading={loading} />
      ) : (
        <View style={styles.actions}>
          {pixPayment ? (
            <View style={styles.pixPanel}>
              <Text style={styles.demoPanelTitle}>{d.pixTitle}</Text>
              {!pixInactive ? <Text style={styles.demoText}>{d.pixInstructions}</Text> : null}
              {!pixInactive ? <View style={styles.pixQr}>
                {pixPayment.qrCode
                  ? <QRCode value={pixPayment.qrCode} size={210} color="#09090B" backgroundColor="#FFFFFF" />
                  : <Image source={{ uri: `data:image/png;base64,${pixPayment.qrCodeBase64}` }} style={styles.pixQrImage} />}
              </View> : null}
              <Text style={styles.pixStatus}>{d.pixStatus}: {pixPayment.status === 'pending' ? d.pixPendingStatus : pixPayment.status}</Text>
              <Text style={styles.demoText}>{d.pixPaymentId}: {pixPayment.id}</Text>
              {!pixInactive && pixPayment.qrCode ? <Text selectable style={styles.pixCode}>{pixPayment.qrCode}</Text> : null}
              {!pixInactive && pixPayment.qrCode ? <Button label={pixCopied ? d.pixCopied : d.pixCopy} icon={Copy} variant="secondary" onPress={() => void copyPix()} /> : null}
              {pixInactive
                ? <Button label={d.pixRetry} onPress={() => { setPixPayment(null); setError(''); }} disabled={loading} />
                : <Button label={d.pixCheck} icon={CheckCircle2} onPress={() => void checkPix()} loading={loading} />}
              {!pixInactive ? <Text style={styles.demoText}>{d.pixPendingHint}</Text> : null}
            </View>
          ) : (
            <View style={styles.pixPanel}>
              <Text style={styles.demoPanelTitle}>{d.pixTitle}</Text>
              <TextInput value={pixEmail} onChangeText={setPixEmail} placeholder={d.pixEmail} placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.pixInput} accessibilityLabel={d.pixEmail} />
              <TextInput value={pixCpf} onChangeText={value => setPixCpf(value.replace(/\D/g, '').slice(0, 11))} placeholder={d.pixCpf} placeholderTextColor={colors.muted} keyboardType="number-pad" style={styles.pixInput} accessibilityLabel={d.pixCpf} />
              <Button label={d.pixGenerate} icon={QrCode} onPress={() => void createPix()} loading={loading} />
            </View>
          )}
          <Button label={t.openPayment} icon={CreditCard} onPress={() => void openMercadoPago()} loading={loading} />
          {preferenceId ? <Button label={t.checkPayment} icon={CheckCircle2} variant="secondary" onPress={() => void checkPayment(preferenceId)} loading={loading} /> : null}
          <Text style={styles.demoText}>{d.mpHint}</Text>
          <Button label={d.openDemoCards} icon={CreditCard} variant="secondary" onPress={() => { setError(''); setDemoCardOpen(open => !open); }} disabled={loading} />
          {demoCardOpen ? (
            <View style={styles.demoPanel}>
              <Text style={styles.demoEyebrow}>{d.demoBadge}</Text>
              <Text style={styles.demoPanelTitle}>{d.chooseCard}</Text>
              {demoCards.map(card => (
                <Pressable key={card.id} accessibilityRole="button" accessibilityState={{ selected: selectedDemoCardId === card.id }} onPress={() => setSelectedDemoCardId(card.id)} style={[styles.demoCard, selectedDemoCardId === card.id && styles.demoCardSelected]}>
                  <CreditCard size={19} color={colors.accent} />
                  <Text style={styles.demoCardName}>{card.brand}</Text>
                  <Text style={styles.demoCardDigits}>•••• {card.lastFour}</Text>
                  {selectedDemoCardId === card.id ? <CheckCircle2 size={18} color={colors.success} /> : null}
                </Pressable>
              ))}
              <Text style={styles.demoPanelTitle}>{d.chooseInstallments}</Text>
              <View style={styles.demoInstallmentRow}>
                {demoInstallments.map(count => (
                  <Pressable key={count} accessibilityRole="button" accessibilityState={{ selected: installmentCount === count }} onPress={() => setInstallmentCount(count)} style={[styles.demoInstallment, installmentCount === count && styles.demoInstallmentSelected]}>
                    <Text style={[styles.demoInstallmentText, installmentCount === count && styles.demoInstallmentTextSelected]}>{count}x</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.demoSummary}>{installmentCount === 1
                ? `${d.singlePayment} ${formatBRL(total)}`
                : `${d.firstInstallment} ${formatBRL(installmentPlan.first)} · ${installmentCount - 1} ${d.otherInstallments} ${formatBRL(installmentPlan.other)}`}</Text>
              <Text style={styles.demoText}>{d.noCharge}</Text>
              <Button label={d.completeDemo} onPress={() => void finish(`${t.demoPayment} · ${selectedDemoCard.brand} •••• ${selectedDemoCard.lastFour} · ${installmentCount}x ${d.noInterest}`, 'demo')} loading={loading} />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const checkoutCopy = {
  pt: { eventNotFound: 'Evento não encontrado', eventNotFoundText: 'Volte e escolha outro evento.', back: 'Voltar', signInTitle: 'Faça login para continuar', signInText: 'O ingresso fica vinculado à sua conta.', signIn: 'Entrar', ticketError: 'Não foi possível gerar o ingresso.', sessionExpired: 'Sua sessão expirou. Entre novamente.', checkoutMissing: 'O Mercado Pago não retornou o checkout.', paymentError: 'Não foi possível consultar o Mercado Pago.', paymentPending: 'Pagamento ainda não aprovado. Conclua o checkout e toque em Verificar pagamento.', paymentRejected: 'Pagamento recusado. Tente novamente no Mercado Pago.', successTitle: 'Ingresso gerado!', successText: 'Ele já está salvo em sua carteira NightGuide.', myTickets: 'Ver meus ingressos', keepExploring: 'Continuar explorando', eyebrow: 'CHECKOUT SEGURO', quantity: 'Quantidade', total: 'Total', free: 'Grátis', security: 'O Access Token do Mercado Pago permanece somente no servidor.', freeTicket: 'Gerar ingresso grátis', freeTicketLabel: 'Ingresso grátis', openPayment: 'Abrir Mercado Pago', checkPayment: 'Verificar pagamento', testHelp: 'Teste de cartão: Mastercard 5480 8328 0103 3311, Visa 4235 6477 2802 5682, Amex 3753 651535 56885 (CVV 1234). Validade 11/30; nome APRO e CPF 12345678909. Use comprador de teste diferente do vendedor.', simulate: 'Simular compra no ambiente de teste', demoPayment: 'Pagamento de demonstração', demoText: 'A simulação é identificada claramente e não realiza cobrança real.' },
  en: { eventNotFound: 'Event not found', eventNotFoundText: 'Go back and choose another event.', back: 'Back', signInTitle: 'Sign in to continue', signInText: 'The ticket will be linked to your account.', signIn: 'Sign in', ticketError: 'Unable to create the ticket.', sessionExpired: 'Your session expired. Sign in again.', checkoutMissing: 'Mercado Pago did not return the checkout.', paymentError: 'Unable to check Mercado Pago.', paymentPending: 'Payment is not approved yet. Complete checkout and tap Check payment.', paymentRejected: 'Payment declined. Try again in Mercado Pago.', successTitle: 'Ticket created!', successText: 'It is already saved in your NightGuide wallet.', myTickets: 'View my tickets', keepExploring: 'Keep exploring', eyebrow: 'SECURE CHECKOUT', quantity: 'Quantity', total: 'Total', free: 'Free', security: 'The Mercado Pago access token remains on the server only.', freeTicket: 'Get free ticket', freeTicketLabel: 'Free ticket', openPayment: 'Open Mercado Pago', checkPayment: 'Check payment', testHelp: 'Test cards: Mastercard 5480 8328 0103 3311, Visa 4235 6477 2802 5682, Amex 3753 651535 56885 (CVV 1234). Expiry 11/30; holder APRO, CPF 12345678909. Use a test buyer account different from the seller.', simulate: 'Simulate purchase in test mode', demoPayment: 'Demo payment', demoText: 'The simulation is clearly identified and does not make a real charge.' },
} as const;

const demoCopy = {
  pt: {
    pixTitle: 'Pagar com Pix',
    pixEmail: 'E-mail do comprador',
    pixCpf: 'CPF do comprador (11 dígitos)',
    pixPayerInvalid: 'Informe um e-mail válido e um CPF com 11 dígitos.',
    pixGenerate: 'Gerar QR code Pix',
    pixCreateError: 'Não foi possível gerar o Pix.',
    pixQrMissing: 'O Mercado Pago não retornou o QR code Pix.',
    pixInstructions: 'Escaneie o QR code em outro aparelho ou copie o código Pix.',
    pixStatus: 'Status',
    pixPaymentId: 'Pagamento',
    pixPendingStatus: 'Aguardando pagamento',
    pixCopy: 'Copiar código Pix',
    pixCopied: 'Código Pix copiado',
    pixCopyError: 'Não foi possível copiar o código Pix.',
    pixCheck: 'Verificar pagamento Pix',
    pixRetry: 'Gerar outro Pix',
    pixPendingHint: 'O ingresso só será liberado após o Mercado Pago confirmar o pagamento.',
    pixPending: 'Pix ainda não aprovado. Após pagar, toque em Verificar pagamento Pix.',
    pixRejected: 'Pix recusado ou cancelado pelo Mercado Pago.',
    pixPaymentLabel: 'Mercado Pago Pix',
    mpHint: 'Checkout oficial do Mercado Pago. Requer uma conta compradora de teste e os cartões oficiais de teste.',
    openDemoCards: 'Comprar com cartão fictício (DEMO)',
    demoBadge: 'SIMULAÇÃO · SEM COBRANÇA',
    chooseCard: 'Escolha um cartão fictício',
    chooseInstallments: 'Parcelamento sem juros',
    singlePayment: '1 parcela de',
    firstInstallment: '1ª parcela',
    otherInstallments: 'parcelas de',
    noInterest: 'sem juros',
    noCharge: 'Esta compra é apenas uma demonstração. Nenhum dado de cartão é enviado ao Mercado Pago e o ingresso não vale para entrada.',
    completeDemo: 'Concluir compra de demonstração',
    demoSuccessTitle: 'Simulação concluída',
    demoSuccessText: 'Ingresso de demonstração salvo neste aparelho. Não é válido para entrada no evento.',
  },
  en: {
    pixTitle: 'Pay with Pix',
    pixEmail: 'Buyer email',
    pixCpf: 'Buyer CPF (11 digits)',
    pixPayerInvalid: 'Enter a valid email and an 11-digit CPF.',
    pixGenerate: 'Generate Pix QR code',
    pixCreateError: 'Unable to generate Pix payment.',
    pixQrMissing: 'Mercado Pago did not return a Pix QR code.',
    pixInstructions: 'Scan the QR code on another device or copy the Pix code.',
    pixStatus: 'Status',
    pixPaymentId: 'Payment',
    pixPendingStatus: 'Awaiting payment',
    pixCopy: 'Copy Pix code',
    pixCopied: 'Pix code copied',
    pixCopyError: 'Unable to copy the Pix code.',
    pixCheck: 'Check Pix payment',
    pixRetry: 'Generate another Pix',
    pixPendingHint: 'A ticket is issued only after Mercado Pago confirms payment.',
    pixPending: 'Pix is not approved yet. After paying, tap Check Pix payment.',
    pixRejected: 'Pix payment was rejected or cancelled by Mercado Pago.',
    pixPaymentLabel: 'Mercado Pago Pix',
    mpHint: 'Official Mercado Pago checkout. Requires a test buyer account and official test cards.',
    openDemoCards: 'Buy with fictional card (DEMO)',
    demoBadge: 'SIMULATION · NO CHARGE',
    chooseCard: 'Choose a fictional card',
    chooseInstallments: 'Interest-free installments',
    singlePayment: '1 installment of',
    firstInstallment: '1st installment',
    otherInstallments: 'installments of',
    noInterest: 'no interest',
    noCharge: 'This purchase is a demonstration only. No card data is sent to Mercado Pago and the ticket is not valid for entry.',
    completeDemo: 'Complete demo purchase',
    demoSuccessTitle: 'Simulation complete',
    demoSuccessText: 'Demo ticket saved on this device. It is not valid for event entry.',
  },
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
  pixPanel: { gap: 11, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pixInput: { minHeight: 48, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.elevated },
  pixQr: { alignSelf: 'center', padding: 12, borderRadius: 15, backgroundColor: '#FFFFFF' },
  pixQrImage: { width: 210, height: 210 },
  pixStatus: { color: colors.text, fontWeight: '800', textAlign: 'center' },
  pixCode: { color: colors.muted, fontSize: 11, lineHeight: 16, padding: 10, borderRadius: 10, backgroundColor: colors.elevated },
  demoText: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 17 },
  testHelp: { color: colors.muted, fontSize: 12, lineHeight: 19, padding: 12, borderRadius: 12, backgroundColor: colors.surface },
  demoPanel: { gap: 10, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  demoEyebrow: { color: colors.warning, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  demoPanelTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 3 },
  demoCard: { minHeight: 52, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.elevated, flexDirection: 'row', alignItems: 'center', gap: 9 },
  demoCardSelected: { borderColor: colors.accent },
  demoCardName: { color: colors.text, fontWeight: '800', flex: 1 },
  demoCardDigits: { color: colors.muted, fontSize: 12 },
  demoInstallmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  demoInstallment: { minWidth: 50, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  demoInstallmentSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  demoInstallmentText: { color: colors.text, fontWeight: '800' },
  demoInstallmentTextSelected: { color: colors.ink },
  demoSummary: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  successContent: { alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: colors.text, fontSize: 31, fontWeight: '900', marginTop: 17 },
  successText: { color: colors.muted, textAlign: 'center', marginTop: 8 },
  qr: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 18, marginTop: 25 },
  demoSuccessMark: { width: 174, height: 174, textAlign: 'center', textAlignVertical: 'center', color: '#09090B', fontSize: 36, fontWeight: '900' },
  ticketCode: { color: colors.accent, fontSize: 13, fontWeight: '900', marginVertical: 17 },
  fullButton: { alignSelf: 'stretch', marginTop: 10 },
});
