/**
 * Employer business verification (web) — #/employer/verify.
 *
 * Two steps, both REAL and both required before the API accepts a shift:
 *   1. Business  — name + KRA PIN (+ contact)  → PUT  /identity/employers/profile
 *   2. WIBA      — insurer, policy no., expiry  → POST /identity/employers/wiba
 *
 * A KRA PIN on file also registers the business with Hakken (D-42).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, GradientBtn, GhostBtn, StatusPill } from '../../components/Primitives';
import { Field, Notice } from '../../components/Form';
import { ErrorState } from '../../components/States';
import { useAuth } from '../../context/AuthContext';
import { useEmployerProfile, EmployerProfile } from '../../hooks/useEmployerProfile';
import { api } from '../../services/api';
import { navigate } from '../../navigation/router';
import { colors, spacing } from '../../theme';

const KRA_RE = /^[A-Z]\d{9}[A-Z]$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "a005 123-456 7x" → "A0051234567X" */
const normaliseKra = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function EmployerVerify() {
  const { profile, status, error, reload } = useEmployerProfile();

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.electric} />
      </View>
    );
  }
  if (status === 'error' || !profile) {
    return <ErrorState title="Couldn’t load your business profile." detail={error ?? undefined} onRetry={reload} />;
  }

  return (
    <View style={styles.wrap}>
      <FadeUp delay={0}>
        <Eyebrow color={colors.volt}>BUSINESS VERIFICATION</Eyebrow>
        <Text style={styles.h1}>
          {profile.canPostShifts ? 'Your business is verified.' : 'Verify your business to post shifts.'}
        </Text>
        <Text style={styles.p}>
          Two checks, a couple of minutes. Workers only see shifts from businesses with a KRA PIN and active WIBA
          cover on file.
        </Text>
      </FadeUp>

      <FadeUp delay={80}>
        <BusinessStep profile={profile} onSaved={reload} />
      </FadeUp>
      <FadeUp delay={140}>
        <WibaStep profile={profile} onSaved={reload} />
      </FadeUp>

      {profile.canPostShifts && (
        <FadeUp delay={200} style={styles.doneRow}>
          <GradientBtn onPress={() => navigate('/employer/shifts/new')}>Post a shift</GradientBtn>
        </FadeUp>
      )}
    </View>
  );
}

function StepHead({ n, title, done }: { n: string; title: string; done: boolean }) {
  return (
    <View style={styles.stepHead}>
      <Text style={styles.stepN}>{n}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <StatusPill tone={done ? 'mint' : 'warn'}>{done ? 'done' : 'to do'}</StatusPill>
    </View>
  );
}

