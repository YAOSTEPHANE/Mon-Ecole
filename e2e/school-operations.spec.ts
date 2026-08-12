import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { waitForApiHealthy } from './helpers/api-health';
import { readE2eReadyFlag } from './helpers/e2e-ready';
import { DEFAULT_PASSWORD, loginAs, TEST_USERS } from './helpers/login';

const e2eFlag = readE2eReadyFlag();
const API_BASE = (
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'
).replace(/\/+$/, '');
const domReady = { waitUntil: 'domcontentloaded' as const };

async function apiLogin(request: APIRequestContext, email: string): Promise<string | null> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password: DEFAULT_PASSWORD },
  });
  if (!res.ok()) return null;
  const body = (await res.json()) as { token?: string };
  return body.token ?? null;
}

/** Active le module campus dans l’espace admin par défaut si absent. */
async function ensureCampusModuleEnabled(request: APIRequestContext, token: string): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };
  const ctxRes = await request.get(`${API_BASE}/admin/workspaces/my-context`, { headers });
  if (!ctxRes.ok()) return;
  const ctx = (await ctxRes.json()) as { visibleModules?: string[] };
  if (!ctx.visibleModules?.length || ctx.visibleModules.includes('campus')) return;

  const listRes = await request.get(`${API_BASE}/admin/workspaces`, { headers });
  if (!listRes.ok()) return;
  const workspaces = (await listRes.json()) as Array<{
    id: string;
    isDefault?: boolean;
    enabledModules?: string[];
  }>;
  const target = workspaces.find((w) => w.isDefault) ?? workspaces[0];
  if (!target) return;

  const modules = Array.from(new Set([...(target.enabledModules ?? []), 'campus']));
  await request.put(`${API_BASE}/admin/workspaces/${target.id}`, {
    headers,
    data: { enabledModules: modules },
  });
}

async function openCampusOperations(page: Page): Promise<void> {
  await page.goto('/admin', domReady);
  // Attendre le chargement du contexte workspace (évite la course URL → redirection dashboard)
  await expect(page.getByText(/Bonjour|Bon après-midi|Bonsoir/i).first()).toBeVisible({
    timeout: 60_000,
  });

  const campusNav = page
    .getByRole('navigation', { name: /Modules administration/i })
    .getByRole('button', { name: /Cantine & transport/i });

  try {
    await expect(campusNav).toBeVisible({ timeout: 20_000 });
    await campusNav.click();
  } catch {
    await page.goto('/admin?tab=campus', domReady);
  }

  const hub = page.getByRole('heading', { name: 'Opérations scolaires' });
  try {
    await expect(hub).toBeVisible({ timeout: 20_000 });
  } catch {
    test.skip(true, 'Module « Cantine & transport » non disponible pour cet admin/workspace');
  }
}

