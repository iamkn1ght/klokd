import React from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppErrorBoundary } from './src/components/ErrorBoundary';
import faviconAsset from './assets/favicon.png';

// Metro asset modules resolve to { uri } (dev web) or a numeric registry id
// (release) — normalize to a URL for the document head.
function assetUri(asset: unknown): string | null {
  if (typeof asset === 'string') return asset;
  if (typeof asset === 'number') return null; // registry id — no URL on web dev
  const a = asset as { uri?: string; default?: unknown };
  if (a?.uri) return a.uri;
  if (a?.default) return assetUri(a.default);
  return null;
}

// Web document head: title + generated favicon (assets/favicon.png).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.title = 'Klokd — Vetted shifts. Instant M-Pesa.';
  const href = assetUri(faviconAsset);
  if (href) {
    const link =
      (document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null) ??
      document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = href;
    document.head.appendChild(link);
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