function BusinessStep({ profile, onSaved }: { profile: EmployerProfile; onSaved: () => void }) {
  const { accessToken } = useAuth();
  const done = !!profile.kraPinMasked;
  const [editing, setEditing] = useState(!done);
  const [businessName, setBusinessName] = useState(
    profile.businessName === 'Unregistered business' ? '' : profile.businessName
  );
  const [kraPin, setKraPin] = useState('');
  const [contactPerson, setContactPerson] = useState(profile.contactPerson ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setEditing(!done), [done]);

  const pin = normaliseKra(kraPin);
  const pinErr = pin.length > 0 && !KRA_RE.test(pin) ? 'A KRA PIN is 11 characters: a letter, 9 digits, a letter (e.g. P051234567A).' : null;
  const valid = businessName.trim().length > 1 && KRA_RE.test(pin);

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api('/identity/employers/profile', {
        method: 'PUT',
        token: accessToken!,
        body: { businessName: businessName.trim(), kraPin: pin, contactPerson: contactPerson.trim() || undefined },
      });
      setKraPin('');
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard padding={spacing.xl} style={styles.card}>
      <StepHead n="01" title="Business" done={done} />
      {!editing ? (
        <View style={styles.summary}>
          <SummaryRow k="Business name" v={profile.businessName} />
          <SummaryRow k="KRA PIN" v={profile.kraPinMasked!} />
          {profile.contactPerson ? <SummaryRow k="Contact" v={profile.contactPerson} /> : null}
          <View style={styles.editRow}>
            <GhostBtn size="sm" onPress={() => setEditing(true)}>Update details</GhostBtn>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          {err ? <Notice tone="err">{err}</Notice> : null}
          <Field label="Registered business name" value={businessName} onChangeText={setBusinessName} placeholder="The Brew Bistro Ltd" />
          <Field
            label="KRA PIN"
            value={kraPin}
            onChangeText={setKraPin}
            placeholder="e.g. P051234567A"
            autoCapitalize="characters"
            maxLength={16}
            error={pinErr}
            hint={done ? 'Re-enter the PIN to change your details.' : 'Used only for verification. Never shown to workers.'}
          />
          <Field label="Contact person (optional)" value={contactPerson} onChangeText={setContactPerson} placeholder="Who workers ask for on arrival" />
          <View style={styles.actions}>
            <GradientBtn onPress={save} disabled={!valid || saving}>{saving ? 'Saving…' : 'Save business details'}</GradientBtn>
            {done ? <GhostBtn onPress={() => setEditing(false)}>Cancel</GhostBtn> : null}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

function WibaStep({ profile, onSaved }: { profile: EmployerProfile; onSaved: () => void }) {
  const { accessToken } = useAuth();
  const { wiba } = profile;
  const done = wiba.status === 'confirmed';
  const [editing, setEditing] = useState(!done);
  const [insurer, setInsurer] = useState(wiba.insurer ?? '');
  const [policyRef, setPolicyRef] = useState('');
  const [expiry, setExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setEditing(!done), [done]);

  const expiryDate = DATE_RE.test(expiry) ? new Date(`${expiry}T23:59:59`) : null;
  const expiryErr =
    expiry.length === 0
      ? null
      : !expiryDate || isNaN(expiryDate.getTime())
        ? 'Use the format YYYY-MM-DD.'
        : expiryDate < new Date()
          ? 'That date has passed. WIBA cover must be current.'
          : null;
  const valid = insurer.trim().length > 1 && policyRef.trim().length > 2 && !!expiryDate && !expiryErr;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api('/identity/employers/wiba', {
        method: 'POST',
        token: accessToken!,
        body: { insurer: insurer.trim(), policyRef: policyRef.trim(), policyExpiry: expiryDate!.toISOString() },
      });
      setPolicyRef('');
      setExpiry('');
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <GlassCard padding={spacing.xl} style={styles.card}>
      <StepHead n="02" title="WIBA cover" done={done} />
      {!editing ? (
        <View style={styles.summary}>
          <SummaryRow k="Insurer" v={wiba.insurer ?? '—'} />
          <SummaryRow k="Policy no." v={wiba.policyRef ?? '—'} />
          {wiba.expiresAt ? <SummaryRow k="Expires" v={fmtDate(wiba.expiresAt)} /> : null}
          <View style={styles.editRow}>
            <GhostBtn size="sm" onPress={() => setEditing(true)}>Declare a new policy</GhostBtn>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.stepP}>
            The Work Injury Benefits Act requires cover for everyone working at your venue. Declare your current
            policy; workers can’t clock in at a business without it.
          </Text>
          {wiba.status === 'expired' ? (
            <Notice tone="err">
              Your policy {wiba.policyRef} expired{wiba.expiresAt ? ` on ${fmtDate(wiba.expiresAt)}` : ''}. Declare the renewed policy to keep posting.
            </Notice>
          ) : null}
          {err ? <Notice tone="err">{err}</Notice> : null}
          <Field label="Insurer" value={insurer} onChangeText={setInsurer} placeholder="e.g. Jubilee, Britam, CIC" />
          <View style={styles.row2}>
            <Field label="Policy number" value={policyRef} onChangeText={setPolicyRef} placeholder="e.g. WIBA/2026/0001" style={styles.flex} />
            <Field
              label="Expiry date"
              value={expiry}
              onChangeText={setExpiry}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              error={expiryErr}
              style={styles.flex}
            />
          </View>
          <View style={styles.actions}>
            <GradientBtn onPress={save} disabled={!valid || saving}>{saving ? 'Saving…' : 'Declare WIBA policy'}</GradientBtn>
            {done ? <GhostBtn onPress={() => setEditing(false)}>Cancel</GhostBtn> : null}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumK}>{k}</Text>
      <Text style={styles.sumV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: 720, gap: spacing.lg },
  loading: { paddingVertical: 80, alignItems: 'center' },
  h1: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  p: { color: colors.white60, fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 560 },
  card: { marginTop: spacing.xs },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  stepN: { color: colors.volt, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  stepTitle: { color: colors.white, fontSize: 17, fontWeight: '900', letterSpacing: -0.4, flex: 1 },
  stepP: { color: colors.white60, fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  form: {},
  row2: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  flex: { flex: 1, minWidth: 200 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
  summary: { gap: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  sumK: { color: colors.white50, fontSize: 13, fontWeight: '600' },
  sumV: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
  editRow: { flexDirection: 'row', marginTop: spacing.xs },
  doneRow: { flexDirection: 'row', marginTop: spacing.sm },
});
