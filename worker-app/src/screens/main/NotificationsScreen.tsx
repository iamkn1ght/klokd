/**
 * Notifications — GET /me/notifications; opening the screen marks them read.
 * Items tied to a shift open it.
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useData } from '../../hooks/useData';
import { useApi } from '../../hooks/useApi';
import { colors } from '../../theme';
import { ago } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any> };

interface Inbox {
  unread: number;
  items: { id: string; title: string; body: string; shiftId: string | null; readAt: string | null; createdAt: string }[];
}

export function NotificationsScreen({ navigation }: Props) {
  const q = useData<Inbox>('/me/notifications');
  const { post } = useApi();

  useEffect(() => {
    if (q.data && q.data.unread > 0) post('/me/notifications/read', {}).catch(() => undefined);
  }, [q.data?.unread]);

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        {q.status === 'loading' && <ActivityIndicator color={colors.electric} style={{ marginTop: 40 }} />}
        {q.status === 'error' && <Text style={styles.err}>{q.error}</Text>}
        {q.data?.items.length === 0 && <Text style={styles.empty}>Nothing yet. Shift updates, check-ins and pay show up here.</Text>}
        {q.data?.items.map(n => (
          <TouchableOpacity
            key={n.id}
            activeOpacity={n.shiftId ? 0.8 : 1}
            onPress={() => n.shiftId && navigation.navigate('ShiftDetail', { id: n.shiftId })}
            style={styles.item}
          >
            <View style={[styles.dot, { backgroundColor: n.readAt ? 'transparent' : colors.electric }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{n.title}</Text>
              <Text style={styles.itemBody}>{n.body}</Text>
              <Text style={styles.itemAt}>{ago(n.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.white, fontSize: 16, fontWeight: '900' },
  err: { color: colors.warning },
  empty: { color: colors.white60, fontSize: 13, textAlign: 'center', marginTop: 30 },
  item: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  itemTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  itemBody: { color: colors.white70, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  itemAt: { color: colors.white45, fontSize: 11, marginTop: 4 },
});
