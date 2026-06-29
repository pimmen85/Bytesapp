import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Match } from '../api/types';
import { isLive } from '../api/types';
import { flagEmoji } from '../lib/flags';
import { palette, radius, shadow, spacing, typography } from '../theme/theme';
import { LiveBadge } from './LiveBadge';

function kickoffLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  match: Match;
  followed?: boolean;
  onPress?: () => void;
  onToggleFollow?: () => void;
}

function TeamRow({
  name,
  code,
  score,
  dim,
  bold,
}: {
  name: string;
  code?: string;
  score: number | null;
  dim: boolean;
  bold: boolean;
}) {
  return (
    <View style={styles.teamRow}>
      <Text style={styles.flag}>{flagEmoji(code)}</Text>
      <Text
        style={[styles.teamName, bold && styles.teamNameBold, dim && styles.dim]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={[styles.score, dim && styles.dim]}>
        {score == null ? '' : score}
      </Text>
    </View>
  );
}

export const MatchCard = memo(function MatchCard({
  match,
  followed,
  onPress,
  onToggleFollow,
}: Props) {
  const live = isLive(match.status);
  const finished = match.status === 'FINISHED';
  const scheduled = match.status === 'SCHEDULED';
  const homeWon = finished && match.homeScore > match.awayScore;
  const awayWon = finished && match.awayScore > match.homeScore;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.stage} numberOfLines={1}>
          {match.stage ?? 'VM 2026'}
        </Text>
        {live ? (
          <LiveBadge minute={match.minute} />
        ) : finished ? (
          <Text style={styles.statusFinished}>SLUT</Text>
        ) : (
          <Text style={styles.statusTime}>{kickoffLabel(match.kickoff)}</Text>
        )}
      </View>

      <TeamRow
        name={match.home.name}
        code={match.home.code}
        score={scheduled ? null : match.homeScore}
        dim={awayWon}
        bold={homeWon || live}
      />
      <TeamRow
        name={match.away.name}
        code={match.away.code}
        score={scheduled ? null : match.awayScore}
        dim={homeWon}
        bold={awayWon || live}
      />

      {onToggleFollow && (
        <Pressable
          onPress={onToggleFollow}
          hitSlop={10}
          style={styles.followBtn}
        >
          <Text style={[styles.followStar, followed && styles.followStarOn]}>
            {followed ? '★ Följer' : '☆ Följ'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadow.card,
  },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stage: {
    ...typography.micro,
    color: palette.textFaint,
    flexShrink: 1,
    textTransform: 'uppercase',
  },
  statusTime: { ...typography.caption, color: palette.textMuted },
  statusFinished: { ...typography.micro, color: palette.textFaint },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: spacing.md,
  },
  flag: { fontSize: 22 },
  teamName: { ...typography.body, color: palette.text, flex: 1 },
  teamNameBold: { fontWeight: '800' },
  score: {
    ...typography.score,
    color: palette.text,
    minWidth: 24,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  dim: { color: palette.textFaint },
  followBtn: { marginTop: spacing.md, alignSelf: 'flex-start' },
  followStar: { ...typography.caption, color: palette.textMuted },
  followStarOn: { color: palette.gold },
});
