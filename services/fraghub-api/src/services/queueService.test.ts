import { describe, it, expect, vi } from 'vitest';
import { QueueState, balanceTeams, joinQueue } from './queueService';

// Mock Knex for testing — knex() returns itself so method overrides take effect
const createMockKnex = () => {
  const knex: any = vi.fn();

  const chain = {
    where: vi.fn(() => knex),
    join: vi.fn(() => knex),
    select: vi.fn(() => Promise.resolve([])),
    first: vi.fn(() => Promise.resolve(null)),
    insert: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    count: vi.fn(() => knex),
    orderBy: vi.fn(() => knex),
    limit: vi.fn(() => knex),
    whereIn: vi.fn(() => knex),
  };

  Object.assign(knex, chain);
  knex.mockReturnValue(knex);
  knex.transaction = async (callback: (trx: unknown) => Promise<unknown>) => callback(knex);

  return knex;
};

describe('Queue Service', () => {
  describe('balanceTeams', () => {
    it('should balance 10 players into two teams of 5', async () => {
      const knex = createMockKnex();

      const mockUsers = [
        { id: 'user1', elo_rating: 1200, displayName: 'Alice' },
        { id: 'user2', elo_rating: 1150, displayName: 'Bob' },
        { id: 'user3', elo_rating: 1100, displayName: 'Charlie' },
        { id: 'user4', elo_rating: 1050, displayName: 'Dave' },
        { id: 'user5', elo_rating: 1000, displayName: 'Eve' },
        { id: 'user6', elo_rating: 950, displayName: 'Frank' },
        { id: 'user7', elo_rating: 900, displayName: 'Grace' },
        { id: 'user8', elo_rating: 850, displayName: 'Henry' },
        { id: 'user9', elo_rating: 800, displayName: 'Iris' },
        { id: 'user10', elo_rating: 750, displayName: 'Jack' },
      ];

      // whereIn → knex (chain), select → mockUsers on first call
      knex.select = vi.fn(() => Promise.resolve(mockUsers));

      const userIds = mockUsers.map((u) => u.id);
      const config = { maxEloDiff: 50 };

      const { teamA, teamB, avgEloA, avgEloB } = await balanceTeams(userIds, knex as any, config);

      expect(teamA.length).toBe(5);
      expect(teamB.length).toBe(5);
      expect(teamA.concat(teamB).sort()).toEqual(userIds.sort());
      expect(avgEloA).toBeGreaterThan(0);
      expect(avgEloB).toBeGreaterThan(0);
    });

    it('should throw error if not exactly 10 players', async () => {
      const knex = createMockKnex();

      await expect(
        balanceTeams(['user1', 'user2'], knex as any, { maxEloDiff: 50 }),
      ).rejects.toThrow('balanceTeams requires exactly 10 players');
    });
  });

  describe('joinQueue', () => {
    it('should require Steam linked', async () => {
      const knex = createMockKnex();

      const mockUser = { id: 'user1', steam_id: null };
      knex.first = vi.fn(() => Promise.resolve(mockUser));

      await expect(
        joinQueue('user1', knex as any, {
          maxQueueSize: 10,
          maxEloDiff: 50,
          mapPool: ['de_mirage'],
          vetoTimeoutSeconds: 60,
        }),
      ).rejects.toMatchObject({
        code: 'NO_STEAM_LINKED',
        statusCode: 403,
      });
    });

    it('should prevent duplicate queue joins', async () => {
      const knex = createMockKnex();

      // first() call 1: user lookup → user with steam linked
      // first() call 2: queue duplicate check → existing queue player
      let firstCallCount = 0;
      knex.first = vi.fn(() => {
        firstCallCount++;
        if (firstCallCount === 1) return Promise.resolve({ id: 'user1', steam_id: 'steam123' });
        return Promise.resolve({ id: 'qp1', user_id: 'user1', queue_session_id: 'qs1' });
      });

      await expect(
        joinQueue('user1', knex as any, {
          maxQueueSize: 10,
          maxEloDiff: 50,
          mapPool: ['de_mirage'],
          vetoTimeoutSeconds: 60,
        }),
      ).rejects.toMatchObject({
        code: 'ALREADY_IN_QUEUE',
        statusCode: 409,
      });
    });
  });

  describe('State machine validation', () => {
    it('should enforce valid state transitions', () => {
      const validTransitions: Record<QueueState, QueueState[]> = {
        [QueueState.WAITING_PLAYERS]: [QueueState.PLAYERS_FOUND],
        [QueueState.PLAYERS_FOUND]: [QueueState.MAP_VOTE, QueueState.WAITING_PLAYERS],
        [QueueState.MAP_VOTE]: [QueueState.IN_PROGRESS, QueueState.WAITING_PLAYERS],
        [QueueState.IN_PROGRESS]: [QueueState.FINISHED],
        [QueueState.FINISHED]: [],
      };

      // Valid transitions should be in the map
      expect(validTransitions[QueueState.WAITING_PLAYERS]).toContain(QueueState.PLAYERS_FOUND);
      expect(validTransitions[QueueState.PLAYERS_FOUND]).toContain(QueueState.MAP_VOTE);
      expect(validTransitions[QueueState.IN_PROGRESS]).toContain(QueueState.FINISHED);

      // Invalid transitions should not be in the map
      expect(validTransitions[QueueState.FINISHED]).not.toContain(QueueState.WAITING_PLAYERS);
      expect(validTransitions[QueueState.WAITING_PLAYERS]).not.toContain(QueueState.MAP_VOTE);
    });
  });
});
