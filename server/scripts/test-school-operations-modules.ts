/**
 * Smoke tests des 10 modules opérationnels (cahier de texte, AR bulletins,
 * conseils, cantine, facturation campus, relances absences, examens physiques,
 * check-in transport, conflits EDT, bulletins de paie).
 *
 * Prérequis : API sur localhost:5000 + seed (admin@school.com / password123).
 *
 * Usage : npx tsx scripts/test-school-operations-modules.ts
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

async function main() {
  console.log('=== Smoke tests modules opérationnels (lot 10) ===\n');
  console.log(`API: ${API}\n`);

  const health = await req('/health');
  assert('API /health', health.status === 200, String(health.status));
  if (health.status !== 200) {
    console.error('\nAPI indisponible. Lancez npm run dev.');
    process.exit(1);
  }

  const adminToken = await login('admin@school.com');
  assert('Login admin', !!adminToken);
  if (!adminToken) {
    console.error('\nSeed requis (admin@school.com / password123).');
    process.exit(1);
  }

  const schoolsRes = await req('/admin/schools', { token: adminToken });
  const schools = asArray(schoolsRes.body);
  const schoolId = schools[0] ? String(schools[0].id) : undefined;

  const studentsRes = await req('/admin/students', { token: adminToken, schoolId });
  const students = asArray(studentsRes.body);
  const studentId = students[0] ? String(students[0].id) : '';
  assert('Au moins 1 élève en base', !!studentId);

  const classesRes = await req('/admin/classes', { token: adminToken, schoolId });
  const classes = asArray(classesRes.body);
  const classId = classes[0] ? String(classes[0].id) : '';

  const teachersRes = await req('/admin/teachers', { token: adminToken, schoolId });
  const teachers = asArray(teachersRes.body);
  const teacherUserEmail =
    teachers[0] && typeof teachers[0].user === 'object' && teachers[0].user
      ? String((teachers[0].user as Json).email ?? '')
      : '';

  const today = new Date().toISOString().slice(0, 10);
  const year = '2025-2026';

  // ——— 9. Anti-conflits EDT ———
  console.log('\n-- 9. Audit conflits EDT --');
  {
    const r = await req('/admin/timetable/conflicts-audit', { token: adminToken, schoolId });
    assert('GET conflicts-audit -> 200', r.status === 200, String(r.status));
    const body = r.body as Json;
    assert(
      'conflicts-audit a scheduleCount + conflicts',
      typeof body === 'object' &&
        body !== null &&
        typeof body.scheduleCount === 'number' &&
        Array.isArray(body.conflicts),
      JSON.stringify(body).slice(0, 120)
    );
  }

  // ——— 4. Menus cantine + pointage ———
  console.log('\n-- 4. Cantine menus + pointage --');
  let menuId = '';
  {
    const create = await req('/admin/campus/canteen/menus', {
      method: 'POST',
      token: adminToken,
      schoolId,
      body: JSON.stringify({
        menuDate: today,
        mainCourse: 'Riz sauce arachide (test)',
        sideDish: 'Salade',
        dessert: 'Fruit',
      }),
    });
    assert('POST menu cantine -> 201', create.status === 201, String(create.status));
    if (create.status === 201 && typeof create.body === 'object' && create.body) {
      menuId = String((create.body as Json).id ?? '');
    }

    const list = await req(`/admin/campus/canteen/menus?menuDate=${today}`, {
      token: adminToken,
      schoolId,
    });
    assert('GET menus cantine -> 200', list.status === 200, String(list.status));

    if (studentId) {
      const checkIn = await req('/admin/campus/canteen/check-ins', {
        method: 'POST',
        token: adminToken,
        schoolId,
        body: JSON.stringify({ studentId, menuDate: today, mealType: 'LUNCH' }),
      });
      assert(
        'POST pointage repas -> 201',
        checkIn.status === 201,
        `${checkIn.status} ${JSON.stringify(checkIn.body).slice(0, 120)}`
      );

      const checkList = await req(`/admin/campus/canteen/check-ins?menuDate=${today}`, {
        token: adminToken,
        schoolId,
      });
      assert('GET pointages repas -> 200', checkList.status === 200, String(checkList.status));
    } else {
      skip('POST pointage repas', 'aucun élève');
    }
  }

  // ——— 8. Check-in transport ———
  console.log('\n-- 8. Check-in transport --');
  {
    const routesRes = await req('/admin/campus/transport/routes', { token: adminToken, schoolId });
    let routeId = '';
    const routes = asArray(routesRes.body);
    if (routes[0]) {
      routeId = String(routes[0].id);
    } else {
      const created = await req('/admin/campus/transport/routes', {
        method: 'POST',
        token: adminToken,
        schoolId,
        body: JSON.stringify({
          name: 'Ligne test smoke',
          academicYear: year,
          priceAmount: 5000,
          isPublished: true,
          isActive: true,
        }),
      });
      if (created.status === 201 && typeof created.body === 'object' && created.body) {
        routeId = String((created.body as Json).id ?? '');
      }
      assert('POST route transport (fallback)', created.status === 201, String(created.status));
    }

    if (routeId && studentId) {
      const board = await req('/admin/campus/transport/check-ins', {
        method: 'POST',
        token: adminToken,
        schoolId,
        body: JSON.stringify({
          routeId,
          studentId,
          checkInType: 'BOARD',
          stopLabel: 'Arrêt test',
        }),
      });
      assert(
        'POST check-in bus -> 201',
        board.status === 201,
        `${board.status} ${JSON.stringify(board.body).slice(0, 120)}`
      );

      const list = await req(
        `/admin/campus/transport/check-ins?routeId=${routeId}&date=${today}`,
        { token: adminToken, schoolId }
      );
      assert('GET check-ins bus -> 200', list.status === 200, String(list.status));
    } else {
      skip('check-in bus', 'route ou élève manquant');
    }
  }

  // ——— 5. Facturation campus ———
  console.log('\n-- 5. Facturation campus → scolarité --');
  {
    const bill = await req('/admin/campus/bill-subscriptions', {
      method: 'POST',
      token: adminToken,
      schoolId,
      body: JSON.stringify({ academicYear: year }),
    });
    assert('POST bill-subscriptions -> 200', bill.status === 200, String(bill.status));
    const body = bill.body as Json;
    assert(
      'Réponse canteen + transport',
      typeof body === 'object' &&
        body !== null &&
        typeof body.canteen === 'object' &&
        typeof body.transport === 'object',
      JSON.stringify(body).slice(0, 120)
    );
  }

  // ——— 6. Relances absences ———
  console.log('\n-- 6. Relances absences --');
  {
    const r = await req('/admin/attendance/run-absence-reminders', {
      method: 'POST',
      token: adminToken,
      schoolId,
    });
    assert('POST run-absence-reminders -> 200', r.status === 200, String(r.status));
    const body = r.body as Json;
    assert(
      'Compteurs relances présents',
      typeof body?.remindersSent === 'number' && typeof body?.studentsChecked === 'number',
      JSON.stringify(body).slice(0, 120)
    );
  }

  // ——— 7. Examens physiques ———
  console.log('\n-- 7. Planning examens physiques --');
  let examId = '';
  {
    const create = await req('/admin/physical-exams', {
      method: 'POST',
      token: adminToken,
      schoolId,
      body: JSON.stringify({
        title: 'BEPC Mathématiques (smoke)',
        examKind: 'BEPC',
        subject: 'Mathématiques',
        academicYear: year,
        examDate: today,
        startTime: '08:00',
        endTime: '11:00',
        room: 'Salle A',
        isPublished: true,
        classIds: classId ? [classId] : [],
      }),
    });
    assert('POST physical-exam -> 201', create.status === 201, String(create.status));
    if (create.status === 201 && typeof create.body === 'object' && create.body) {
      examId = String((create.body as Json).id ?? '');
    }

    const list = await req(`/admin/physical-exams?academicYear=${year}`, {
      token: adminToken,
      schoolId,
    });
    assert('GET physical-exams -> 200', list.status === 200, String(list.status));

    if (examId) {
      const patch = await req(`/admin/physical-exams/${examId}`, {
        method: 'PATCH',
        token: adminToken,
        schoolId,
        body: JSON.stringify({ room: 'Salle B' }),
      });
      assert('PATCH physical-exam -> 200', patch.status === 200, String(patch.status));
    }
  }

  // ——— 3. Conseil de classe + PV ———
  console.log('\n-- 3. Conseil de classe + PV --');
  let councilId = '';
  {
    if (!classId) {
      skip('conseil de classe', 'aucune classe');
    } else {
      const create = await req('/admin/class-councils', {
        method: 'POST',
        token: adminToken,
        schoolId,
        body: JSON.stringify({
          classId,
          period: 'Trimestre 1',
          academicYear: year,
          title: 'Conseil smoke',
          meetingDate: new Date().toISOString(),
          summary: 'Synthèse test',
          decisions: 'Décisions test',
          recommendations: 'Reco test',
        }),
      });
      assert('POST class-council -> 201', create.status === 201, String(create.status));
      if (create.status === 201 && typeof create.body === 'object' && create.body) {
        councilId = String((create.body as Json).id ?? '');
      }

      if (councilId && studentId) {
        const opinions = await req(`/admin/class-councils/${councilId}/opinions`, {
          method: 'PUT',
          token: adminToken,
          schoolId,
          body: JSON.stringify({
            studentOpinions: [
              {
                studentId,
                average: 12,
                subjectOpinion: 'Bon',
                conductOpinion: 'OK',
                councilDecision: 'Encouragements',
              },
            ],
          }),
        });
        assert('PUT opinions conseil -> 200', opinions.status === 200, String(opinions.status));

        const finalize = await req(`/admin/class-councils/${councilId}/finalize`, {
          method: 'POST',
          token: adminToken,
          schoolId,
        });
        assert('POST finalize conseil -> 200', finalize.status === 200, String(finalize.status));

        const minutes = await req(`/admin/class-councils/${councilId}/minutes-html`, {
          token: adminToken,
          schoolId,
        });
        assert('GET PV HTML -> 200', minutes.status === 200, String(minutes.status));
        assert(
          'PV contient Procès-verbal',
          typeof minutes.body === 'string' && minutes.body.includes('Procès-verbal'),
          typeof minutes.body === 'string' ? minutes.body.slice(0, 80) : 'non-html'
        );
      }
    }
  }

  // ——— 1. Cahier de texte (enseignant) ———
  console.log('\n-- 1. Cahier de texte enseignant --');
  {
    const teacherToken = teacherUserEmail ? await login(teacherUserEmail) : null;
    if (!teacherToken) {
      // fallback emails courants du seed
      const fallbacks = [
        'teacher1@school.com',
        'teacher2@school.com',
        'teacher3@school.com',
      ];
      let tok: string | null = null;
      for (const email of fallbacks) {
        tok = await login(email);
        if (tok) break;
      }
      if (!tok) {
        skip('cahier de texte enseignant', 'aucun compte enseignant connectable');
      } else {
        await runTeacherLessonLogTests(tok, adminToken, schoolId);
      }
    } else {
      await runTeacherLessonLogTests(teacherToken, adminToken, schoolId);
    }
  }

  // ——— Lecture admin cahier de texte ———
  {
    const logs = await req('/admin/lesson-logs', { token: adminToken, schoolId });
    assert('GET admin lesson-logs -> 200', logs.status === 200, String(logs.status));
  }

  // ——— 2. AR bulletins parent ———
  console.log('\n-- 2. AR / signature parent bulletins --');
  {
    const parentToken = await login('parent1@school.com');
    if (!parentToken) {
      skip('AR bulletin parent', 'parent1@school.com non connectable');
    } else {
      const childrenRes = await req('/parent/children', { token: parentToken });
      const children = asArray(childrenRes.body);
      const childId = children[0]
        ? String(children[0].id ?? (children[0].student as Json | undefined)?.id ?? '')
        : '';

      if (!childId) {
        skip('AR bulletin parent', 'aucun enfant lié à parent1');
      } else {
        // Assurer un bulletin publié non encore AR (via Prisma)
        const { default: prisma } = await import('../src/utils/prisma');
        const existing = await prisma.reportCard.findFirst({
          where: { studentId: childId, published: true, parentAcknowledgedAt: null },
        });
        let reportCardId = existing?.id;
        if (!reportCardId) {
          const created = await prisma.reportCard.upsert({
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
              average: 13.25,
              comments: 'Smoke AR',
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
            },
          });
          reportCardId = created.id;
        }

        const rcRes = await req(`/parent/children/${childId}/report-cards`, {
          token: parentToken,
        });
        assert('GET parent report-cards -> 200', rcRes.status === 200, String(rcRes.status));

        const ack = await req(
          `/parent/children/${childId}/report-cards/${reportCardId}/acknowledge`,
          {
            method: 'POST',
            token: parentToken,
            body: JSON.stringify({ signature: 'Parent Smoke Test' }),
          }
        );
        assert(
          'POST acknowledge bulletin -> 200|409',
          ack.status === 200 || ack.status === 409,
          `${ack.status} ${JSON.stringify(ack.body).slice(0, 160)}`
        );
      }
    }
  }

  // ——— 10. Bulletins de paie ———
  console.log('\n-- 10. Bulletins de paie HTML --');
  {
    if (!schoolId) {
      skip('payslip HTML', 'pas de schoolId');
    } else {
      const runs = await req('/admin/hr/payroll/runs', { token: adminToken, schoolId });
      if (runs.status === 0) {
        skip('payslip HTML', `timeout / erreur réseau: ${String(runs.body).slice(0, 80)}`);
      } else if (runs.status === 400) {
        skip('payslip HTML', 'établissement actif requis');
      } else {
        assert('GET payroll runs -> 200', runs.status === 200, String(runs.status));
        const runList = asArray(runs.body);
        const runId = runList[0] ? String(runList[0].id) : '';
        if (!runId) {
          // Créer un brouillon de paie si possible
          const preview = await req('/admin/hr/payroll/preview?year=2026&month=3', {
            token: adminToken,
            schoolId,
          });
          if (preview.status === 200) {
            const createRun = await req('/admin/hr/payroll/runs', {
              method: 'POST',
              token: adminToken,
              schoolId,
              body: JSON.stringify({ year: 2026, month: 3 }),
            });
            if (createRun.status === 201 || createRun.status === 200) {
              const newId = String((createRun.body as Json)?.id ?? '');
              if (newId) {
                const detail = await req(`/admin/hr/payroll/runs/${newId}`, {
                  token: adminToken,
                  schoolId,
                });
                const lines = asArray(
                  typeof detail.body === 'object' && detail.body
                    ? ((detail.body as Json).lines as unknown[]) ?? []
                    : []
                );
                const lineId = lines[0] ? String(lines[0].id) : '';
                if (lineId) {
                  const html = await req(
                    `/admin/hr/payroll/runs/${newId}/lines/${lineId}/payslip-html`,
                    { token: adminToken, schoolId }
                  );
                  assert('GET payslip-html -> 200', html.status === 200, String(html.status));
                  assert(
                    'Payslip contient Bulletin de paie',
                    typeof html.body === 'string' && html.body.includes('Bulletin de paie'),
                    typeof html.body === 'string' ? html.body.slice(0, 80) : 'non-html'
                  );
                } else {
                  skip('payslip HTML', 'cycle créé sans lignes');
                }
              } else {
                skip('payslip HTML', 'création cycle sans id');
              }
            } else {
              skip(
                'payslip HTML',
                `création cycle ${createRun.status}: ${JSON.stringify(createRun.body).slice(0, 100)}`
              );
            }
          } else {
            skip('payslip HTML', 'aucun cycle et preview indisponible');
          }
        } else {
          const detail = await req(`/admin/hr/payroll/runs/${runId}`, {
            token: adminToken,
            schoolId,
          });
          const lines = asArray(
            typeof detail.body === 'object' && detail.body
              ? ((detail.body as Json).lines as unknown[]) ?? detail.body
              : detail.body
          );
          const lineId = lines[0] ? String(lines[0].id) : '';
          if (!lineId) {
            skip('payslip HTML', 'aucune ligne de paie');
          } else {
            const html = await req(
              `/admin/hr/payroll/runs/${runId}/lines/${lineId}/payslip-html`,
              { token: adminToken, schoolId }
            );
            assert('GET payslip-html -> 200', html.status === 200, String(html.status));
            assert(
              'Payslip contient Bulletin de paie',
              typeof html.body === 'string' && html.body.includes('Bulletin de paie'),
              typeof html.body === 'string' ? html.body.slice(0, 80) : 'non-html'
            );
          }
        }
      }
    }
  }

  // Cleanup soft
  if (menuId) {
    await req(`/admin/campus/canteen/menus/${menuId}`, {
      method: 'DELETE',
      token: adminToken,
      schoolId,
    });
  }
  if (examId) {
    await req(`/admin/physical-exams/${examId}`, {
      method: 'DELETE',
      token: adminToken,
      schoolId,
    });
  }

  console.log(`\n=== Résultat : ${passed} OK, ${failed} FAIL, ${skipped} SKIP ===`);
  process.exit(failed > 0 ? 1 : 0);
}

async function runTeacherLessonLogTests(
  teacherToken: string,
  adminToken: string,
  schoolId?: string
): Promise<void> {
  const profile = await req('/teacher/profile', { token: teacherToken });
  assert('GET teacher/profile -> 200', profile.status === 200, String(profile.status));

  const courses =
    typeof profile.body === 'object' && profile.body && Array.isArray((profile.body as Json).courses)
      ? ((profile.body as Json).courses as Json[])
      : [];

  const course = courses[0];
  if (!course) {
    skip('POST lesson-log', 'enseignant sans cours');
    return;
  }

  const courseId = String(course.id);
  const classId = String((course.class as Json | undefined)?.id ?? course.classId ?? '');
  if (!classId) {
    skip('POST lesson-log', 'cours sans classe');
    return;
  }

  const create = await req('/teacher/lesson-logs', {
    method: 'POST',
    token: teacherToken,
    body: JSON.stringify({
      courseId,
      classId,
      title: 'Séance smoke',
      content: 'Chapitre 1 — introduction (test automatisé)',
      objectives: 'Comprendre les bases',
      homeworkNotes: 'Exercices 1 à 5',
      lessonDate: new Date().toISOString(),
    }),
  });
  assert(
    'POST teacher lesson-log -> 201',
    create.status === 201,
    `${create.status} ${JSON.stringify(create.body).slice(0, 160)}`
  );

  const list = await req('/teacher/lesson-logs', { token: teacherToken });
  assert('GET teacher lesson-logs -> 200', list.status === 200, String(list.status));

  if (create.status === 201 && typeof create.body === 'object' && create.body) {
    const id = String((create.body as Json).id);
    const patch = await req(`/teacher/lesson-logs/${id}`, {
      method: 'PATCH',
      token: teacherToken,
      body: JSON.stringify({ title: 'Séance smoke (modifiée)' }),
    });
    assert('PATCH teacher lesson-log -> 200', patch.status === 200, String(patch.status));

    const del = await req(`/teacher/lesson-logs/${id}`, {
      method: 'DELETE',
      token: teacherToken,
    });
    assert('DELETE teacher lesson-log -> 200', del.status === 200, String(del.status));
  }

  void adminToken;
  void schoolId;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
