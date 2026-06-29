import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProvider } from '../../src/api';
import type { Bracket, GroupStanding } from '../../src/api/types';
import { BracketView } from '../../src/components/BracketView';
import { Segmented } from '../../src/components/Segmented';
import { StandingsTable } from '../../src/components/StandingsTable';
import { palette, spacing, typography } from '../../src/theme/theme';

type View2 = 'groups' | 'bracket';

export default function TournamentScreen() {
  const [view, setView] = useState<View2>('groups');
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const load = async () => {
      try {
        const p = getProvider();
        const [g, b] = await Promise.all([p.getStandings(), p.getBracket()]);
        setGroups(g);
        setBracket(b);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Turnering</Text>
      <View style={styles.segWrap}>
        <Segmented<View2>
          value={view}
          onChange={setView}
          options={[
            { key: 'groups', label: 'Grupper' },
            { key: 'bracket', label: 'Slutspel' },
          ]}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={palette.pitch} style={{ marginTop: spacing.x3 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {view === 'groups' ? (
            groups.length === 0 ? (
              <Text style={styles.empty}>Inga tabeller tillgängliga än.</Text>
            ) : (
              <View style={{ gap: spacing.lg }}>
                {groups.map((g) => (
                  <StandingsTable key={g.group} group={g} />
                ))}
              </View>
            )
          ) : bracket && bracket.rounds.length > 0 ? (
            <BracketView bracket={bracket} />
          ) : (
            <Text style={styles.empty}>Slutspelet har inte börjat än.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  title: {
    ...typography.display,
    color: palette.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  segWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.x3 },
  empty: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: spacing.x3,
  },
});
