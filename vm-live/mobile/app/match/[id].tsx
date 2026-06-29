import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getProvider } from '../../src/api';
import type { Match } from '../../src/api/types';
import { isLive } from '../../src/api/types';
import { EventRow } from '../../src/components/EventRow';
import { LiveBadge } from '../../src/components/LiveBadge';
import { flagEmoji } from '../../src/lib/flags';
import { palette, radius, spacing, typography } from '../../src/theme/theme';

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const m = await getProvider().getMatch(String(id));
        if (active) setMatch(m);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    // Live-uppdatering var 15:e s när matchen pågår.
    const timer = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  if (loading && !match) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.pitch} />
      </View>
    );
  }
  if (!match) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Matchen kunde inte hämtas.</Text>
      </View>
    );
  }

  const live = isLive(match.status);
  const scheduled = match.status === 'SCHEDULED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stage}>{match.stage ?? 'VM 2026'}</Text>

      <View style={styles.scoreboard}>
        <View style={styles.team}>
          <Text style={styles.flagBig}>{flagEmoji(match.home.code)}</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {match.home.name}
          </Text>
        </View>

        <View style={styles.scoreBox}>
          {scheduled ? (
            <Text style={styles.kickoff}>
              {new Date(match.kickoff).toLocaleTimeString('sv-SE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          ) : (
            <Text style={styles.bigScore}>
              {match.homeScore}–{match.awayScore}
            </Text>
          )}
          {live ? (
            <LiveBadge minute={match.minute} />
          ) : (
            <Text style={styles.statusLabel}>
              {match.status === 'FINISHED' ? 'Slutsignal' : 'Avspark'}
            </Text>
          )}
        </View>

        <View style={styles.team}>
          <Text style={styles.flagBig}>{flagEmoji(match.away.code)}</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {match.away.name}
          </Text>
        </View>
      </View>

      {match.venue ? <Text style={styles.venue}>📍 {match.venue}</Text> : null}

      <Text style={styles.sectionTitle}>Tidslinje</Text>
      {match.events.length === 0 ? (
        <Text style={styles.muted}>
          {scheduled
            ? 'Matchen har inte börjat än. Slå på notiser så missar du inget mål.'
            : 'Inga händelser registrerade.'}
        </Text>
      ) : (
        <View style={styles.timeline}>
          {match.events.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.x3 },
  center: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    ...typography.micro,
    color: palette.textFaint,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  team: { flex: 1, alignItems: 'center', gap: spacing.sm },
  flagBig: { fontSize: 52 },
  teamName: { ...typography.heading, color: palette.text, textAlign: 'center' },
  scoreBox: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  bigScore: {
    fontSize: 44,
    fontWeight: '800',
    color: palette.text,
    fontVariant: ['tabular-nums'],
  },
  kickoff: { ...typography.title, color: palette.textMuted },
  statusLabel: { ...typography.micro, color: palette.textFaint },
  venue: {
    ...typography.caption,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: palette.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  timeline: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  muted: { ...typography.body, color: palette.textMuted },
});
