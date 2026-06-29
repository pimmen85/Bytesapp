import { StyleSheet, Text, View } from 'react-native';
import type { GroupStanding } from '../api/types';
import { flagEmoji } from '../lib/flags';
import { palette, radius, spacing, typography } from '../theme/theme';

/**
 * Gruppspelstabell. De två översta (qualifies) markeras med grön kantlinje =
 * går vidare till slutspel. Tabulära siffror så kolumnerna ligger still.
 */
export function StandingsTable({ group }: { group: GroupStanding }) {
  return (
    <View style={styles.card}>
      <Text style={styles.groupTitle}>{group.group}</Text>

      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.pos, styles.h]}>#</Text>
        <Text style={[styles.team, styles.h]}>Lag</Text>
        <Text style={[styles.num, styles.h]}>S</Text>
        <Text style={[styles.num, styles.h]}>MS</Text>
        <Text style={[styles.num, styles.h]}>P</Text>
      </View>

      {group.rows.map((r) => (
        <View key={r.team.id} style={styles.row}>
          <View
            style={[styles.qualBar, r.qualifies && styles.qualBarOn]}
          />
          <Text style={styles.pos}>{r.rank}</Text>
          <Text style={styles.flag}>{flagEmoji(r.team.code)}</Text>
          <Text style={styles.team} numberOfLines={1}>
            {r.team.name}
          </Text>
          <Text style={styles.num}>{r.played}</Text>
          <Text style={styles.num}>
            {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
          </Text>
          <Text style={[styles.num, styles.points]}>{r.points}</Text>
        </View>
      ))}

      <Text style={styles.legend}>
        S = spelade · MS = målskillnad · P = poäng ·{' '}
        <Text style={{ color: palette.pitch }}>grönt</Text> = vidare till slutspel
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  groupTitle: { ...typography.heading, color: palette.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: spacing.sm,
    marginBottom: 2,
  },
  h: { ...typography.micro, color: palette.textFaint },
  qualBar: {
    position: 'absolute',
    left: -spacing.lg,
    width: 3,
    height: '100%',
    backgroundColor: 'transparent',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  qualBarOn: { backgroundColor: palette.pitch },
  pos: {
    ...typography.caption,
    color: palette.textMuted,
    width: 18,
    fontVariant: ['tabular-nums'],
  },
  flag: { fontSize: 18, width: 24 },
  team: { ...typography.body, color: palette.text, flex: 1 },
  num: {
    ...typography.caption,
    color: palette.textMuted,
    width: 30,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  points: { color: palette.text, fontWeight: '800' },
  legend: {
    ...typography.micro,
    color: palette.textFaint,
    marginTop: spacing.md,
    lineHeight: 15,
  },
});
