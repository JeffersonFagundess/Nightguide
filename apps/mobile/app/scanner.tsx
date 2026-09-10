import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { CheckCircle2, QrCode, ScanLine, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { Screen } from '@/src/components/screen';
import { EmptyState } from '@/src/components/state';
import { useAuth } from '@/src/providers/auth-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

export default function ScannerScreen() {
  const { profile } = useAuth();
  const { language } = usePreferences();
  const t = scannerCopy[language];
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<string | null>(null);

  if (profile?.role !== 'owner' && profile?.role !== 'admin') {
    return <Screen contentStyle={styles.center}><EmptyState title={t.accessTitle} text={t.accessText} action={{ label: t.back, onPress: () => router.back() }} /></Screen>;
  }

  if (!permission) return <Screen contentStyle={styles.center}><Text style={styles.text}>{t.checking}</Text></Screen>;
  if (!permission.granted) {
    return <Screen contentStyle={styles.center}><EmptyState icon={QrCode} title={t.cameraTitle} text={t.cameraText} action={{ label: t.allowCamera, onPress: () => void requestPermission() }} /></Screen>;
  }

  const valid = Boolean(scanned && /^NG-[A-Z0-9]+-[A-Z0-9]+$/i.test(scanned));

  if (scanned) {
    return (
      <Screen contentStyle={styles.result}>
        {valid ? <CheckCircle2 size={68} color={colors.success} /> : <XCircle size={68} color={colors.rose} />}
        <Text style={styles.resultTitle}>{valid ? t.recognized : t.invalid}</Text>
        <Text style={styles.code}>{scanned}</Text>
        <Text style={styles.text}>{valid ? t.validText : t.invalidText}</Text>
        <Button label={t.scanAnother} icon={ScanLine} onPress={() => setScanned(null)} style={styles.full} />
        <Button label={t.close} variant="secondary" onPress={() => router.back()} style={styles.full} />
      </Screen>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => setScanned(data)}
      />
      <View style={styles.cameraShade} />
      <View style={styles.scanFrame}><ScanLine size={44} color={colors.accent} /></View>
      <View style={styles.instructions}><Text style={styles.instructionTitle}>{t.point}</Text><Text style={styles.instructionText}>{t.automatic}</Text></View>
    </View>
  );
}

const scannerCopy = {
  pt: { accessTitle: 'Acesso do estabelecimento', accessText: 'Somente contas de dono ou administrador podem validar ingressos.', back: 'Voltar', checking: 'Verificando a câmera…', cameraTitle: 'Permita o uso da câmera', cameraText: 'A câmera é usada somente para ler o QR Code apresentado pelo cliente.', allowCamera: 'Permitir câmera', recognized: 'Ingresso reconhecido', invalid: 'Código inválido', validText: 'Formato NightGuide válido. A validação online será registrada quando a tabela de portaria estiver configurada.', invalidText: 'Este QR Code não tem o formato emitido pelo NightGuide.', scanAnother: 'Ler outro ingresso', close: 'Fechar scanner', point: 'Aponte para o QR Code', automatic: 'A leitura acontece automaticamente.' },
  en: { accessTitle: 'Venue access', accessText: 'Only venue owner or administrator accounts can validate tickets.', back: 'Back', checking: 'Checking camera…', cameraTitle: 'Allow camera access', cameraText: 'The camera is used only to scan the QR code shown by the customer.', allowCamera: 'Allow camera', recognized: 'Ticket recognized', invalid: 'Invalid code', validText: 'Valid NightGuide format. Online validation will be recorded when the entry table is configured.', invalidText: 'This QR code was not issued by NightGuide.', scanAnother: 'Scan another ticket', close: 'Close scanner', point: 'Point at the QR code', automatic: 'Scanning happens automatically.' },
} as const;

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  result: { alignItems: 'center', justifyContent: 'center' },
  cameraScreen: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  cameraShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.32)' },
  scanFrame: { width: 250, height: 250, borderRadius: 28, borderWidth: 3, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,255,84,0.06)' },
  instructions: { position: 'absolute', bottom: 56, left: 22, right: 22, padding: 18, borderRadius: 18, alignItems: 'center', backgroundColor: 'rgba(9,9,11,0.86)' },
  instructionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  instructionText: { color: colors.muted, marginTop: 5 },
  resultTitle: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 20 },
  code: { color: colors.accent, fontWeight: '900', marginTop: 14 },
  text: { color: colors.muted, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  full: { alignSelf: 'stretch', marginTop: 12 },
});
