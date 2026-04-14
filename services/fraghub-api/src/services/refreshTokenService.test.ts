import { describe, expect, it, vi } from 'vitest';
import { hashRefreshToken, insertRefreshToken, revokeRefreshByHash, revokeAllForUser, revokeRefreshForDevice, findRefreshByHash } from './refreshTokenService';

// Minimal Knex mock builder
function makeKnex(opts: {
  insertResult?: unknown;
  updateResult?: unknown;
  firstResult?: unknown;
}) {
  const chainable = {
    insert: vi.fn().mockResolvedValue(opts.insertResult ?? [1]),
    where: vi.fn(),
    whereNull: vi.fn(),
    update: vi.fn().mockResolvedValue(opts.updateResult ?? 1),
    first: vi.fn().mockResolvedValue(opts.firstResult ?? undefined),
    fn: { now: () => new Date() },
  };

  // Allow chaining: where().whereNull().update()
  chainable.where.mockReturnValue(chainable);
  chainable.whereNull.mockReturnValue(chainable);

  const trxFn = vi.fn((_table: string) => chainable) as unknown as import('knex').Knex;
  (trxFn as unknown as Record<string, unknown>).fn = { now: () => new Date() };

  return { trxFn, chainable };
}

describe('hashRefreshToken', () => {
  it('returns a 64-char hex string', () => {
    const hash = hashRefreshToken('my-raw-token');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashRefreshToken('token')).toBe(hashRefreshToken('token'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashRefreshToken('tokenA')).not.toBe(hashRefreshToken('tokenB'));
  });
});

describe('insertRefreshToken', () => {
  it('inserts a token record with correct shape', async () => {
    const { trxFn, chainable } = makeKnex({ insertResult: [1] });

    await insertRefreshToken(trxFn, 5, 'raw-token', 'device-1');

    expect(chainable.insert).toHaveBeenCalledOnce();
    const call = chainable.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(call.user_id).toBe(5);
    expect(call.token_hash).toHaveLength(64); // sha256 hex
    expect(call.device_id).toBe('device-1');
    expect(call.revoked_at).toBeNull();
    expect(call.expires_at).toBeInstanceOf(Date);
  });

  it('sets device_id to null when undefined', async () => {
    const { trxFn, chainable } = makeKnex({ insertResult: [1] });

    await insertRefreshToken(trxFn, 1, 'raw-token', undefined);

    const call = chainable.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(call.device_id).toBeNull();
  });
});

describe('revokeRefreshByHash', () => {
  it('calls update with revoked_at on matching token_hash', async () => {
    const { trxFn, chainable } = makeKnex({});
    const hash = hashRefreshToken('test');

    await revokeRefreshByHash(trxFn, hash);

    expect(chainable.where).toHaveBeenCalledWith({ token_hash: hash });
    expect(chainable.update).toHaveBeenCalledOnce();
  });
});

describe('revokeAllForUser', () => {
  it('calls where user_id, whereNull revoked_at, then update', async () => {
    const { trxFn, chainable } = makeKnex({});

    await revokeAllForUser(trxFn, 42);

    expect(chainable.where).toHaveBeenCalledWith({ user_id: 42 });
    expect(chainable.whereNull).toHaveBeenCalledWith('revoked_at');
    expect(chainable.update).toHaveBeenCalledOnce();
  });
});

describe('revokeRefreshForDevice', () => {
  it('calls where with user_id and device_id, whereNull revoked_at, then update', async () => {
    const { trxFn, chainable } = makeKnex({});

    await revokeRefreshForDevice(trxFn, 7, 'my-device');

    expect(chainable.where).toHaveBeenCalledWith({ user_id: 7, device_id: 'my-device' });
    expect(chainable.whereNull).toHaveBeenCalledWith('revoked_at');
    expect(chainable.update).toHaveBeenCalledOnce();
  });
});

describe('findRefreshByHash', () => {
  it('returns the row when found', async () => {
    const mockRow = {
      id: 1,
      user_id: 3,
      token_hash: 'abc',
      revoked_at: null,
      expires_at: new Date(Date.now() + 10000),
    };
    const { trxFn } = makeKnex({ firstResult: mockRow });

    const result = await findRefreshByHash(trxFn, 'abc');
    expect(result).toBe(mockRow);
  });

  it('returns undefined when not found', async () => {
    const { trxFn } = makeKnex({ firstResult: undefined });

    const result = await findRefreshByHash(trxFn, 'nonexistent');
    expect(result).toBeUndefined();
  });
});
