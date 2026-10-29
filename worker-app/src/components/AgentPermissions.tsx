/**
 * Agent permissions — the Helpan Console, full screen.
 *
 * Where a worker sees and revokes what their Klokd agent may do (shift
 * sign-up, shift pay). Required before any authority is issued to a real user:
 * the behavioural-data screen and one-tap revoke are DPA 2019 consent duties.
 *
 * The Console calls the Helpan rail directly with an Identiti customer token
 * minted for Helpan's audience; octopus-api mints it (GET /agents/console-token)
 * and we fetch a fresh one each time the Console opens, and again shortly
 * before it expires while it stays open.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { HelpanConsole } from '@kmv/helpan-console';
import { useApi } from '../hooks/useApi';
import { colors } from '../theme';

interface ConsoleSession {
  customerToken: string;
  expiresAt: string;
  appId: string;
}

export function AgentPermissions({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { get } = useApi();
  const [session, setSession] = useState<ConsoleSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await get<ConsoleSession>('/agents/console-token');
      setSession(s);
      // Refresh a minute before expiry while the Console is open.
      const ms = Math.max(30_000, new Date(s.expiresAt).getTime() - Date.now() - 60_000);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load(), ms);
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t open agent permissions.');
    }
  }, [get]);

  useEffect(() => {
    if (visible) void load();
    else {
      setSession(null);
      if (timer.current) clearTimeout(timer.current);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {session ? (
        <HelpanConsole
          customerToken={session.customerToken}
          appId={session.appId}
          theme={{ primary: colors.electric, accent: colors.volt, danger: '#8B1A1A' }}
          lang="en"
          onClose={onClose}
        />
      ) : (
        <View style={styles.wait}>
          {error ? (
            <>
              <Text style={styles.title}>Agent permissions</Text>
              <Text style={styles.msg}>{error}</Text>
              <Pressable onPress={load} style={styles.btn}><Text style={styles.btnText}>Try again</Text></Pressable>
            </>
          ) : (
            <ActivityIndicator color={colors.electric} />
          )}
          <Pressable onPress={onClose} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  wait: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { color: colors.white, fontSize: 18, fontWeight: '900' },
  msg: { color: colors.white60, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: { backgroundColor: colors.electric, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: colors.ink, fontWeight: '800' },
  close: { position: 'absolute', top: 56, right: 20, padding: 8 },
  closeText: { color: colors.white70, fontWeight: '700' },
});
