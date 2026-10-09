/**
 * Minimal hash router for the unified web app.
 *
 * Why hash routing: Metro serves the SPA from a single entry; deep paths like
 * /worker/shifts would 404 on refresh on most static hosts. Hash routes
 * (#/worker/shifts) survive refresh, work on any static host, and give us
 * real browser back/forward via `hashchange` — with real <a href> anchors so
 * links are middle-clickable and exposed to assistive tech.
 *
 * Route table:
 *   #/                       landing (redirects to workspace when signed in)
 *   #/signin[?persona=x]     sign-in flow
 *   #/worker/:tab            worker workspace  (home | shifts | pay | profile)
 *   #/employer/:tab          employer workspace (dashboard | shifts | pay | team)
 *   #/employer/shifts/new    post a shift
 *   #/employer/shifts/:id    shift detail + applicants (select a worker)
 *   #/employer/verify        business verification (KRA PIN + WIBA)
 *   #/admin/:route           admin console (overview | verification | attendance | disputes
 *                            | payments | audit | users) — staff only
 *   #/terms  #/privacy       legal documents (public, sign-out safe)
 */
import React from 'react';
import { Pressable, Platform, Text } from 'react-native';

export type Route =
  | { name: 'landing' }
  | { name: 'signin'; persona?: string | null }
  | { name: 'worker'; tab: string }
  | { name: 'employer'; tab: string; sub?: string }
  | { name: 'admin'; tab: string }
  | { name: 'legal'; doc: 'terms' | 'privacy' }
  | { name: 'notfound' };

export const WORKER_TABS = ['home', 'shifts', 'pay', 'profile'] as const;
export const EMPLOYER_TABS = ['dashboard', 'shifts', 'pay', 'team', 'verify'] as const;
export const ADMIN_TABS = ['overview', 'verification', 'attendance', 'disputes', 'payments', 'audit', 'users'] as const;

export function defaultRouteFor(persona: string): string {
  if (persona === 'employer') return '/employer/dashboard';
  if (persona === 'admin') return '/admin/overview';
  return '/worker/home';
}

/** Parse a location.hash into a typed Route. Non-router hashes (e.g. plain
 *  `#section` anchors used by marketing pages) yield null — the router
 *  ignores them instead of redirecting. */
export function parseHash(hash: string): Route | null {
  const raw = hash.replace(/^#/, '') || '/';
  if (!raw.startsWith('/')) return null;
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query ?? '');

  if (parts.length === 0) return { name: 'landing' };
  if (parts[0] === 'signin') return { name: 'signin', persona: params.get('persona') };
  if (parts[0] === 'terms') return { name: 'legal', doc: 'terms' };
  if (parts[0] === 'privacy') return { name: 'legal', doc: 'privacy' };
  if (parts[0] === 'worker' && (WORKER_TABS as readonly string[]).includes(parts[1] ?? '')) {
    return { name: 'worker', tab: parts[1] };
  }
  if (parts[0] === 'employer' && (EMPLOYER_TABS as readonly string[]).includes(parts[1] ?? '')) {
    // Only the shifts tab has sub-pages (new | :id).
    if (parts.length > 2 && parts[1] !== 'shifts') return { name: 'notfound' };
    return { name: 'employer', tab: parts[1], sub: parts[2] };
  }
  if (parts[0] === 'admin' && (ADMIN_TABS as readonly string[]).includes(parts[1] ?? '')) {
    return { name: 'admin', tab: parts[1] };
  }
  return { name: 'notfound' };
}

/** Current route, updated on popstate/hashchange (back/forward included). */
export function useRoute(): Route {
  const [route, setRoute] = React.useState<Route>(() => parseHash(window.location.hash) ?? { name: 'landing' });
  React.useEffect(() => {
    const onChange = () => {
      const next = parseHash(window.location.hash);
      if (next) setRoute(next);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Navigate by setting the hash — pushes a history entry (back works). */
export function navigate(path: string, { replace = false }: { replace?: boolean } = {}) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === target) return;
  if (replace) {
    const url = window.location.href.split('#')[0] + target;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

/**
 * Anchor-styled-as-button. Renders a real <a> on web (new-tab / a11y for
 * free) and falls back to a Pressable + navigate() elsewhere.
 */
export function Link({
  to,
  children,
  style,
  hoverStyle,
  replace,
}: {
  to: string;
  children: React.ReactNode;
  style?: any;
  hoverStyle?: any;
  replace?: boolean;
}) {
  const href = to.startsWith('#') ? to : `#${to}`;
  if (Platform.OS === 'web') {
    return (
      <Pressable
        accessibilityRole="link"
        // RN-Web forwards href to the DOM anchor — middle-click / new-tab and
        // keyboard semantics come free. onPress keeps our hash semantics.
        {...({ href } as any)}
        onPress={(e: any) => {
          if (e?.metaKey || e?.ctrlKey || e?.shiftKey || e?.altKey) return;
          e?.preventDefault?.();
          navigate(to, { replace });
        }}
        style={({ hovered }: any) => [style, hovered && hoverStyle]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <Pressable onPress={() => navigate(to, { replace })} style={({ hovered }: any) => [style, hovered && hoverStyle]}>
      <Text>{children}</Text>
    </Pressable>
  );
}
