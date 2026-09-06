import * as Network from 'expo-network';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import {
  migrateLegacyOfflineQueue,
  getPendingOfflineActionCount,
  isNetworkReachable,
  onOfflineQueueChange,
  syncOfflineActions,
} from '@/src/lib/offline-sync';
import { useAuth } from '@/src/providers/auth-provider';
import { colors } from '@/src/theme';

export function OfflineSyncStatus() {
  const { user } = useAuth();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [sent, setSent] = useState(0);
  const mounted = useRef(true);

  const refresh = useCallback(
    async (trySync: boolean) => {
      const reachable = await isNetworkReachable();
      if (!mounted.current) return;
      setOnline(reachable);

      if (trySync && reachable && user) {
        setSyncing(true);
        const result = await syncOfflineActions();
        if (!mounted.current) return;
        setSyncing(false);
        if (result.synced > 0) setSent(result.synced);
      }

      const count = await getPendingOfflineActionCount(user?.id);
      if (mounted.current) setPending(count);
    },
    [user],
  );

  useEffect(() => {
    mounted.current = true;
    void migrateLegacyOfflineQueue().then(() => refresh(true));

    const queueSubscription = onOfflineQueueChange(() => void refresh(false));
    const networkSubscription = Network.addNetworkStateListener((state) => {
      const reachable = state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(reachable);
      if (reachable) void refresh(true);
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh(true);
    });

    return () => {
      mounted.current = false;
      queueSubscription();
      networkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => setSent(0), 3500);
    return () => clearTimeout(timer);
  }, [sent]);

  if (online && pending === 0 && sent === 0) return null;

  const Icon = online ? (syncing ? RefreshCw : Cloud) : CloudOff;
  const message = sent
    ? `${sent} ${sent === 1 ? 'alteração enviada' : 'alterações enviadas'}`
    : !online
      ? pending > 0
        ? `Offline • ${pending} ${pending === 1 ? 'alteração salva' : 'alterações salvas'}`
        : 'Modo offline • suas ações ficam salvas no aparelho'
      : syncing
        ? `Enviando ${pending} ${pending === 1 ? 'alteração' : 'alterações'}…`
        : `${pending} ${pending === 1 ? 'alteração aguardando envio' : 'alterações aguardando envio'}`;

  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <View accessibilityLiveRegion="polite" style={styles.banner}>
        <Icon color={colors.accent} size={17} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 12, right: 12, bottom: 82, alignItems: 'center' },
  banner: {
    maxWidth: 430,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(20,20,22,0.96)',
  },
  text: { color: colors.text, fontSize: 12, fontWeight: '800', flexShrink: 1 },
});
