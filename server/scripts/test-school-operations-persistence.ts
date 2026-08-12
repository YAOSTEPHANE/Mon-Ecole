/**
 * Test de persistance — écriture API puis relecture (nouvelle session + Prisma direct).
 *
 * Vérifie que les enregistrements des modules opérationnels survivent en MongoDB
 * et restent accessibles après création.
 *
 * Prérequis : API sur localhost:5000 + seed (admin@school.com / password123).
 *
 * Usage : npm run test:persistence
 */
const API = (process.env.API_URL ?? 'http://localhost:5000/api').replace(/\/+$/, '');
const PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

type Json = Record<string, unknown>;

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`  OK ${name}`);
    return;
  }
  failed += 1;
  console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`);
}

function skip(name: string, reason: string): void {
  skipped += 1;
  console.log(`  SKIP ${name} (${reason})`);
}

async function req(
  path: string,
  init: RequestInit & { token?: string; schoolId?: string } = {},
): Promise<{ status: number; body: Json | unknown[] | string }> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.schoolId) headers['X-School-Id'] = init.schoolId;
  if (init.body && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${API}${path}`, { ...init, headers, signal: controller.signal });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) as Json | unknown[] };
    } catch {
      return { status: res.status, body: text };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 0, body: `fetch error: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

async function login(email: string): Promise<string | null> {
  const { status, body } = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (status !== 200 || typeof body !== 'object' || body === null || !('token' in body)) {
    return null;
  }
  return String((body as Json).token);
}

function asArray(body: Json | unknown[] | string | null): Json[] {
  if (Array.isArray(body)) return body as Json[];
  if (body && typeof body === 'object') {
    for (const key of ['students', 'items', 'data', 'rows']) {
      if (Array.isArray((body as Json)[key])) return (body as Json)[key] as Json[];
    }
  }
  return [];
}

function findInList(list: Json[], id: string): Json | undefined {
  return list.find((row) => String(row.id ?? '') === id);
}

async function main() {
  const marker = `PERSIST-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  const year = '2025-2026';

  console.log('=== Test de persistance — modules opérationnels ===\n');
  console.log(`API: ${API}`);
  console.log(`Marqueur: ${marker}\n`);

  const health = await req('/health');
  assert('API /health', health.status === 200, String(health.status));
  if (health.status !== 200) {
    console.error('\nAPI indisponible. Lancez npm run dev.');
    process.exit(1);
  }

  const adminToken = await login('admin@school.com');
  assert('Login admin (session 1)', !!adminToken);
  if (!adminToken) {
    console.error('\nSeed requis (admin@school.com / password123).');
    process.exit(1);
  }

  const { default: prisma } = await import('../src/utils/prisma');

  const schoolsRes = await req('/admin/schools', { token: adminToken });
  const schoolId = asArray(schoolsRes.body)[0]
    ? String(asArray(schoolsRes.body)[0].id)
    : undefined;

  const students = asArray(
    (await req('/admin/students', { token: adminToken, schoolId })).body
  );
  const studentId = students[0] ? String(students[0].id) : '';

  const classes = asArray(
    (await req('/admin/classes', { token: adminToken, schoolId })).body
  );
  const classId = classes[0] ? String(classes[0].id) : '';

  const created: {
    menuId?: string;
    mealCheckInId?: string;
    transportCheckInId?: string;
    routeId?: string;
    examId?: string;
    councilId?: string;
    lessonLogId?: string;
    reportCardId?: string;
  } = {};

  // ——— Menu cantine ———
  console.log('\n-- Menu cantine --');
  {
    const create = await req('/admin/campus/canteen/menus', {
      method: 'POST',
      token: adminToken,
      schoolId,
      body: JSON.stringify({
        menuDate: today,
        mainCourse: `${marker} riz`,
        sideDish: 'Salade',
        dessert: 'Fruit',
      }),
    });
    assert('POST menu -> 201', create.status === 201, String(create.status));
    created.menuId =
      create.status === 201 && typeof create.body === 'object' && create.body
        ? String((create.body as Json).id ?? '')
        : undefined;
  }

  // ——— Pointage repas ———
  console.log('\n-- Pointage repas --');
  if (studentId) {
    const create = await req('/admin/campus/canteen/check-ins', {
      method: 'POST',
      token: adminToken,
      schoolId,
      body: JSON.stringify({ studentId, menuDate: today, mealType: 'LUNCH' }),
    });
    assert('POST check-in repas -> 201', create.status === 201, String(create.status));
    created.mealCheckInId =
      create.status === 201 && typeof create.body === 'object' && create.body
        ? String((create.body as Json).id ?? '')
        : undefined;
  } else {
    skip('Pointage repas', 'aucun élève');
  }

  // ——— Check-in bus ———
  console.log('\n-- Check-in bus --');
  {
    let routeId = '';
    const routes = asArray(
      (await req('/admin/campus/transport/routes', { token: adminToken, schoolId })).body
    );
    if (routes[0]) {
      routeId = String(routes[0].id);
    } else {
      const routeCreate = await req('/admin/campus/transport/routes', {
        method: 'POST',
        token: adminToken,
        schoolId,
        body: JSON.stringify({
          name: `${marker} ligne`,
          academicYear: year,
          isPublished: true,
          isActive: true,
        }),
      });
      if (routeCreate.status === 201 && typeof routeCreate.body === 'object' && routeCreate.body) {
        routeId = String((routeCreate.body as Json).id ?? '');
      }
    }
    created.routeId = routeId;

    if (routeId && studentId) {
      const create = await req('/admin/campus/transport/check-ins', {
        method: 'POST',
        token: adminToken,
        schoolId,
        body: JSON.stringify({
          routeId,
          studentId,
          checkInType: 'BOARD',
          stopLabel: `${marker} arrêt`,
        }),
      });
      assert('POST check-in bus -> 201', create.status === 201, String(create.status));
      created.transportCheckInId =
        create.status === 201 && typeof create.body === 'object' && create.body
          ? String((create.body as Json).id ?? '')
          : undefined;
    } else {
      skip('Check-in bus', 'route ou élève manquant');
    }
  }

  // ——— Examen physique ———
  console.log('\n-- Examen physique --');
  {
    const create = await req('/admin/physical-exams', {
      method: 'POST',
      token: adminToken,
      schoolId,
      body: JSON.stringify({
        title: `${marker} BEPC`,
        examKind: 'BEPC',
        subject: 'Mathématiques',
        academicYear: year,
        examDate: today,
        startTime: '08:00',
        endTime: '11:00',
        room: 'Salle persist',
        classIds: classId ? [classId] : [],
      }),
    });
    assert('POST examen -> 201', create.status === 201, String(create.status));
    created.examId =
      create.status === 201 && typeof create.body === 'object' && create.body
        ? String((create.body as Json).id ?? '')
        : undefined;
  }

  // ——— Conseil de classe ———
  console.log('\n-- Conseil de classe --');
  if (classId) {
    const create = await req('/admin/class-councils', {
      method: 'POST',
      token: adminToken,
      schoolId,
      body: JSON.stringify({
        classId,
        period: 'Trimestre 1',
        academicYear: year,
        title: `${marker} conseil`,
        meetingDate: new Date().toISOString(),
        summary: 'Synthèse persistance',
      }),
    });
    assert('POST conseil -> 201', create.status === 201, String(create.status));
    created.councilId =
      create.status === 201 && typeof create.body === 'object' && create.body
        ? String((create.body as Json).id ?? '')
        : undefined;

    if (created.councilId && studentId) {
      await req(`/admin/class-councils/${created.councilId}/opinions`, {
        method: 'PUT',
        token: adminToken,
        schoolId,
        body: JSON.stringify({
          studentOpinions: [
            {
              studentId,
              average: 14,
              subjectOpinion: 'Persist OK',
              conductOpinion: 'Bien',
              councilDecision: 'Félicitations',
            },
          ],
        }),
      });
      await req(`/admin/class-councils/${created.councilId}/finalize`, {
        method: 'POST',
        token: adminToken,
        schoolId,
      });
    }
  } else {
    skip('Conseil de classe', 'aucune classe');
  }

  // ——— Cahier de texte ———
  console.log('\n-- Cahier de texte --');
  {
    const teacherEmail =
      (
        await (async () => {
          const teachers = asArray(
            (await req('/admin/teachers', { token: adminToken, schoolId })).body
          );
          if (teachers[0] && typeof teachers[0].user === 'object' && teachers[0].user) {
            return String((teachers[0].user as Json).email ?? '');
          }
          return 'teacher1@school.com';
        })()
      ) || 'teacher1@school.com';
    const teacherToken = (await login(teacherEmail)) ?? (await login('teacher1@school.com'));

    if (teacherToken) {
      const profile = await req('/teacher/profile', { token: teacherToken });
      const courses =
        typeof profile.body === 'object' &&
        profile.body &&
        Array.isArray((profile.body as Json).courses)
          ? ((profile.body as Json).courses as Json[])
          : [];
      const course = courses[0];
      const courseId = course ? String(course.id) : '';
      const courseClassId = course
        ? String((course.class as Json | undefined)?.id ?? course.classId ?? '')
        : '';

      if (courseId && courseClassId) {
        const create = await req('/teacher/lesson-logs', {
          method: 'POST',
          token: teacherToken,
          body: JSON.stringify({
            courseId,
            classId: courseClassId,
            title: `${marker} séance`,
            content: `${marker} — contenu de la séance`,
            homeworkNotes: 'Exercices persist',
            lessonDate: new Date().toISOString(),
          }),
        });
        assert('POST lesson-log -> 201', create.status === 201, String(create.status));
        created.lessonLogId =
          create.status === 201 && typeof create.body === 'object' && create.body
            ? String((create.body as Json).id ?? '')
            : undefined;
      } else {
        skip('Cahier de texte', 'enseignant sans cours');
      }
    } else {
      skip('Cahier de texte', 'enseignant non connectable');
    }
  }

  // ——— AR bulletin parent ———
  console.log('\n-- AR bulletin parent --');
  {
    const parentToken = await login('parent1@school.com');
    const children = parentToken
      ? asArray((await req('/parent/children', { token: parentToken })).body)
      : [];
    const childId = children[0]
      ? String(children[0].id ?? (children[0].student as Json | undefined)?.id ?? '')
      : '';

    if (parentToken && childId) {
      const rc = await prisma.reportCard.upsert({
        where: {
          studentId_period_academicYear: {
            studentId: childId,
            period: 'Trimestre 1',
            academicYear: year,
          },
        },
        create: {
          studentId: childId,
          period: 'Trimestre 1',
          academicYear: year,
          average: 12.5,
          comments: marker,
          published: true,
          publishedAt: new Date(),
        },
        update: {
          published: true,
          publishedAt: new Date(),
          parentAcknowledgedAt: null,
          parentAckSignature: null,
          parentAcknowledgedByUserId: null,
          parentAckIp: null,
          comments: marker,
        },
      });
      created.reportCardId = rc.id;

      await req(`/parent/children/${childId}/report-cards/${rc.id}/acknowledge`, {
        method: 'POST',
        token: parentToken,
        body: JSON.stringify({ signature: `${marker} signature` }),
      });
    } else {
      skip('AR bulletin', 'parent ou enfant manquant');
    }
  }

  // Petite pause pour laisser MongoDB propager (réplication locale)
  await new Promise((r) => setTimeout(r, 300));

  // ——— Relecture session 2 (nouveau token) ———
  console.log('\n== Relecture API (nouvelle session) ==');
  const adminToken2 = await login('admin@school.com');
  assert('Login admin (session 2)', !!adminToken2);

  if (adminToken2) {
    if (created.menuId) {
      const list = asArray(
        (
          await req(`/admin/campus/canteen/menus?menuDate=${today}`, {
            token: adminToken2,
            schoolId,
          })
        ).body
      );
      const row = findInList(list, created.menuId);
      assert(
        'API: menu persisté',
        !!row && String(row.mainCourse ?? '').includes(marker),
        row ? String(row.mainCourse) : 'absent'
      );
    }

    if (created.mealCheckInId) {
      const list = asArray(
        (
          await req(`/admin/campus/canteen/check-ins?menuDate=${today}`, {
            token: adminToken2,
            schoolId,
          })
        ).body
      );
      assert(
        'API: pointage repas persisté',
        !!findInList(list, created.mealCheckInId),
        created.mealCheckInId
      );
    }

    if (created.transportCheckInId && created.routeId) {
      const list = asArray(
        (
          await req(
            `/admin/campus/transport/check-ins?routeId=${created.routeId}&date=${today}`,
            { token: adminToken2, schoolId }
          )
        ).body
      );
      assert(
        'API: check-in bus persisté',
        !!findInList(list, created.transportCheckInId),
        created.transportCheckInId
      );
    }

    if (created.examId) {
      const list = asArray(
        (
          await req(`/admin/physical-exams?academicYear=${year}`, {
            token: adminToken2,
            schoolId,
          })
        ).body
      );
      const row = findInList(list, created.examId);
      assert(
        'API: examen persisté',
        !!row && String(row.title ?? '').includes(marker),
        row ? String(row.title) : 'absent'
      );
    }

    if (created.councilId && classId) {
      const list = asArray(
        (
          await req(
            `/admin/class-councils?classId=${classId}&academicYear=${year}`,
            { token: adminToken2, schoolId }
          )
        ).body
      );
      const row = findInList(list, created.councilId);
      assert(
        'API: conseil persisté (finalisé)',
        !!row &&
          String(row.title ?? '').includes(marker) &&
          (row.status === 'FINALIZED' || row.minutesGeneratedAt != null),
        row ? `${row.title} / ${row.status}` : 'absent'
      );
    }

    if (created.lessonLogId) {
      const list = asArray(
        (await req('/admin/lesson-logs', { token: adminToken2, schoolId })).body
      );
      const row = findInList(list, created.lessonLogId);
      assert(
        'API: cahier de texte persisté',
        !!row && String(row.content ?? '').includes(marker),
        row ? String(row.content).slice(0, 80) : 'absent'
      );
    }
  }

  // ——— Relecture Prisma directe (MongoDB) ———
  console.log('\n== Relecture Prisma (MongoDB) ==');

  if (created.menuId) {
    const row = await prisma.canteenDailyMenu.findUnique({ where: { id: created.menuId } });
    assert(
      'DB: CanteenDailyMenu',
      !!row && String(row.mainCourse).includes(marker),
      row?.mainCourse ?? 'null'
    );
  }

  if (created.mealCheckInId) {
    const row = await prisma.canteenMealCheckIn.findUnique({
      where: { id: created.mealCheckInId },
    });
    assert('DB: CanteenMealCheckIn', !!row && row.studentId === studentId, row?.id ?? 'null');
  }

  if (created.transportCheckInId) {
    const row = await prisma.transportCheckIn.findUnique({
      where: { id: created.transportCheckInId },
    });
    assert(
      'DB: TransportCheckIn',
      !!row && String(row.stopLabel ?? '').includes(marker),
      row?.stopLabel ?? 'null'
    );
  }

  if (created.examId) {
    const row = await prisma.physicalExamSession.findUnique({ where: { id: created.examId } });
    assert(
      'DB: PhysicalExamSession',
      !!row && String(row.title).includes(marker),
      row?.title ?? 'null'
    );
  }

  if (created.councilId) {
    const row = await prisma.classCouncilSession.findUnique({ where: { id: created.councilId } });
    assert(
      'DB: ClassCouncilSession',
      !!row && String(row.title).includes(marker) && row.status === 'FINALIZED',
      row ? `${row.title} / ${row.status}` : 'null'
    );
  }

  if (created.lessonLogId) {
    const row = await prisma.lessonLog.findUnique({ where: { id: created.lessonLogId } });
    assert(
      'DB: LessonLog',
      !!row && String(row.content).includes(marker),
      row?.content.slice(0, 80) ?? 'null'
    );
  }

  if (created.reportCardId) {
    const row = await prisma.reportCard.findUnique({ where: { id: created.reportCardId } });
    assert(
      'DB: ReportCard AR parent',
      !!row &&
        row.parentAcknowledgedAt != null &&
        String(row.parentAckSignature ?? '').includes(marker),
      row
        ? `ack=${row.parentAcknowledgedAt?.toISOString()} sig=${row.parentAckSignature}`
        : 'null'
    );
  }

  await prisma.$disconnect();

  console.log('\n=== Résumé persistance ===');
  console.log(`OK: ${passed} | FAIL: ${failed} | SKIP: ${skipped}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
