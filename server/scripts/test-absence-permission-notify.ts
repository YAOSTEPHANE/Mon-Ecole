/**
 * Test bout-en-bout : demande de permission d'absence + notifications.
 * Usage : npx tsx scripts/test-absence-permission-notify.ts
 */
const API = (process.env.API_URL ?? 'http://localhost:5000/api').replace(/\/+$/, '');
const PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

type Json = Record<string, unknown>;

async function login(email: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = (await res.json()) as Json;
  if (!res.ok || typeof body.token !== 'string') {
    throw new Error(`Login ${email} failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.token;
}

async function api<T = unknown>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    body = text as T;
  }
  return { status: res.status, body };
}

function hasNotification(
  list: unknown[],
  predicate: (n: Json) => boolean,
): boolean {
  return list.some((item) => predicate(item as Json));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('=== Test permissions d\'absence + notifications ===\n');

  const studentToken = await login('student1@school.com');
  const adminToken = await login('admin@school.com');
  const parentToken = await login('parent1@school.com');

  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);

  const createPayload = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    motif: 'MEDICAL',
    reasonDetail: 'Test automatique — consultation médicale programmée pour validation des notifications.',
    justificationDocuments: [],
  };

  console.log('1. Création demande (élève)...');
  const created = await api<Json>('/student/absence-permission-requests', studentToken, {
    method: 'POST',
    body: JSON.stringify(createPayload),
  });
  if (created.status !== 201) {
    throw new Error(`Create failed: ${created.status} ${JSON.stringify(created.body)}`);
  }
  const requestId = String(created.body.id);
  console.log(`   Demande créée : ${requestId}`);

  await sleep(1500);

  console.log('2. Vérification notifications après création...');
  const adminNotifs = await api<unknown[]>('/admin/notifications', adminToken);
  const parentNotifs = await api<unknown[]>('/parent/notifications', parentToken);

  const adminHasNew = hasNotification(
    Array.isArray(adminNotifs.body) ? adminNotifs.body : [],
    (n) =>
      n.type === 'absence_permission' &&
      String(n.title ?? '').includes('Nouvelle permission'),
  );
  const parentHasSubmitted = hasNotification(
    Array.isArray(parentNotifs.body) ? parentNotifs.body : [],
    (n) =>
      n.type === 'absence_permission' &&
      String(n.title ?? '').includes('déposée'),
  );

  console.log(`   Admin notif nouvelle demande : ${adminHasNew ? 'OK' : 'MANQUANT'}`);
  console.log(`   Parent notif dépôt élève   : ${parentHasSubmitted ? 'OK' : 'MANQUANT'}`);

  console.log('3. Approbation par admin...');
  const decision = await api<Json>(
    `/admin/absence-permission-requests/${requestId}`,
    adminToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'APPROVED', adminComment: 'Test auto — approuvé.' }),
    },
  );
  if (decision.status !== 200) {
    throw new Error(`Approve failed: ${decision.status} ${JSON.stringify(decision.body)}`);
  }
  console.log(`   Statut : ${String(decision.body.status)}`);

  await sleep(1500);

  console.log('4. Vérification notifications après décision...');
  const studentNotifs = await api<unknown[]>('/student/notifications', studentToken);
  const parentAfter = await api<unknown[]>('/parent/notifications', parentToken);

  const studentHasDecision = hasNotification(
    Array.isArray(studentNotifs.body) ? studentNotifs.body : [],
    (n) =>
      n.type === 'absence_permission' &&
      String(n.title ?? '').includes('approuvée'),
  );
  const parentHasDecision = hasNotification(
    Array.isArray(parentAfter.body) ? parentAfter.body : [],
    (n) =>
      n.type === 'absence_permission' &&
      String(n.title ?? '').includes('approuvée'),
  );

  console.log(`   Élève notif approuvée  : ${studentHasDecision ? 'OK' : 'MANQUANT'}`);
  console.log(`   Parent notif approuvée : ${parentHasDecision ? 'OK' : 'MANQUANT'}`);

  const allOk =
    adminHasNew && parentHasSubmitted && studentHasDecision && parentHasDecision;
  console.log(`\n${allOk ? '✅ Tous les contrôles in-app OK' : '⚠️ Certains contrôles in-app ont échoué'}`);
  console.log('(Les e-mails nécessitent SMTP_HOST/SMTP_USER dans server/.env)');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});
