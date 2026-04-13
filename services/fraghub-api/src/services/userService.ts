import type { Knex } from 'knex';

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  google_id: string | null;
  steam_id: string | null;
};

export async function findUserByEmail(trx: Knex, email: string): Promise<UserRow | undefined> {
  return trx<UserRow>('users').where({ email }).first();
}

export async function findUserById(trx: Knex, id: number): Promise<UserRow | undefined> {
  return trx<UserRow>('users').where({ id }).first();
}

export async function findUserByGoogleId(trx: Knex, googleId: string): Promise<UserRow | undefined> {
  return trx<UserRow>('users').where({ google_id: googleId }).first();
}

export async function insertUser(
  trx: Knex,
  row: {
    email: string;
    password_hash: string;
    display_name: string;
    role: string;
    google_id?: string | null;
  },
): Promise<number> {
  const [insertId] = await trx('users').insert({
    email: row.email,
    password_hash: row.password_hash,
    display_name: row.display_name,
    role: row.role,
    google_id: row.google_id ?? null,
  });
  return Number(insertId);
}

export async function updateUserGoogleId(trx: Knex, userId: number, googleId: string): Promise<void> {
  await trx('users').where({ id: userId }).update({ google_id: googleId, updated_at: trx.fn.now() });
}

export function toPublicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    role: u.role,
  };
}
