import { createHash } from 'node:crypto';
import type { Knex } from 'knex';

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

export async function insertRefreshToken(
  trx: Knex,
  userId: number,
  rawToken: string,
  deviceId: string | undefined,
): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_SEC * 1000);
  await trx('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenHash,
    device_id: deviceId ?? null,
    expires_at: expiresAt,
    revoked_at: null,
  });
}

export async function revokeRefreshByHash(trx: Knex, tokenHash: string): Promise<void> {
  await trx('refresh_tokens').where({ token_hash: tokenHash }).update({ revoked_at: trx.fn.now() });
}

export async function revokeAllForUser(trx: Knex, userId: number): Promise<void> {
  await trx('refresh_tokens').where({ user_id: userId }).whereNull('revoked_at').update({ revoked_at: trx.fn.now() });
}

export async function revokeRefreshForDevice(trx: Knex, userId: number, deviceId: string): Promise<void> {
  await trx('refresh_tokens')
    .where({ user_id: userId, device_id: deviceId })
    .whereNull('revoked_at')
    .update({ revoked_at: trx.fn.now() });
}

type Row = {
  id: number;
  user_id: number;
  token_hash: string;
  revoked_at: Date | null;
  expires_at: Date;
};

export async function findRefreshByHash(trx: Knex, tokenHash: string): Promise<Row | undefined> {
  const row = await trx<Row>('refresh_tokens').where({ token_hash: tokenHash }).first();
  return row;
}
