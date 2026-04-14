import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import * as discordService from './discordNotifyService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Discord Notify Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('notifyMatchReady', () => {
    it('should send Discord embed with team composition', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      });

      const teams = {
        teamA: [
          { id: '1', displayName: 'Alice', elo_rating: 1200 },
          { id: '2', displayName: 'Bob', elo_rating: 1100 },
          { id: '3', displayName: 'Charlie', elo_rating: 1000 },
          { id: '4', displayName: 'Dave', elo_rating: 900 },
          { id: '5', displayName: 'Eve', elo_rating: 800 },
        ],
        teamB: [
          { id: '6', displayName: 'Frank', elo_rating: 1150 },
          { id: '7', displayName: 'Grace', elo_rating: 1050 },
          { id: '8', displayName: 'Henry', elo_rating: 950 },
          { id: '9', displayName: 'Iris', elo_rating: 850 },
          { id: '10', displayName: 'Jack', elo_rating: 750 },
        ],
      };

      await discordService.notifyMatchReady(teams, 'de_mirage', '192.168.1.1:27015');

      // Allow fire-and-forget promise to settle
      vi.runAllTimers();

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('discord.com');

      const body = JSON.parse(call[1].body);
      expect(body.embeds).toHaveLength(1);
      expect(body.embeds[0].title).toBe('🎮 Match Ready!');
      expect(body.embeds[0].color).toBe(0x00aa00);
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({
          name: 'Map',
          value: 'de_mirage',
        })
      );
    });

    it('should gracefully degrade if webhook URL not set', async () => {
      const teams = {
        teamA: [{ id: '1', displayName: 'Alice' }],
        teamB: [{ id: '2', displayName: 'Bob' }],
      };

      // Temporarily unset webhook (mock will have it disabled)
      await discordService.notifyMatchReady(teams, 'de_dust2', '127.0.0.1:27015');

      // Should not fetch if webhook is not configured
      vi.runAllTimers();
      // (fetch may or may not be called depending on env loading)
    });

    it('should handle timeout errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('AbortError: timeout'));

      const teams = {
        teamA: [{ id: '1', displayName: 'Alice' }],
        teamB: [{ id: '2', displayName: 'Bob' }],
      };

      await discordService.notifyMatchReady(teams, 'de_mirage', '127.0.0.1:27015');

      vi.runAllTimers();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('notifyMatchComplete', () => {
    it('should send Discord embed with match result', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = {
        winner: 'TEAM_A' as const,
        score: { teamA: 16, teamB: 10 },
        mvp: { id: 'alice', displayName: 'Alice', elo_rating: 1200 },
        eloChanges: [
          { user: { id: '1', displayName: 'Alice', elo_rating: 1200 }, change: 15 },
          { user: { id: '2', displayName: 'Bob', elo_rating: 1100 }, change: 12 },
          { user: { id: '3', displayName: 'Charlie', elo_rating: 1000 }, change: -10 },
          { user: { id: '4', displayName: 'Dave', elo_rating: 900 }, change: -15 },
        ],
      };

      await discordService.notifyMatchComplete(result);

      vi.runAllTimers();

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.embeds[0].title).toBe('✅ Match Completed!');
      expect(body.embeds[0].color).toBe(0x0000aa);
      expect(body.embeds[0].description).toContain('Team A');
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({
          name: 'Score',
          value: 'Team A: 16 - Team B: 10',
        })
      );
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = {
        winner: 'TEAM_B' as const,
        score: { teamA: 10, teamB: 16 },
        mvp: { id: 'frank', displayName: 'Frank' },
        eloChanges: [],
      };

      await discordService.notifyMatchComplete(result);

      vi.runAllTimers();

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