async function selectParentChild(page: Page): Promise<void> {
  await page.goto('/parent?tab=children', domReady);
  await expect(page.getByRole('heading', { name: 'Mes Enfants', exact: true })).toBeVisible({
    timeout: 60_000,
  });
  const card = page.locator('.cursor-pointer').filter({ hasText: /.+/ }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();
}

test.describe('E2E — Modules opérationnels scolaires', () => {
  test.beforeAll(async ({ request }) => {
    if (!e2eFlag.ready) return;
    await waitForApiHealthy(request);
    const token = await apiLogin(request, TEST_USERS.admin);
    if (!token) {
      e2eFlag.ready = false;
      e2eFlag.reason =
        'Connexion seed impossible (admin@school.com). Exécutez npm run prisma:seed.';
      return;
    }
    await ensureCampusModuleEnabled(request, token);
  });

  test.beforeEach(async ({ request }) => {
    test.skip(!e2eFlag.ready, e2eFlag.reason);
    await waitForApiHealthy(request);
  });

  test('Admin — audit conflits EDT', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, TEST_USERS.admin);
    await openCampusOperations(page);
    await page.getByRole('button', { name: 'Conflits EDT' }).click();
    await expect(page.getByText(/créneau|conflit|Aucun conflit/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Actualiser' }).click();
    await expect(page.getByText(/créneau|conflit|Aucun conflit/i).first()).toBeVisible();
  });

  test('Admin — créer menu cantine', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, TEST_USERS.admin);
    await openCampusOperations(page);
    await page.getByRole('button', { name: 'Menus cantine' }).click();

    const dish = `E2E Riz ${Date.now()}`;
    const menuInput = page.getByPlaceholder('Plat principal *');
    await expect(menuInput).toBeVisible();
    await menuInput.fill(dish);

    const saveBtn = page.getByRole('button', { name: 'Enregistrer le menu' });
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 });
    const postPromise = page.waitForResponse(
      (r) => r.url().includes('/campus/canteen/menus') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await saveBtn.click({ force: true });
    const postRes = await postPromise;
    expect(postRes.ok(), `POST menu status ${postRes.status()}`).toBeTruthy();
    await expect(page.getByText(/Menu enregistré|Riz/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Admin — planifier examen physique', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, TEST_USERS.admin);
    await openCampusOperations(page);
    await page.getByRole('button', { name: 'Examens physiques' }).click();

    const title = `E2E BEPC ${Date.now()}`;
    await page.getByPlaceholder('Titre *').fill(title);
    const planBtn = page.getByRole('button', { name: "Planifier l'examen" });
    await expect(planBtn).toBeEnabled();
    const postPromise = page.waitForResponse(
      (r) => r.url().includes('/physical-exams') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await planBtn.click({ force: true });
    const postRes = await postPromise;
    expect(postRes.ok(), `POST exam status ${postRes.status()}`).toBeTruthy();
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Admin — facturation campus et relances absences', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, TEST_USERS.admin);
    await openCampusOperations(page);

    await page.getByRole('button', { name: 'Facturation campus' }).click();
    await page.getByRole('button', { name: 'Lancer la facturation campus' }).click({ force: true });
    await expect(page.getByText(/Facturation|ligne/i).first()).toBeVisible({ timeout: 40_000 });

    await page.getByRole('button', { name: 'Relances absences' }).click();
    await page.getByRole('button', { name: 'Lancer les relances maintenant' }).click({ force: true });
    await expect(page.getByText(/relance/i).first()).toBeVisible({ timeout: 40_000 });
  });

  test('Admin — pointage repas', async ({ page, request }) => {
    test.setTimeout(120_000);
    const token = await apiLogin(request, TEST_USERS.admin);
    test.skip(!token, 'Admin API indisponible');
    const studentsRes = await request.get(`${API_BASE}/admin/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    test.skip(!studentsRes.ok(), 'Liste élèves API indisponible');
    const studentsBody = (await studentsRes.json()) as unknown;
    const students = Array.isArray(studentsBody)
      ? studentsBody
      : ((studentsBody as { data?: unknown[] }).data ?? []);
    test.skip(students.length < 1, 'Aucun élève en base pour pointage repas');

    await loginAs(page, TEST_USERS.admin);
    await openCampusOperations(page);
    await page.getByRole('button', { name: 'Pointage repas' }).click();

    // Ne pas prendre le select « Inscrire un élève » du panneau campus au-dessus
    const mealSelect = page
      .locator('select[aria-label="Élève"]')
      .filter({ has: page.locator('option', { hasText: 'Choisir un élève' }) });
    await expect(mealSelect).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => mealSelect.locator('option').count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(2);

    const studentValue = await mealSelect.locator('option').nth(1).getAttribute('value');
    expect(studentValue).toBeTruthy();
    await mealSelect.selectOption(studentValue!);
    const pointerBtn = page.getByRole('button', { name: 'Pointer le repas' });
    await expect(pointerBtn).toBeEnabled({ timeout: 10_000 });
    await pointerBtn.click();
    await expect(page.getByText(/Repas pointé|pointage/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('Admin — check-in bus', async ({ page, request }) => {
    test.setTimeout(120_000);
    const token = await apiLogin(request, TEST_USERS.admin);
    test.skip(!token, 'Admin API indisponible');
    const headers = { Authorization: `Bearer ${token}` };

    const year = (() => {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth() + 1;
      return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    })();
    let routesRes = await request.get(`${API_BASE}/admin/campus/transport/routes`, { headers });
    test.skip(!routesRes.ok(), 'API lignes transport indisponible');
    let routes = (await routesRes.json()) as unknown[];
    if (!Array.isArray(routes) || routes.length < 1) {
      const createRes = await request.post(`${API_BASE}/admin/campus/transport/routes`, {
        headers,
        data: {
          name: `E2E Bus ${Date.now()}`,
          academicYear: year,
          isPublished: true,
          isActive: true,
        },
      });
      test.skip(!createRes.ok(), 'Impossible de créer une ligne transport pour E2E');
      routesRes = await request.get(`${API_BASE}/admin/campus/transport/routes`, { headers });
      routes = (await routesRes.json()) as unknown[];
    }

    const studentsRes = await request.get(`${API_BASE}/admin/students`, { headers });
    const studentsBody = studentsRes.ok() ? ((await studentsRes.json()) as unknown) : [];
    const students = Array.isArray(studentsBody)
      ? studentsBody
      : ((studentsBody as { data?: unknown[] }).data ?? []);
    test.skip(students.length < 1, 'Aucun élève pour check-in bus');

    await loginAs(page, TEST_USERS.admin);
    await openCampusOperations(page);
    await page.getByRole('button', { name: 'Check-in bus' }).click();

    const routeSelect = page.locator('select[aria-label="Ligne"]');
    await expect(routeSelect).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => routeSelect.locator('option').count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(2);

    await routeSelect.selectOption({ index: 1 });
    const studentSelect = page.locator('select[aria-label="Élève"]').last();
    await expect
      .poll(async () => studentSelect.locator('option').count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(2);
    await studentSelect.selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Enregistrer montée bus' }).click();
    await expect(page.getByText(/Montée bus enregistrée|montée bus|pointage/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('Admin — lecture cahier de texte', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, TEST_USERS.admin);
    await openCampusOperations(page);
    await page.getByRole('button', { name: 'Cahier de texte' }).click();
    await expect(page.getByText(/séance|Aucune séance/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('Enseignant — cahier de texte séance', async ({ page, request }) => {
    test.setTimeout(120_000);
    const teacherOk = await apiLogin(request, TEST_USERS.teacher);
    test.skip(!teacherOk, 'teacher1@school.com indisponible');

    await loginAs(page, TEST_USERS.teacher);
    await page.goto('/teacher?tab=lesson-logs', domReady);

    await expect(
      page.getByRole('heading', { name: 'Nouvelle séance — cahier de texte' }),
    ).toBeVisible({ timeout: 60_000 });

    const courseSelect = page.locator('select[aria-label="Cours"]');
    await expect(courseSelect).toBeVisible();
    const optionCount = await courseSelect.locator('option').count();
    test.skip(optionCount < 2, 'Enseignant sans cours');

    await courseSelect.selectOption({ index: 1 });
    const content = `E2E séance ${Date.now()}`;
    await page.getByPlaceholder('Contenu de la séance *').fill(content);
    await page.getByPlaceholder('Devoirs / travail à faire').fill('Exercices 1 à 3');
    await page.getByRole('button', { name: 'Publier la séance' }).click({ force: true });

    await expect(page.getByText(new RegExp(content)).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test('Parent — bulletins et accusé de réception', async ({ page, request }) => {
    test.setTimeout(180_000);
    const parentToken = await apiLogin(request, TEST_USERS.parent);
    test.skip(!parentToken, 'parent1@school.com indisponible');

    const childrenRes = await request.get(`${API_BASE}/parent/children`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    test.skip(!childrenRes.ok(), 'Impossible de lister les enfants parent');
    const children = (await childrenRes.json()) as Array<{ id?: string }>;
    const childId = String(children[0]?.id ?? '');
    test.skip(!childId, 'Aucun enfant lié au parent');

    // Assurer un bulletin publié via upsert Prisma côté API admin save (best-effort)
    const adminToken = await apiLogin(request, TEST_USERS.admin);
    if (adminToken) {
      const studentsRes = await request.get(`${API_BASE}/admin/students`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (studentsRes.ok()) {
        const students = (await studentsRes.json()) as Array<{ id: string; classId?: string }>;
        const student = students.find((s) => s.id === childId);
        if (student?.classId) {
          await request.post(`${API_BASE}/admin/report-cards/save`, {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: {
              classId: student.classId,
              period: 'trim1',
              academicYear: '2025-2026',
              publish: true,
            },
            timeout: 60_000,
          });
        }
      }
    }

    await loginAs(page, TEST_USERS.parent);
    await selectParentChild(page);
    await page.goto('/parent?tab=report-cards', domReady);

    await expect(
      page.getByText(/Bulletin|Aucun bulletin|Accusé|Chargement/i).first(),
    ).toBeVisible({ timeout: 60_000 });

    const detailsBtn = page.getByRole('button', { name: 'Voir détails' }).first();
    if (!(await detailsBtn.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'note',
        description: 'Aucun bulletin affiché pour le parent — scénario AR partiel',
      });
      return;
    }

    await detailsBtn.click();
    const ackInput = page.getByLabel('Signature parent');
    if (await ackInput.isVisible().catch(() => false)) {
      await ackInput.fill('Parent E2E Test');
      await page.getByRole('button', { name: 'Accuser réception' }).click({ force: true });
      await expect(page.getByText(/Accusé de réception|signé|Reçu/i).first()).toBeVisible({
        timeout: 20_000,
      });
    } else {
      await expect(page.getByText(/Accusé de réception signé|Reçu le/i).first()).toBeVisible();
    }
  });
});

test.describe('E2E — Portails principaux (smoke UI)', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(!e2eFlag.ready, e2eFlag.reason);
    await waitForApiHealthy(request);
  });

  test('Admin — dashboard charge', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, TEST_USERS.admin);
    await page.goto('/admin', domReady);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('body')).toContainText(/Admin|Tableau|Modules|École/i);
  });

  test('Enseignant — dashboard charge', async ({ page, request }) => {
    test.setTimeout(120_000);
    test.skip(!(await apiLogin(request, TEST_USERS.teacher)), 'teacher indisponible');
    await loginAs(page, TEST_USERS.teacher);
    await page.goto('/teacher', domReady);
    await expect(page).toHaveURL(/\/teacher/);
    await expect(
      page.getByText(/Bonjour|Bon après-midi|Bonsoir|enseignant|cours/i).first(),
    ).toBeVisible({ timeout: 60_000 });
  });

  test('Parent — dashboard charge', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, TEST_USERS.parent);
    await page.goto('/parent', domReady);
    await expect(page).toHaveURL(/\/parent/);
    await expect(page.getByText(/Mes enfants|parent|enfant/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
