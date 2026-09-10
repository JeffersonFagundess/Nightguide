import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Pencil, Plus, Save, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/button';
import { FormField } from '@/src/components/form-field';
import { Screen } from '@/src/components/screen';
import { EmptyState, LoadingState } from '@/src/components/state';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/auth-provider';
import { useNightData } from '@/src/providers/data-provider';
import { usePreferences } from '@/src/providers/preferences-provider';
import { colors } from '@/src/theme';

type OwnerVenue = { id: string; name: string; address: string; description: string; coverUrl: string };
type OwnerEvent = { id: string; title: string; genre: string; description: string; startsAt: string; price: string; coverUrl: string };

const emptyVenue: OwnerVenue = { id: '', name: '', address: '', description: '', coverUrl: '' };
const emptyEvent = (): OwnerEvent => ({ id: '', title: '', genre: '', description: '', startsAt: tomorrowAtNine(), price: '20', coverUrl: '' });

export default function OwnerScreen() {
  const { user, profile } = useAuth();
  const { refresh } = useNightData();
  const { language } = usePreferences();
  const t = ownerCopy[language];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venue, setVenue] = useState<OwnerVenue>(emptyVenue);
  const [events, setEvents] = useState<OwnerEvent[]>([]);
  const [draft, setDraft] = useState<OwnerEvent>(emptyEvent);

  useEffect(() => {
    if (!user || !supabase || profile?.role !== 'owner') {
      setLoading(false);
      return;
    }
    void loadOwnerData(user.id).finally(() => setLoading(false));
  }, [profile?.role, user]);

  async function loadOwnerData(userId: string) {
    const venueResult = await supabase!.from('venues').select('id,name,address,description,cover_url').eq('owner_id', userId).limit(1).maybeSingle();
    if (venueResult.error) throw venueResult.error;
    if (!venueResult.data) return;
    const nextVenue = {
      id: venueResult.data.id,
      name: venueResult.data.name,
      address: venueResult.data.address || '',
      description: venueResult.data.description || '',
      coverUrl: venueResult.data.cover_url || '',
    };
    setVenue(nextVenue);
    const eventsResult = await supabase!.from('events').select('id,title,genre,description,starts_at,price,cover_url').eq('venue_id', nextVenue.id).order('starts_at');
    if (eventsResult.error) throw eventsResult.error;
    setEvents((eventsResult.data || []).map((event) => ({
      id: event.id,
      title: event.title,
      genre: event.genre || '',
      description: event.description || '',
      startsAt: toLocalInput(event.starts_at),
      price: String(event.price || 0),
      coverUrl: event.cover_url || '',
    })));
  }

  async function saveVenue() {
    if (!user || !supabase || !venue.name.trim()) return;
    setSaving(true);
    try {
      if (venue.id) {
        const { error } = await supabase.from('venues').update({ name: venue.name.trim(), address: venue.address.trim(), description: venue.description.trim(), cover_url: venue.coverUrl || null }).eq('id', venue.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('venues').insert({ owner_id: user.id, name: venue.name.trim(), address: venue.address.trim(), description: venue.description.trim(), cover_url: venue.coverUrl || null, category: 'Bar e evento', is_published: false }).select('id').single();
        if (error) throw error;
        setVenue((current) => ({ ...current, id: data.id }));
      }
      Alert.alert(t.venueSaved, t.venueSavedText);
      await refresh();
    } catch (error) {
      Alert.alert(t.saveError, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent() {
    if (!user || !supabase || !venue.id || !draft.title.trim()) return;
    const startsAt = parseDateTime(draft.startsAt);
    if (!startsAt) return Alert.alert(t.invalidDate, t.dateFormat);
    setSaving(true);
    try {
      const payload = { venue_id: venue.id, creator_id: user.id, title: draft.title.trim(), description: draft.description.trim(), genre: draft.genre.trim(), starts_at: startsAt, price: Number(draft.price.replace(',', '.')) || 0, cover_url: draft.coverUrl || venue.coverUrl || null, status: 'published' as const };
      if (draft.id) {
        const { error } = await supabase.from('events').update(payload).eq('id', draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
      }
      setDraft(emptyEvent());
      await loadOwnerData(user.id);
      await refresh();
    } catch (error) {
      Alert.alert(t.eventSaveError, error instanceof Error ? error.message : t.tryAgain);
    } finally {
      setSaving(false);
    }
  }

  async function removeEvent(id: string) {
    if (!supabase || !user) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return Alert.alert(t.deleteError, error.message);
    await loadOwnerData(user.id);
    await refresh();
  }

  async function chooseCover(target: 'venue' | 'event', source: 'camera' | 'library') {
    if (!user || !supabase) return;
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(t.permission, source === 'camera' ? t.cameraPermission : t.galleryPermission);
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.82 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.82 });
    if (result.canceled || !result.assets[0]?.uri) return;

    setSaving(true);
    try {
      const image = result.assets[0];
      const extension = image.fileName?.split('.').pop()?.toLowerCase() || image.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const bucket = target === 'venue' ? 'venue-covers' : 'event-covers';
      const path = `${user.id}/${Date.now()}.${extension}`;
      const arrayBuffer = await fetch(image.uri).then((response) => response.arrayBuffer());
      const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, { contentType: image.mimeType || 'image/jpeg', upsert: false });
      if (error) throw error;
      const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      if (target === 'venue') setVenue((current) => ({ ...current, coverUrl: publicUrl }));
      else setDraft((current) => ({ ...current, coverUrl: publicUrl }));
    } catch (error) {
      Alert.alert(t.uploadError, error instanceof Error ? error.message : t.uploadErrorText);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label={t.loading} />;
  if (!user || !supabase || profile?.role !== 'owner') return <Screen contentStyle={styles.center}><EmptyState icon={Pencil} title={t.ownerRequired} text={t.ownerRequiredText} /></Screen>;

  return (
    <Screen>
      <Text style={styles.eyebrow}>{t.eyebrow}</Text>
      <Text style={styles.title}>{t.title}</Text>

      <Panel title={t.venueProfile}>
        {venue.coverUrl ? <Image source={{ uri: venue.coverUrl }} style={styles.cover} /> : <View style={[styles.cover, styles.coverEmpty]}><ImageIcon color={colors.muted} size={30} /></View>}
        <View style={styles.imageActions}>
          <Button label={t.gallery} icon={ImageIcon} variant="secondary" onPress={() => void chooseCover('venue', 'library')} style={styles.imageAction} />
          <Button label={t.camera} icon={Camera} variant="secondary" onPress={() => void chooseCover('venue', 'camera')} style={styles.imageAction} />
        </View>
        <FormField label={t.name} value={venue.name} onChangeText={(name) => setVenue((current) => ({ ...current, name }))} />
        <FormField label={t.address} value={venue.address} onChangeText={(address) => setVenue((current) => ({ ...current, address }))} />
        <FormField label={t.description} value={venue.description} onChangeText={(description) => setVenue((current) => ({ ...current, description }))} multiline />
        <Button label={t.saveVenue} icon={Save} onPress={() => void saveVenue()} loading={saving} />
      </Panel>

      <Panel title={draft.id ? t.editEvent : t.createEvent}>
        <FormField label={t.eventTitle} value={draft.title} onChangeText={(title) => setDraft((current) => ({ ...current, title }))} />
        <FormField label={t.genre} value={draft.genre} onChangeText={(genre) => setDraft((current) => ({ ...current, genre }))} />
        <FormField label={t.dateTime} value={draft.startsAt} onChangeText={(startsAt) => setDraft((current) => ({ ...current, startsAt }))} autoCapitalize="none" />
        <FormField label={t.price} value={draft.price} onChangeText={(price) => setDraft((current) => ({ ...current, price }))} keyboardType="decimal-pad" />
        <FormField label={t.description} value={draft.description} onChangeText={(description) => setDraft((current) => ({ ...current, description }))} multiline />
        {draft.coverUrl ? <Image source={{ uri: draft.coverUrl }} style={styles.eventCover} /> : null}
        <View style={styles.imageActions}>
          <Button label={t.galleryCover} icon={ImageIcon} variant="secondary" onPress={() => void chooseCover('event', 'library')} style={styles.imageAction} />
          <Button label={t.takePhoto} icon={Camera} variant="secondary" onPress={() => void chooseCover('event', 'camera')} style={styles.imageAction} />
        </View>
        <Button label={draft.id ? t.saveEdit : t.publishEvent} icon={draft.id ? Save : Plus} onPress={() => void saveEvent()} loading={saving} disabled={!venue.id} />
        {draft.id ? <Button label={t.cancelEdit} variant="ghost" onPress={() => setDraft(emptyEvent())} /> : null}
        {!venue.id ? <Text style={styles.hint}>{t.saveFirst}</Text> : null}
      </Panel>

      <Panel title={t.publishedEvents}>
        {events.length ? events.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{event.startsAt} • R$ {event.price}</Text></View>
            <Pressable onPress={() => setDraft(event)} style={styles.rowIcon}><Pencil size={17} color={colors.text} /></Pressable>
            <Pressable onPress={() => Alert.alert(t.deleteEvent, event.title, [{ text: t.cancel, style: 'cancel' }, { text: t.delete, style: 'destructive', onPress: () => void removeEvent(event.id) }])} style={styles.rowIcon}><Trash2 size={17} color={colors.rose} /></Pressable>
          </View>
        )) : <Text style={styles.hint}>{t.noEvents}</Text>}
      </Panel>
    </Screen>
  );
}

const ownerCopy = {
  pt: { venueSaved: 'Estabelecimento salvo', venueSavedText: 'As informações foram atualizadas no Supabase.', saveError: 'Não foi possível salvar', tryAgain: 'Tente novamente.', invalidDate: 'Data inválida', dateFormat: 'Use o formato AAAA-MM-DD HH:mm.', eventSaveError: 'Não foi possível salvar o evento', deleteError: 'Não foi possível excluir', permission: 'Permissão necessária', cameraPermission: 'Permita o uso da câmera.', galleryPermission: 'Permita o acesso à galeria.', uploadError: 'Falha no upload', uploadErrorText: 'Não foi possível enviar a imagem.', loading: 'Carregando o estabelecimento…', ownerRequired: 'Conta de dono necessária', ownerRequiredText: 'O perfil precisa ter role owner no Supabase para editar um estabelecimento.', eyebrow: 'GESTÃO NATIVA', title: 'Seu estabelecimento', venueProfile: 'Perfil do local', gallery: 'Galeria', camera: 'Câmera', name: 'Nome', address: 'Endereço', description: 'Descrição', saveVenue: 'Salvar estabelecimento', editEvent: 'Editar evento', createEvent: 'Criar evento', eventTitle: 'Título', genre: 'Gênero', dateTime: 'Data e hora (AAAA-MM-DD HH:mm)', price: 'Preço em reais', galleryCover: 'Capa da galeria', takePhoto: 'Fotografar', saveEdit: 'Salvar edição', publishEvent: 'Publicar evento', cancelEdit: 'Cancelar edição', saveFirst: 'Salve o estabelecimento antes de publicar o primeiro evento.', publishedEvents: 'Eventos publicados', deleteEvent: 'Excluir evento?', cancel: 'Cancelar', delete: 'Excluir', noEvents: 'Nenhum evento publicado por este estabelecimento.' },
  en: { venueSaved: 'Venue saved', venueSavedText: 'The information was updated in Supabase.', saveError: 'Unable to save', tryAgain: 'Try again.', invalidDate: 'Invalid date', dateFormat: 'Use YYYY-MM-DD HH:mm.', eventSaveError: 'Unable to save event', deleteError: 'Unable to delete', permission: 'Permission required', cameraPermission: 'Allow camera access.', galleryPermission: 'Allow gallery access.', uploadError: 'Upload failed', uploadErrorText: 'Unable to upload the image.', loading: 'Loading venue…', ownerRequired: 'Owner account required', ownerRequiredText: 'The profile must have the owner role in Supabase to edit a venue.', eyebrow: 'NATIVE MANAGEMENT', title: 'Your venue', venueProfile: 'Venue profile', gallery: 'Gallery', camera: 'Camera', name: 'Name', address: 'Address', description: 'Description', saveVenue: 'Save venue', editEvent: 'Edit event', createEvent: 'Create event', eventTitle: 'Title', genre: 'Genre', dateTime: 'Date and time (YYYY-MM-DD HH:mm)', price: 'Price in BRL', galleryCover: 'Gallery cover', takePhoto: 'Take photo', saveEdit: 'Save changes', publishEvent: 'Publish event', cancelEdit: 'Cancel editing', saveFirst: 'Save the venue before publishing the first event.', publishedEvents: 'Published events', deleteEvent: 'Delete event?', cancel: 'Cancel', delete: 'Delete', noEvents: 'No events published by this venue.' },
} as const;

function Panel({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <View style={styles.panel}><Text style={styles.panelTitle}>{title}</Text><View style={styles.panelBody}>{children}</View></View>;
}

function tomorrowAtNine() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} 21:00`;
}

function toLocalInput(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, marginTop: 14 },
  title: { color: colors.text, fontSize: 33, fontWeight: '900', letterSpacing: -1, marginTop: 7 },
  panel: { marginTop: 20, padding: 17, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  panelTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  panelBody: { gap: 13, marginTop: 15 },
  cover: { width: '100%', height: 180, borderRadius: 14, backgroundColor: colors.elevated },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  eventCover: { width: '100%', height: 130, borderRadius: 14 },
  imageActions: { flexDirection: 'row', gap: 9 },
  imageAction: { flex: 1, paddingHorizontal: 8 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  eventCopy: { flex: 1 },
  eventTitle: { color: colors.text, fontWeight: '800' },
  eventMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
});
