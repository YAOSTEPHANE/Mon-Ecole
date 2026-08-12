import type { PrismaClient } from '@prisma/client';

export const API = (process.env.API_URL ?? 'http://localhost:5000/api').replace(/\/+$/, '');
export const PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

export type Json = Record<string, unknown>;

export type TestContext = {
  marker: string;
  today: string;
  year: string;
  schoolId?: string;
  studentId: string;
  classId: string;
  courseId: string;
  teacherId: string;
  teacherUserId: string;
  parentUserId: string;
  childId: string;
  tokens: {
    admin: string;
    teacher: string;
    parent: string;
    student: string;
    educator: string;
    nurse: string;
  };
};

export type PersistEntry = {
  label: string;
  id: string;
  verifyDb: (prisma: PrismaClient) => Promise<boolean>;
  verifyApi?: (ctx: TestContext, token: string) => Promise<boolean>;
};

let passed = 0;
let failed = 0;
let skipped = 0;

export function assert(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`  OK ${name}`);
    return;
  }
  failed += 1;
  console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
}

export function skip(name: string, reason: string): void {
  skipped += 1;
  console.log(`  SKIP ${name} (${reason})`);
}

export function getStats() {
  return { passed, failed, skipped };
}

export async function req(
  path: string,
  init: RequestInit & { token?: string; schoolId?: string; cookie?: string } = {},
): Promise<{ status: number; body: Json | unknown[] | string }> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.schoolId) headers['X-School-Id'] = init.schoolId;
  if (init.cookie) headers.Cookie = init.cookie;
  if (init.body && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${API}${path}`, { ...init, headers, signal: controller.signal });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) as Json | unknown[] };
    } catch {
      return { status: res.status, body: text };
    }
  } catch (e) {
    return { status: 0, body: `fetch error: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function login(email: string): Promise<string | null> {
  const { status, body } = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (status !== 200 || typeof body !== 'object' || body === null || !('token' in body)) {
    return null;
  }
  return String((body as Json).token);
}

export function asArray(body: Json | unknown[] | string | null): Json[] {
  if (Array.isArray(body)) return body as Json[];
  if (body && typeof body === 'object') {
    for (const key of ['students', 'items', 'data', 'rows', 'messages', 'announcements']) {
      if (Array.isArray((body as Json)[key])) return (body as Json)[key] as Json[];
    }
  }
  return [];
}

export function findInList(list: Json[], id: string): Json | undefined {
  return list.find((row) => String(row.id ?? '') === id);
}

export function extractId(
  res: { status: number; body: Json | unknown[] | string },
  okStatuses: number[] = [200, 201],
): string | null {
  if (!okStatuses.includes(res.status)) return null;
  if (typeof res.body !== 'object' || res.body === null || Array.isArray(res.body)) return null;
  const id = (res.body as Json).id;
  return id ? String(id) : null;
}

export function futureIso(hoursAhead: number): string {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
}

export function futureDateOnly(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export async function verifyAll(entries: PersistEntry[], ctx: TestContext, prisma: PrismaClient): Promise<void> {
  console.log('\n== Relecture API (nouvelles sessions) ==');
  const adminToken2 = await login('admin@school.com');
  assert('Login admin (session 2)', !!adminToken2);

  for (const entry of entries) {
    if (entry.verifyApi && adminToken2) {
      const ok = await entry.verifyApi(ctx, adminToken2);
      assert(`API: ${entry.label}`, ok, entry.id);
    }
  }

  console.log('\n== Relecture Prisma (MongoDB) ==');
  for (const entry of entries) {
    const ok = await entry.verifyDb(prisma);
    assert(`DB: ${entry.label}`, ok, entry.id);
  }
}
