/**
 * Provider-factory. Väljer datakälla utifrån app.json > extra.matchDataProvider.
 * Default "mock" så appen funkar direkt utan nyckel. Byt till "api-football"
 * eller "football-data" och fyll i nyckeln för skarp data.
 */
import Constants from 'expo-constants';
import { ApiFootballProvider } from './apiFootball';
import { FootballDataProvider } from './footballData';
import { MockProvider } from './mockProvider';
import type { MatchDataProvider } from './types';

interface Extra {
  matchDataProvider?: string;
  apiFootballKey?: string;
  footballDataToken?: string;
}

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

let cached: MatchDataProvider | null = null;

export function getProvider(): MatchDataProvider {
  if (cached) return cached;
  const extra = readExtra();
  const choice = (extra.matchDataProvider ?? 'mock').toLowerCase();

  if (choice === 'api-football' && extra.apiFootballKey) {
    cached = new ApiFootballProvider(extra.apiFootballKey);
  } else if (choice === 'football-data' && extra.footballDataToken) {
    cached = new FootballDataProvider(extra.footballDataToken);
  } else {
    cached = new MockProvider();
  }
  return cached;
}

export * from './types';
