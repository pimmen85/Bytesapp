import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Match } from '../../src/api/types';
import { isLive } from '../../src/api/types';
import { MatchCard } from '../../src/components/MatchCard';
import { Segmented } from '../../src/components/Segmented';
import { loadFollowed, toggleFollowed } from '../../src/lib/storage';
import { useMatches } from '../../src/lib/useMatches';
import { palette, spacing, typography } from '../../src/theme/theme';

type Filter = 'all' | 'live' | 'upcoming' | 'finished';

function matchesFilter(m: Match, f: Filter): boolean {
  switch (f) {
    case 'live':
      return isLive(m.status);
    case 'upcoming':
      return m.status === 'SCHEDULED';
    case 'finished':
      return m.status === 'FINISHED';
    default:
      return true;
  }
}

export default function MatchesScreen() {
  const { matches, loading, error, refresh } = useMatches();
  const [filter, setFilter] = useState<Filter>('all');
  const [followed, setFollowed] = useState<string[]>([]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    loadFollowed().then(setFollowed);
  }, []);

  const liveCount = matches.filter((m) => isLive(m.status)).length;

  const data = useMemo(
    () =>
      matches
        .filter((m) => matchesFilter(m, filter))
        .sort((a, b) => {
          // Live högst upp, sen kommande efter avspark, sen spelade.
          const rank = (m: Match) =>
            isLive(m.status) ? 0 : m.status === 'SCHEDULED' ? 1 : 2;
          if (rank(a) !== rank(b)) return rank(a) - rank(b);
          return a.kickoff.localeCompare(b.kickoff);
        }),
    [matches, filter],
  );

  const onToggle = async (teamA: string, teamB: string) => {
    // Följ via det lag man trycker – här följer vi hemmalaget för enkelhet i listan.
    const next = await toggleFollowed(teamA);
    setFollowed(next);
    void teamB;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>VM 2026</Text>
          <Text style={styles.subtitle}>
            {liveCount > 0
              ? `${liveCount} match${liveCount > 1 ? 'er' : ''} live just nu`
              : 'Inga matcher live just nu'}
          </Text>
        </View>
        <Text style={styles.logo}>⚽</Text>
      </View>

      <View style={styles.filterWrap}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'all', label: 'Alla' },
            { key: 'live', label: 'Live' },
            { key: 'upcoming', label: 'Kommande' },
            { key: 'finished', label: 'Spelade' },
          ]}
        />
      </View>

      {loading && matches.length === 0 ? (
        <ActivityIndicator color={palette.pitch} style={{ marginTop: spacing.x3 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={palette.pitch}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error ? `⚠️ ${error}` : 'Inga matcher att visa här.'}
            </Text>
          }
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              followed={
                followed.includes(item.home.id) ||
                followed.includes(item.away.id)
              }
              onPress={() => router.push(`/match/${item.id}`)}
              onToggleFollow={() => onToggle(item.home.id, item.away.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { ...typography.display, color: palette.text },
  subtitle: { ...typography.caption, color: palette.textMuted, marginTop: 2 },
  logo: { fontSize: 34 },
  filterWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.x3 },
  empty: {
    ...typography.body,
    color: palette.textMuted,
    textAlign: 'center',
    marginTop: spacing.x3,
  },
});
