import { StyleSheet, Text, View } from 'react-native';
import type { MatchEvent } from '../api/types';
import { palette, spacing, typography } from '../theme/theme';

const ICON: Record<MatchEvent['type'], string> = {
  GOAL: '⚽',
  PENALTY_GOAL: '⚽',
  OWN_GOAL: '🥅',
  YELLOW_CARD: '🟨',
  RED_CARD: '🟥',
  SUBSTITUTION: '🔁',
  VAR: '📺',
  KICKOFF: '🟢',
  HALFTIME: '⏸️',
  FULLTIME: '🔔',
};

const LABEL: Partial<Record<MatchEvent['type'], string>> = {
  GOAL: 'Mål',
  PENALTY_GOAL: 'Straffmål',
  OWN_GOAL: 'Självmål',
  YELLOW_CARD: 'Gult kort',
  RED_CARD: 'Rött kort',
  SUBSTITUTION: 'Byte',
  VAR: 'VAR',
  KICKOFF: 'Avspark',
  HALFTIME: 'Halvtid',
  FULLTIME: 'Slut',
};

/** En rad i matchens tidslinje. Vänster/höger-align efter lag. */
export function EventRow({ event }: { event: MatchEvent }) {
  const right = event.side === 'away';
  const isGoal =
    event.type === 'GOAL' ||
    event.type === 'PENALTY_GOAL' ||
    event.type === 'OWN_GOAL';

  return (
    <View style={[styles.row, right && styles.rowRight]}>
      {!right && <Text style={styles.minute}>{event.minute ?? ''}'</Text>}
      <View style={[styles.bubble, right && styles.bubbleRight]}>
        <Text style={styles.icon}>{ICON[event.type]}</Text>
        <View style={right ? styles.txtRight : undefined}>
          <Text style={[styles.player, isGoal && styles.goalPlayer]}>
            {event.player || LABEL[event.type]}
          </Text>
          {(event.detail || event.assist) && (
            <Text style={styles.detail}>
              {event.assist ? `Assist: ${event.assist}` : event.detail}
            </Text>
          )}
        </View>
      </View>
      {right && <Text style={styles.minute}>{event.minute ?? ''}'</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: 4,
  },
  rowRight: { justifyContent: 'flex-end' },
  minute: {
    ...typography.caption,
    color: palette.textFaint,
    width: 28,
    fontVariant: ['tabular-nums'],
  },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  bubbleRight: { flexDirection: 'row-reverse' },
  icon: { fontSize: 18 },
  txtRight: { alignItems: 'flex-end' },
  player: { ...typography.body, color: palette.text },
  goalPlayer: { fontWeight: '800', color: palette.pitch },
  detail: { ...typography.caption, color: palette.textMuted },
});
