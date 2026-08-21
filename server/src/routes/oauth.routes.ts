import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { generateToken, uploadAccessSigningMaterial } from '../utils/jwt.util';
import { setAuthSessionCookie } from '../utils/auth-cookie.util';
import { authLoginLimiter } from '../middleware/rate-limit.middleware';

const router = express.Router();

type OAuthProvider = 'google' | 'microsoft';

type OAuthClient = 'web' | 'mobile';

type OAuthStatePayload = {
  p: OAuthProvider;
  n: string;
  c?: OAuthClient;
};

function mobileRedirectBase(): string {
  return (
    process.env.MOBILE_OAUTH_REDIRECT_URI?.trim() || 'ecoleajour://oauth'
  ).replace(/\/+$/, '');
}

function successRedirect(client: OAuthClient, code: string, provider: OAuthProvider): string {
  if (client === 'mobile') {
    return `${mobileRedirectBase()}?code=${encodeURIComponent(code)}&provider=${provider}`;
  }
  return `${frontendBase()}/login/oauth/callback?code=${encodeURIComponent(code)}&provider=${provider}`;
}

function errorRedirect(client: OAuthClient, msg: string): string {
  if (client === 'mobile') {
    return `${mobileRedirectBase()}?error=${encodeURIComponent(msg)}`;
  }
  return `${frontendBase()}/login/oauth/callback?error=${encodeURIComponent(msg)}`;
}

function frontendBase(): string {
  const raw = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0]?.trim();
  return (raw || 'http://localhost:3000').replace(/\/+$/, '');
}

function apiPublicBase(req: express.Request): string {
  const configured = process.env.OAUTH_API_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0]?.trim();
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
  const prefix = process.env.VERCEL === '1' ? '' : '/api';
  return `${proto}://${host}${prefix}`;
}

function oauthEnabled(provider: OAuthProvider): boolean {
  if (provider === 'google') {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
    );
  }
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim(),
  );
}

function signOAuthState(provider: OAuthProvider, client: OAuthClient): string {
  const payload: OAuthStatePayload = {
    p: provider,
    n: crypto.randomBytes(8).toString('hex'),
    c: client,
  };
  return jwt.sign(payload, uploadAccessSigningMaterial(), {
    expiresIn: '10m',
    algorithm: 'HS256',
  });
}

function parseOAuthState(
  state: string,
  provider: OAuthProvider,
): { ok: true; client: OAuthClient } | { ok: false } {
  try {
    const decoded = jwt.verify(state, uploadAccessSigningMaterial(), {
      algorithms: ['HS256'],
    }) as OAuthStatePayload;
    if (decoded.p !== provider || typeof decoded.n !== 'string') return { ok: false };
    return { ok: true, client: decoded.c === 'mobile' ? 'mobile' : 'web' };
  } catch {
    return { ok: false };
  }
}

router.get('/providers', (_req, res) => {
  res.json({
    google: oauthEnabled('google'),
    microsoft: oauthEnabled('microsoft'),
  });
});

router.get('/:provider/start', (req, res) => {
  const provider = req.params.provider as OAuthProvider;
  if (provider !== 'google' && provider !== 'microsoft') {
    return res.status(404).json({ error: 'Fournisseur inconnu' });
  }
  if (!oauthEnabled(provider)) {
    return res.status(503).json({
      error: `SSO ${provider} non configuré (variables d’environnement manquantes)`,
    });
  }

  const client: OAuthClient = req.query.client === 'mobile' ? 'mobile' : 'web';
  const state = signOAuthState(provider, client);
  const redirectUri = `${apiPublicBase(req)}/auth/oauth/${provider}/callback`;

  if (provider === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');
    return res.redirect(url.toString());
  }

  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || 'common';
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID!);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile User.Read');
  url.searchParams.set('state', state);
  url.searchParams.set('response_mode', 'query');
  return res.redirect(url.toString());
});

type OAuthProfile = {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
};

async function exchangeGoogle(code: string, redirectUri: string): Promise<OAuthProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error('Échange token Google échoué');
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error('access_token Google manquant');

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw new Error('Profil Google inaccessible');
  const p = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    name?: string;
    email_verified?: boolean;
  };
  if (!p.sub || !p.email) throw new Error('Profil Google incomplet');
  if (p.email_verified === false) throw new Error('E-mail Google non vérifié');
  const parts = (p.name || '').trim().split(/\s+/);
  return {
    subject: p.sub,
    email: p.email.toLowerCase().trim(),
    firstName: p.given_name || parts[0] || 'Utilisateur',
    lastName: p.family_name || parts.slice(1).join(' ') || 'SSO',
  };
}

