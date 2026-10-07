/**
 * ErrorBoundary — catches render-time crashes anywhere below it and shows a
 * branded recovery card instead of a blank screen. Two usage levels:
 *
 *   <AppErrorBoundary>        — wraps the whole app (fatal, full-screen)
 *   <TabErrorBoundary label>  — wraps each workspace tab (error stays inside
 *                               the tab; nav/shell keep working)
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface State {
  error: Error | null;
}

class BoundaryBase extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Klokd] Render error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return null; // replaced by subclass render
  }
}

/** Full-screen fatal boundary — wraps the entire app in App.tsx. */
export class AppErrorBoundary extends BoundaryBase {
  render() {
    if (this.state.error) {
      return (
        <View style={styles.full}>
          <View style={styles.card}>
            <View style={styles.mark}>
              <Text style={styles.markK}>K</Text>
            </View>
            <Text style={styles.h1}>Something broke on our side.</Text>
            <Text style={styles.p}>
              The screen hit an unexpected error. Your session is safe — reload to
              pick up where you left off.
            </Text>
            <Text style={styles.err}>{String(this.state.error?.message ?? this.state.error)}</Text>
            <Pressable style={styles.btn} onPress={() => window.location.reload()}>
              <Text style={styles.btnText}>Reload Klokd</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Per-tab boundary — a crashed tab never takes the shell down with it. */
export class TabErrorBoundary extends BoundaryBase {
  render() {
    if (this.state.error) {
      return (
        <View style={styles.tab}>
          <View style={styles.tabCard}>
            <Text style={styles.eyebrow}>THIS PANEL HIT A SNAG</Text>
            <Text style={styles.tabH}>Couldn’t render this tab.</Text>
            <Text style={styles.tabP}>
              Everything else keeps working. Try again — if it keeps failing,
              reload the app from the top bar.
            </Text>
            <Pressable style={styles.btnSm} onPress={this.reset}>
              <Text style={styles.btnText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { maxWidth: 440, width: '100%', padding: spacing.xxl, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03, alignItems: 'flex-start' },
  mark: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.electric, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  markK: { color: colors.ink, fontWeight: '900', fontSize: 22 },
  h1: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  p: { color: colors.white65, fontSize: 13.5, lineHeight: 20, marginTop: spacing.sm },
  err: { color: colors.error, fontSize: 11.5, fontFamily: 'monospace', marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.white04, width: '100%' },
  btn: { marginTop: spacing.lg, backgroundColor: colors.electric, paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.lg },
  btnText: { color: colors.ink, fontWeight: '800', fontSize: 13.5 },
  tab: { paddingVertical: spacing.lg },
  tabCard: { padding: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03, alignItems: 'flex-start' },
  eyebrow: { color: colors.warning, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tabH: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: spacing.sm },
  tabP: { color: colors.white65, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  btnSm: { marginTop: spacing.md, backgroundColor: colors.electric, paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.md },
});
