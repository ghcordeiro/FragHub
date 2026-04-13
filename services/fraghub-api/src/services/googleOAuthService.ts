import { OAuth2Client } from 'google-auth-library';
import type { Env } from '../config/env';

export function createGoogleClient(env: Env): OAuth2Client {
  return new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

export function buildGoogleAuthUrl(client: OAuth2Client, state: string): string {
  return client.generateAuthUrl({
    access_type: 'online',
    prompt: 'select_account',
    scope: ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    state,
  });
}

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
};

export async function verifyGoogleAuthCode(
  client: OAuth2Client,
  code: string,
  audience: string,
): Promise<GoogleProfile> {
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Missing id_token');
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google profile');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0] ?? 'User',
  };
}