async function exchangeMicrosoft(code: string, redirectUri: string): Promise<OAuthProfile> {
  const tenant = process.env.MICROSOFT_TENANT_ID?.trim() || 'common';
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    },
  );
  if (!tokenRes.ok) throw new Error('Échange token Microsoft échoué');
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error('access_token Microsoft manquant');

  const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw new Error('Profil Microsoft inaccessible');
  const p = (await profileRes.json()) as {
    id?: string;
    mail?: string;
    userPrincipalName?: string;
    givenName?: string;
    surname?: string;
    displayName?: string;
  };
  const email = (p.mail || p.userPrincipalName || '').toLowerCase().trim();
  if (!p.id || !email) throw new Error('Profil Microsoft incomplet');
  const parts = (p.displayName || '').trim().split(/\s+/);
  return {
    subject: p.id,
    email,
    firstName: p.givenName || parts[0] || 'Utilisateur',
    lastName: p.surname || parts.slice(1).join(' ') || 'SSO',
  };
}

async function findOAuthUser(provider: OAuthProvider, profile: OAuthProfile) {
  const oauthKey = `${provider}:${profile.subject}`;
  const byOauth = await prisma.user.findFirst({
    where: {
      OR: [
        { oauthKey },
        { oauthProvider: provider, oauthSubject: profile.subject },
      ],
    },
  });
  if (byOauth) {
    if (!byOauth.isActive) throw new Error('Compte désactivé');
    if (!byOauth.oauthKey) {
      return prisma.user.update({
        where: { id: byOauth.id },
        data: { oauthKey, oauthProvider: provider, oauthSubject: profile.subject },
      });
    }
    return byOauth;
  }

  const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    if (!byEmail.isActive) throw new Error('Compte désactivé');
    throw new Error(
      'Ce compte n’est pas encore lié à ce fournisseur SSO. Contactez un administrateur.',
    );
  }

  throw new Error('Compte SSO non autorisé. Contactez un administrateur.');
}

function hashExchangeCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function createExchangeCode(userId: string, provider: OAuthProvider): Promise<string> {
  const code = crypto.randomBytes(32).toString('base64url');
  await prisma.oAuthExchangeCode.create({
    data: {
      codeHash: hashExchangeCode(code),
      userId,
      provider,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    },
  });
  return code;
}

router.post('/exchange', authLoginLimiter, async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code || code.length > 128) {
    return res.status(400).json({ error: 'Code OAuth invalide' });
  }

  try {
    const now = new Date();
    const codeHash = hashExchangeCode(code);
    const exchange = await prisma.oAuthExchangeCode.findUnique({ where: { codeHash } });
    if (!exchange || exchange.usedAt || exchange.expiresAt <= now) {
      return res.status(401).json({ error: 'Code OAuth invalide ou expiré' });
    }

    const claimed = await prisma.oAuthExchangeCode.updateMany({
      where: { codeHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) {
      return res.status(401).json({ error: 'Code OAuth déjà utilisé' });
    }

    const user = await prisma.user.findUnique({ where: { id: exchange.userId } });
    if (!user?.isActive) {
      return res.status(401).json({ error: 'Compte indisponible' });
    }

    res.setHeader('Cache-Control', 'no-store');
    const token = generateToken(user.id, user.email, user.role, user.tokenVersion ?? 0);
    setAuthSessionCookie(res, token);
    return res.json({ token });
  } catch (e) {
    console.error('POST /oauth/exchange:', e);
    return res.status(500).json({ error: 'Impossible de finaliser la connexion SSO' });
  }
});

router.get('/:provider/callback', async (req, res) => {
  const provider = req.params.provider as OAuthProvider;
  let client: OAuthClient = 'web';
  const fail = (msg: string) => res.redirect(errorRedirect(client, msg));

  try {
    if (provider !== 'google' && provider !== 'microsoft') {
      return fail('Fournisseur inconnu');
    }
    if (!oauthEnabled(provider)) return fail('SSO non configuré');

    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };
    if (error) return fail(String(error));
    if (!code || !state) return fail('Autorisation incomplète');
    const parsed = parseOAuthState(state, provider);
    if (!parsed.ok) return fail('State OAuth invalide');
    client = parsed.client;

    const redirectUri = `${apiPublicBase(req)}/auth/oauth/${provider}/callback`;
    const profile =
      provider === 'google'
        ? await exchangeGoogle(code, redirectUri)
        : await exchangeMicrosoft(code, redirectUri);

    const user = await findOAuthUser(provider, profile);
    const exchangeCode = await createExchangeCode(user.id, provider);
    return res.redirect(successRedirect(client, exchangeCode, provider));
  } catch (e) {
    console.error('OAuth callback:', e);
    return fail(e instanceof Error ? e.message : 'Connexion SSO échouée');
  }
});

export default router;
