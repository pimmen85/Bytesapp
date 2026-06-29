import { StyleSheet, Text, View } from 'react-native';
import type { Bracket, BracketMatch } from '../api/types';
import { isLive } from '../api/types';
import { flagEmoji } from '../lib/flags';
import { palette, radius, spacing, typography } from '../theme/theme';

/** En slutspelsmatch (kompakt kort). Tom = ej bestämd ("Vinnare ÅF1"). */
function BracketCell({ match }: { match: BracketMatch }) {
  const live = isLive(match.status);
  const hasTeams = match.home && match.away;
  const homeWon =
    match.status === 'FINISHED' &&
    (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon =
    match.status === 'FINISHED' &&
    (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <View style={[styles.cell, live && styles.cellLive]}>
      {hasTeams ? (
        <>
          <Side
            code={match.home?.code}
            name={match.home?.name ?? ''}
            score={match.homeScore}
            won={homeWon}
            scheduled={match.status === 'SCHEDULED'}
          />
          <View style={styles.cellDivider} />
          <Side
            code={match.away?.code}
            name={match.away?.name ?? ''}
            score={match.awayScore}
            won={awayWon}
            scheduled={match.status === 'SCHEDULED'}
          />
          {live && (
            <View style={styles.liveTag}>
              <Text style={styles.liveTagTxt}>LIVE</Text>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.tbd}>Inte bestämd än</Text>
      )}
    </View>
  );
}

function Side({
  code,
  name,
  score,
  won,
  scheduled,
}: {
  code?: string;
  name: string;
  score?: number;
  won: boolean;
  scheduled: boolean;
}) {
  return (
    <View style={styles.side}>
      <Text style={styles.cellFlag}>{flagEmoji(code)}</Text>
      <Text style={[styles.cellName, won && styles.cellWon]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.cellScore, won && styles.cellWon]}>
        {scheduled || score == null ? '–' : score}
      </Text>
    </View>
  );
}

export function BracketView({ bracket }: { bracket: Bracket }) {
  return (
    <View style={{ gap: spacing.xl }}>
      {bracket.rounds.map((r) => (
        <View key={r.round}>
          <Text style={styles.roundTitle}>{r.round}</Text>
          <View style={{ gap: spacing.sm }}>
            {r.matches.map((m) => (
              <BracketCell key={m.id} match={m} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  roundTitle: {
    ...typography.micro,
    color: palette.textFaint,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  cell: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: 4,
  },
  cellLive: { borderColor: palette.live },
  cellDivider: { height: 1, backgroundColor: palette.border, marginVertical: 2 },
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cellFlag: { fontSize: 18, width: 24 },
  cellName: { ...typography.body, color: palette.text, flex: 1 },
  cellWon: { fontWeight: '800', color: palette.pitch },
  cellScore: {
    ...typography.body,
    color: palette.textMuted,
    width: 18,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  tbd: { ...typography.caption, color: palette.textFaint, fontStyle: 'italic' },
  liveTag: {
    position: 'absolute',
    top: -8,
    right: 10,
    backgroundColor: palette.live,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  liveTagTxt: { ...typography.micro, color: '#fff', fontSize: 9 },
});
