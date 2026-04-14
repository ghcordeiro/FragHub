import { describe, expect, it } from 'vitest';
import { coerceGet5PlayersRecords, parseMatchWebhook } from './matchWebhookPayloads';

const matchZySample = {
  event: 'map_result' as const,
  matchid: 14272,
  map_number: 0,
  map_name: 'de_inferno',
  team1: {
    score: 16,
    players: [
      {
        steamid: '76561198279375306',
        name: 'Alpha',
        stats: { kills: 20, deaths: 10, assists: 5, headshots: 8, mvp: 2, score: 42 },
      },
    ],
  },
  team2: {
    score: 14,
    players: [
      {
        steamid: '76561198000000001',
        name: 'Beta',
        stats: { kills: 15, deaths: 18, assists: 3, score: 30 },
      },
    ],
  },
  winner: { team: 'team1' as const },
};

describe('parseMatchWebhook', () => {
  it('parses MatchZy map_result', () => {
    const n = parseMatchWebhook(matchZySample);
    expect(n.source).toBe('matchzy');
    expect(n.game).toBe('cs2');
    expect(n.externalMatchId).toBe('14272-0');
    expect(n.map).toBe('de_inferno');
    expect(n.team1Score).toBe(16);
    expect(n.team2Score).toBe(14);
    expect(n.winner).toBe('team1');
    expect(n.players).toHaveLength(2);
    expect(n.players[0]?.steamId64).toBe('76561198279375306');
    expect(n.players[0]?.kills).toBe(20);
  });

  it('parses Get5 series_end with stats.players map', () => {
    const body = {
      event: 'series_end',
      matchid: 'get5-42',
      map_name: 'de_dust2',
      team1: {
        series_score: 2,
        stats: {
          players: {
            '76561198279375306': { kills: 40, deaths: 30, assists: 10, score: 80 },
          },
        },
      },
      team2: {
        series_score: 1,
        stats: {
          players: {
            '76561198000000001': { kills: 35, deaths: 35, assists: 8, score: 70 },
          },
        },
      },
    };
    const n = parseMatchWebhook(body);
    expect(n.externalMatchId).toBe('get5-42-series');
    expect(n.game).toBe('csgo');
    expect(n.map).toBe('de_dust2');
    expect(n.team1Score).toBe(2);
    expect(n.team2Score).toBe(1);
    expect(n.players).toHaveLength(2);
  });

  it('parses Get5-style players record as csgo', () => {
    const body = {
      event: 'map_result',
      matchid: 99,
      map_number: 0,
      map_name: 'de_mirage',
      team1: {
        score: 16,
        players: {
          '76561198279375306': { kills: 10, deaths: 10, assists: 2, score: 20 },
        },
      },
      team2: {
        score: 14,
        players: {
          '76561198000000001': { kills: 9, deaths: 11, assists: 1, score: 18 },
        },
      },
    };
    const coerced = coerceGet5PlayersRecords(body);
    expect(Array.isArray((coerced as { team1: { players: unknown } }).team1.players)).toBe(true);
    const n = parseMatchWebhook(body);
    expect(n.source).toBe('get5');
    expect(n.game).toBe('csgo');
  });
});
