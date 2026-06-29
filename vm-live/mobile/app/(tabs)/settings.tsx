import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getPushToken,
  presentLocalNotification,
  registerWithBackend,
  requestPermission,
} from '../../src/lib/notifications';
import {
  defaultSettings,
  loadFollowed,
  loadSettings,
  saveSettings,
  type NotificationSettings,
} from '../../src/lib/storage';
import { palette, radius, spacing, typography } from '../../src/theme/theme';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [primed, setPrimed] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setPrimed(s.enabled);
    });
  }, []);

  const persist = (next: NotificationSettings) => {
    setSettings(next);
    void saveSettings(next);
  };

  const update = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => persist({ ...settings, [key]: value });

  /** Pre-permission priming: OS-dialogen visas FÖRST när användaren tryckt här. */
  const enableNotifications = async () => {
    const granted = await requestPermission();
    if (!granted) {
      persist({ ...settings, enabled: false });
      return;
    }
    persist({ ...settings, enabled: true });
    setPrimed(true);

    // Registrera push-token mot backend (om konfigurerat) så servern kan
    // pusha mål även när appen är stängd.
    const backendUrl =
      (Constants.expoConfig?.extra as { pushBackendUrl?: string } | undefined)
        ?.pushBackendUrl ?? '';
    const token = await getPushToken();
    if (token && backendUrl) {
      const followed = await loadFollowed();
      await registerWithBackend(backendUrl, token, followed);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: spacing.x3,
      }}
    >
      <Text style={styles.title}>Notiser</Text>

      {!primed ? (
        // Priming-kort som förklarar värdet INNAN OS-dialogen (höjer opt-in).
        <View style={styles.primeCard}>
          <Text style={styles.primeEmoji}>⚽🔔</Text>
          <Text style={styles.primeTitle}>Missa aldrig ett mål</Text>
          <Text style={styles.primeBody}>
            Få en notis i samma sekund som det blir mål, rött kort eller
            slutsignal i VM. Du väljer själv exakt vad du vill bli notifierad om
            – och kan stänga av när som helst.
          </Text>
          <Pressable style={styles.primeBtn} onPress={enableNotifications}>
            <Text style={styles.primeBtnText}>Slå på notiser</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Row
              label="Notiser på"
              hint="Huvudbrytare för alla notiser"
              value={settings.enabled}
              onChange={(v) => update('enabled', v)}
            />
          </View>

          <Text style={styles.sectionLabel}>VAD VILL DU BLI NOTIFIERAD OM?</Text>
          <View style={styles.card}>
            <Row
              label="⚽ Mål"
              value={settings.goals}
              disabled={!settings.enabled}
              onChange={(v) => update('goals', v)}
            />
            <Divider />
            <Row
              label="🟢 Avspark"
              value={settings.matchStart}
              disabled={!settings.enabled}
              onChange={(v) => update('matchStart', v)}
            />
            <Divider />
            <Row
              label="🔔 Slutsignal"
              value={settings.fullTime}
              disabled={!settings.enabled}
              onChange={(v) => update('fullTime', v)}
            />
            <Divider />
            <Row
              label="🟥 Röda kort"
              value={settings.redCards}
              disabled={!settings.enabled}
              onChange={(v) => update('redCards', v)}
            />
          </View>

          <Text style={styles.sectionLabel}>OMFATTNING</Text>
          <View style={styles.card}>
            <Row
              label="Endast lag jag följer"
              hint="Annars notiser för alla VM-matcher"
              value={settings.onlyFollowed}
              disabled={!settings.enabled}
              onChange={(v) => update('onlyFollowed', v)}
            />
          </View>

          <Pressable
            style={styles.testBtn}
            onPress={() =>
              presentLocalNotification(
                '⚽ MÅL — 67′ Gyökeres',
                '🇸🇪 Sverige 2–1 Spanien 🇪🇸',
              )
            }
          >
            <Text style={styles.testBtnText}>Skicka testnotis</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.footer}>
        Datakälla: {Constants.expoConfig?.extra?.matchDataProvider ?? 'mock'} ·
        Mål · VM Live 2026
      </Text>
    </ScrollView>
  );
}

function Row({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: palette.pitch, false: palette.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  title: { ...typography.display, color: palette.text, marginBottom: spacing.lg },
  primeCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  primeEmoji: { fontSize: 40 },
  primeTitle: { ...typography.title, color: palette.text, textAlign: 'center' },
  primeBody: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  primeBtn: {
    backgroundColor: palette.pitch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  primeBtnText: { ...typography.heading, color: '#04130B' },
  sectionLabel: {
    ...typography.micro,
    color: palette.textFaint,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowDisabled: { opacity: 0.45 },
  rowLabel: { ...typography.body, color: palette.text },
  rowHint: { ...typography.caption, color: palette.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: palette.border },
  testBtn: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  testBtnText: { ...typography.body, color: palette.textMuted },
  footer: {
    ...typography.caption,
    color: palette.textFaint,
    textAlign: 'center',
    marginTop: spacing.x2,
  },
});
