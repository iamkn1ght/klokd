/**
 * NotificationBell — the signed-in person's inbox (GET /me/notifications).
 * Unread count on the bell, a panel of the latest 50; opening the panel marks
 * them read. Items that belong to a shift link straight to it. Polls every
 * 30 s while the page is open.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { navigate } from '../navigation/router';
import { colors, spacing, radius } from '../theme';

interface Item {
  id: string;
  type: string;
  title: string;
  body: string;
  shiftId: string | null;
  readAt: string | null;
  createdAt: string;
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export function NotificationBell() {
  const { accessToken, persona } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await api<{ items: Item[]; unread: number }>('/me/notifications', { token: accessToken });
      setItems(r.items);
      setUnread(r.unread);
    } catch {
      /* keep the last good state */
    }
  }, [accessToken]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && accessToken) {
      setUnread(0);
      await api('/me/notifications/read', { method: 'POST', token: accessToken, body: {} }).catch(() => undefined);
    }
  };

  const go = (n: Item) => {
    setOpen(false);
    if (!n.shiftId) return;
    if (persona === 'worker') navigate(`/worker/shifts/${n.shiftId}`);
    else if (persona === 'employer') navigate(`/employer/shifts/${n.shiftId}`);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        style={({ hovered }: any) => [styles.bell, hovered && { backgroundColor: colors.white10 }]}
      >
        <Svg width={17} height={17} viewBox="0 0 20 20">
          <Path d="M10 3a5 5 0 0 0-5 5v3l-1.5 3h13L15 11V8a5 5 0 0 0-5-5zM8 16a2 2 0 0 0 4 0" stroke={colors.white85} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      {open && (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Notifications</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close notifications">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          {items.length === 0 ? (
            <Text style={styles.empty}>Nothing yet. Shift updates, check-ins and pay show up here.</Text>
          ) : (
            <View style={styles.list}>
              {items.map(n => (
                <Pressable
                  key={n.id}
                  onPress={() => go(n)}
                  style={({ hovered }: any) => [styles.item, hovered && n.shiftId && { backgroundColor: colors.white04 }]}
                >
                  <View style={[styles.dot, { backgroundColor: n.readAt ? 'transparent' : colors.electric }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemTitle}>{n.title}</Text>
                    <Text style={styles.itemBody}>{n.body}</Text>
                    <Text style={styles.itemAt}>{ago(n.createdAt)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 50 },
  bell: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.electric, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  panel: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 340,
    maxWidth: '90vw' as any,
    maxHeight: 460,
    overflow: 'scroll' as any,
    backgroundColor: '#13131C',
    borderWidth: 1,
    borderColor: colors.white12,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 20px 50px rgba(0,0,0,0.5)' } as any) : {}),
  },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, paddingHorizontal: 4 },
  panelTitle: { color: colors.white, fontSize: 14, fontWeight: '900' },
  close: { color: colors.white60, fontSize: 14, fontWeight: '800', padding: 4 },
  empty: { color: colors.white60, fontSize: 12.5, lineHeight: 18, padding: spacing.sm },
  list: { gap: 2 },
  item: { flexDirection: 'row', gap: 10, padding: 8, borderRadius: radius.md },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  itemTitle: { color: colors.white, fontSize: 13, fontWeight: '800' },
  itemBody: { color: colors.white70, fontSize: 12, lineHeight: 17, marginTop: 2 },
  itemAt: { color: colors.white45, fontSize: 10.5, marginTop: 3, fontWeight: '600' },
});
