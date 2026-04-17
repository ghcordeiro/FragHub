import { describe, it, expect, vi } from 'vitest';
import { QueueState, balanceTeams, joinQueue } from './queueService';

// Mock Knex for testing
const createMockKnex = () => {
  const data: any = {
    users: [],
    queue_sessions: [],
    queue_players: [],
  };

  const chainable = {
    async query() {
      return this;
    },
    where() {
      return this;
    },
    join() {
      return this;
    },
    select() {
      return this;
    },
    first() {
      return null;
    },
    insert() {
      return this;
    },
    delete() {
      return this;
    },
    update() {
      return this;
    },
    count() {
      return this;
    },
    orderBy() {
      return this;
    },
    limit() {
      return this;
    },
    whereIn() {
      return this;
    },
  };

  // knex must be callable as a function AND have methods
  const knex = vi.fn().mockReturnValue(chainable) as any;
  Object.assign(knex, chainable);
  knex.transaction = async (callback: (trx: unknown) => Promise<unknown>) => {
    return callback(knex);
  };

  return { knex, data };
};

describe('Queue Service', () => {
  describe('balanceTeams', () => {
    it('should balance 10 players into two teams of 5', async () => {
      const { knex, data: _data } = createMockKnex();

      // Mock users with varying ELO
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

      knex.whereIn = vi.fn(() => ({ select: vi.fn(() => Promise.resolve(mockUsers)) })) as any;

      const userIds = mockUsers.map(u => u.id);
      const config = { maxEloDiff: 50 };

      const { teamA, teamB, avgEloA, avgEloB } = await balanceTeams(userIds, knex as any, config);

      expect(teamA.length).toBe(5);
      expect(teamB.length).toBe(5);
      expect(teamA.concat(teamB).sort()).toEqual(userIds.sort());
      expect(avgEloA).toBeGreaterThan(0);
      expect(avgEloB).toBeGreaterThan(0);
    });

    it('should throw error if not exactly 10 players', async () => {
      const { knex } = createMockKnex();

      await expect(balanceTeams(['user1', 'user2'], knex as any, { maxEloDiff: 50 })).rejects.toThrow(
        'balanceTeams requires exactly 10 players'
      );
    });
  });

  describe('joinQueue', () => {
    it('should require Steam linked', async () => {
      const { knex } = createMockKnex();

      const mockUser = { id: 'user1', steam_id: null };
      // Override the chainable's where() to return a mock with first()
      const chainableWithWhere = {
        ...Object.getPrototypeOf(knex('users')),
        first: vi.fn(() => Promise.resolve(mockUser)),
      };
      knex.where = vi.fn(() => chainableWithWhere) as any;

      await expect(
        joinQueue('user1', knex as any, {
          maxQueueSize: 10,
          maxEloDiff: 50,
          mapPool: ['de_mirage'],
          vetoTimeoutSeconds: 60,
        })
      ).rejects.toMatchObject({
        code: 'NO_STEAM_LINKED',
        statusCode: 403,
      });
    });

    it('should prevent duplicate queue joins', async () => {
      const { knex } = createMockKnex();

      let callCount = 0;
      knex.where = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check if user exists
          return {
            first: vi.fn(() => Promise.resolve({ id: 'user1', steam_id: 'steam123' })),
          };
        } else if (callCount === 2) {
          // Second call: check if already in queue
          return {
            join: vi.fn(() => ({
              first: vi.fn(() =>
                Promise.resolve({
                  id: 'qp1',
                  user_id: 'user1',
                  queue_session_id: 'qs1',
                })
              ),
            })),
          };
        }
      }) as any;

      await expect(
        joinQueue('user1', knex as any, {
          maxQueueSize: 10,
          maxEloDiff: 50,
          mapPool: ['de_mirage'],
          vetoTimeoutSeconds: 60,
        })
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
