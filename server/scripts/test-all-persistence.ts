/**
 * Test de persistance complet — toutes les saisies principales (admin, enseignant,
 * parent, élève, éducateur, infirmerie, public).
 *
 * Pour chaque action : POST/PUT → relecture API (nouvelle session) → relecture Prisma.
 *
 * Usage : npm run test:persistence
 */
import {
  API,
  assert,
  asArray,
  extractId,
  findInList,
  futureDateOnly,
  futureIso,
  getStats,
  login,
  req,
  skip,
  verifyAll,
  type PersistEntry,
  type TestContext,
} from './lib/persistence-helpers';

async function setupContext(): Promise<TestContext | null> {
  const marker = `PERSIST-ALL-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  const year = '2025-2026';

  const adminToken = await login('admin@school.com');
  assert('Login admin', !!adminToken);
  if (!adminToken) return null;

  const schools = asArray((await req('/admin/schools', { token: adminToken })).body);
  const schoolId = schools[0] ? String(schools[0].id) : undefined;

  const students = asArray(
    (await req('/admin/students', { token: adminToken, schoolId })).body
  );
  const studentId = students[0] ? String(students[0].id) : '';
  const classId = students[0] ? String(students[0].classId ?? '') : '';

  const classes = asArray((await req('/admin/classes', { token: adminToken, schoolId })).body);
  const resolvedClassId = classId || (classes[0] ? String(classes[0].id) : '');

  const courses = asArray((await req('/admin/courses', { token: adminToken, schoolId })).body);
  const courseId = courses[0] ? String(courses[0].id) : '';
  const courseTeacherId = courses[0] ? String(courses[0].teacherId ?? '') : '';

  const teachers = asArray((await req('/admin/teachers', { token: adminToken, schoolId })).body);
  const teacherRow = teachers[0] as Json | undefined;
  const teacherId = courseTeacherId || (teacherRow ? String(teacherRow.id) : '');
  const teacherUserId =
    teacherRow && typeof teacherRow.user === 'object' && teacherRow.user
      ? String((teacherRow.user as Record<string, unknown>).id ?? '')
      : '';

  const teacherEmail =
    teacherRow && typeof teacherRow.user === 'object' && teacherRow.user
      ? String((teacherRow.user as Record<string, unknown>).email ?? '')
      : 'teacher1@school.com';

  const parents = asArray((await req('/admin/parents', { token: adminToken, schoolId })).body);
  const parentUserId =
    parents[0] && typeof parents[0].user === 'object' && parents[0].user
      ? String((parents[0].user as Record<string, unknown>).id ?? '')
      : '';

  const parentToken = (await login('parent1@school.com')) ?? undefined;
  const children = parentToken
    ? asArray((await req('/parent/children', { token: parentToken })).body)
    : [];
  const childId = children[0]
    ? String(children[0].id ?? (children[0].student as Record<string, unknown> | undefined)?.id ?? '')
    : studentId;

  const teacherToken =
    (await login(teacherEmail)) ?? (await login('teacher1@school.com')) ?? '';
  const studentToken = (await login('student1@school.com')) ?? '';
  const educatorToken = (await login('educator1@school.com')) ?? '';
  const nurseToken = (await login('nurse@school.com')) ?? '';

  assert('Au moins 1 élève', !!studentId);

  return {
    marker,
    today,
    year,
    schoolId,
    studentId,
    classId: resolvedClassId,
    courseId,
    teacherId,
    teacherUserId,
    parentUserId,
    childId,
    tokens: {
      admin: adminToken,
      teacher: teacherToken,
      parent: parentToken ?? '',
      student: studentToken,
      educator: educatorToken,
      nurse: nurseToken,
    },
  };
}

type Json = Record<string, unknown>;

async function writeAdmin(ctx: TestContext, entries: PersistEntry[]): Promise<void> {
  const { marker, today, year, schoolId, studentId, classId, parentUserId, tokens } = ctx;
  const t = tokens.admin;

  console.log('\n-- Admin : communication & calendrier --');

  const ann = await req('/admin/announcements', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({ title: `${marker} annonce`, content: 'Contenu test persistance' }),
  });
  const annId = extractId(ann);
  assert('POST annonce', !!annId, String(ann.status));
  if (annId) {
    entries.push({
      label: 'Announcement',
      id: annId,
      verifyDb: async (p) => {
        const r = await p.announcement.findUnique({ where: { id: annId } });
        return !!r && r.title.includes(marker);
      },
      verifyApi: async (c, token) => {
        const list = asArray(
          (await req('/admin/announcements', { token, schoolId: c.schoolId })).body
        );
        const row = list.find((x) => String(x.title ?? '').includes(c.marker));
        return !!row;
      },
    });
  }

  if (parentUserId) {
    const msg = await req('/admin/messages', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({
        receiverId: parentUserId,
        content: `${marker} message admin`,
        subject: 'Test persistance',
      }),
    });
    assert('POST message admin', msg.status === 201, String(msg.status));
    if (msg.status === 201) {
      entries.push({
        label: 'Message',
        id: `msg-${marker}`,
        verifyDb: async (p) => {
          const r = await p.message.findFirst({
            where: { content: { contains: marker } },
          });
          return !!r;
        },
      });
    }
  } else {
    skip('Message admin', 'parentUserId manquant');
  }

  const calStart = futureDateOnly(7);
  const calEnd = futureDateOnly(8);
  const cal = await req('/admin/school-calendar-events', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      title: `${marker} calendrier`,
      startDate: `${calStart}T08:00:00.000Z`,
      endDate: `${calEnd}T17:00:00.000Z`,
      academicYear: year,
      type: 'OTHER',
    }),
  });
  const calId = extractId(cal);
  assert('POST événement calendrier', !!calId, String(cal.status));
  if (calId) {
    entries.push({
      label: 'SchoolCalendarEvent',
      id: calId,
      verifyDb: async (p) => {
        const r = await p.schoolCalendarEvent.findUnique({ where: { id: calId } });
        return !!r && r.title.includes(marker);
      },
      verifyApi: async (c, token) => {
        const list = asArray(
          (await req('/admin/school-calendar-events', { token, schoolId: c.schoolId })).body
        );
        return !!findInList(list, calId);
      },
    });
  }

  console.log('\n-- Admin : discipline & extras --');

  const rule = await req('/admin/discipline/rulebooks', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({ title: `${marker} règlement`, content: 'Article test persistance.' }),
  });
  const ruleId = extractId(rule);
  assert('POST règlement discipline', !!ruleId, String(rule.status));
  if (ruleId) {
    entries.push({
      label: 'SchoolDisciplinaryRulebook',
      id: ruleId,
      verifyDb: async (p) => {
        const r = await p.schoolDisciplinaryRulebook.findUnique({ where: { id: ruleId } });
        return !!r && r.content.includes('persistance');
      },
    });
  }

  if (studentId) {
    const disc = await req('/admin/discipline/records', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({
        studentId,
        academicYear: year,
        title: `${marker} incident`,
        category: 'VERBAL_WARNING',
        description: 'Test persistance discipline',
      }),
    });
    const discId = extractId(disc);
    assert('POST fiche discipline', !!discId, String(disc.status));
    if (discId) {
      entries.push({
        label: 'StudentDisciplinaryRecord',
        id: discId,
        verifyDb: async (p) => {
          const r = await p.studentDisciplinaryRecord.findUnique({ where: { id: discId } });
          return !!r && r.title.includes(marker);
        },
      });
    }
  }

  const extra = await req('/admin/extracurricular/offerings', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      kind: 'CLUB',
      category: 'CLUB_ASSOCIATION',
      title: `${marker} club`,
      academicYear: year,
      isPublished: true,
    }),
  });
  const extraId = extractId(extra);
  assert('POST activité parascolaire', !!extraId, String(extra.status));
  if (extraId && studentId) {
    entries.push({
      label: 'ExtracurricularOffering',
      id: extraId,
      verifyDb: async (p) => {
        const r = await p.extracurricularOffering.findUnique({ where: { id: extraId } });
        return !!r && r.title.includes(marker);
      },
    });

    const reg = await req('/admin/extracurricular/registrations', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({ offeringId: extraId, studentId }),
    });
    const regId = extractId(reg);
    assert('POST inscription parascolaire', !!regId, String(reg.status));
    if (regId) {
      entries.push({
        label: 'ExtracurricularRegistration',
        id: regId,
        verifyDb: async (p) => {
          const r = await p.extracurricularRegistration.findUnique({ where: { id: regId } });
          return !!r && r.studentId === studentId && r.offeringId === extraId;
        },
      });
    }
  }

  console.log('\n-- Admin : bibliothèque, orientation, frais --');

  const book = await req('/admin/library/books', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      title: `${marker} livre`,
      author: 'Auteur Test',
      copiesTotal: 2,
    }),
  });
  const bookId = extractId(book);
  assert('POST livre bibliothèque', !!bookId, String(book.status));
  if (bookId) {
    entries.push({
      label: 'LibraryBook',
      id: bookId,
      verifyDb: async (p) => {
        const r = await p.libraryBook.findUnique({ where: { id: bookId } });
        return !!r && r.title.includes(marker);
      },
    });
  }

  const fil = await req('/admin/orientation/filieres', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      title: `${marker} filière`,
      body: 'Description filière test persistance',
    }),
  });
  const filId = extractId(fil);
  assert('POST filière orientation', !!filId, String(fil.status));
  if (filId) {
    entries.push({
      label: 'OrientationFiliere',
      id: filId,
      verifyDb: async (p) => {
        const r = await p.orientationFiliere.findUnique({ where: { id: filId } });
        return !!r && r.title.includes(marker);
      },
    });
  }

  const fee = await req('/admin/tuition-fee-catalog', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      label: `${marker} frais`,
      defaultAmount: 25000,
      academicYear: year,
    }),
  });
  const feeId = extractId(fee);
  assert('POST catalogue frais', !!feeId, String(fee.status));
  if (feeId) {
    entries.push({
      label: 'TuitionFeeCatalog',
      id: feeId,
      verifyDb: async (p) => {
        const r = await p.tuitionFeeCatalog.findUnique({ where: { id: feeId } });
        return !!r && r.label.includes(marker);
      },
    });
  }

  if (studentId) {
    const conduct = await req('/admin/conduct', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({
        studentId,
        period: 'Trimestre 1',
        academicYear: year,
        punctuality: 15,
        respect: 16,
        participation: 14,
        behavior: 15,
        comments: marker,
      }),
    });
    assert('POST conduite admin', conduct.status === 200 || conduct.status === 201, String(conduct.status));
    entries.push({
      label: 'Conduct (admin)',
      id: `${studentId}-${year}-T1`,
      verifyDb: async (p) => {
        const r = await p.conduct.findUnique({
          where: {
            studentId_period_academicYear: {
              studentId,
              period: 'Trimestre 1',
              academicYear: year,
            },
          },
        });
        return !!r && String(r.comments ?? '').includes(marker);
      },
    });
  }

  console.log('\n-- Admin : opérations scolaires (campus) --');

  const menu = await req('/admin/campus/canteen/menus', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({ menuDate: today, mainCourse: `${marker} plat`, sideDish: 'Salade' }),
  });
  const menuId = extractId(menu);
  assert('POST menu cantine', !!menuId, String(menu.status));
  if (menuId) {
    entries.push({
      label: 'CanteenDailyMenu',
      id: menuId,
      verifyDb: async (p) => {
        const r = await p.canteenDailyMenu.findUnique({ where: { id: menuId } });
        return !!r && r.mainCourse.includes(marker);
      },
      verifyApi: async (c, token) => {
        const list = asArray(
          (
            await req(`/admin/campus/canteen/menus?menuDate=${c.today}`, {
              token,
              schoolId: c.schoolId,
            })
          ).body
        );
        return !!findInList(list, menuId);
      },
    });
  }

  if (studentId) {
    const meal = await req('/admin/campus/canteen/check-ins', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({ studentId, menuDate: today, mealType: 'LUNCH' }),
    });
    const mealId = extractId(meal);
    assert('POST pointage repas', !!mealId, String(meal.status));
    if (mealId) {
      entries.push({
        label: 'CanteenMealCheckIn',
        id: mealId,
        verifyDb: async (p) => {
          const r = await p.canteenMealCheckIn.findUnique({ where: { id: mealId } });
          return !!r && r.studentId === studentId;
        },
      });
    }
  }

  let routeId = '';
  const routes = asArray(
    (await req('/admin/campus/transport/routes', { token: t, schoolId })).body
  );
  if (routes[0]) routeId = String(routes[0].id);
  else {
    const routeCreate = await req('/admin/campus/transport/routes', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({ name: `${marker} bus`, academicYear: year, isPublished: true, isActive: true }),
    });
    routeId = extractId(routeCreate) ?? '';
  }

  if (routeId && studentId) {
    const bus = await req('/admin/campus/transport/check-ins', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({
        routeId,
        studentId,
        checkInType: 'BOARD',
        stopLabel: `${marker} arrêt`,
      }),
    });
    const busId = extractId(bus);
    assert('POST check-in bus', !!busId, String(bus.status));
    if (busId) {
      entries.push({
        label: 'TransportCheckIn',
        id: busId,
        verifyDb: async (p) => {
          const r = await p.transportCheckIn.findUnique({ where: { id: busId } });
          return !!r && String(r.stopLabel ?? '').includes(marker);
        },
      });
    }
  }

  const plan = await req('/admin/campus/canteen/plans', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      name: `${marker} formule`,
      academicYear: year,
      priceAmount: 5000,
      isPublished: true,
    }),
  });
  const planId = extractId(plan);
  assert('POST formule cantine', !!planId, String(plan.status));
  if (planId) {
    entries.push({
      label: 'CanteenMealPlan',
      id: planId,
      verifyDb: async (p) => {
        const r = await p.canteenMealPlan.findUnique({ where: { id: planId } });
        return !!r && r.name.includes(marker);
      },
    });
  }

  const exam = await req('/admin/physical-exams', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      title: `${marker} examen`,
      examKind: 'BEPC',
      subject: 'Maths',
      academicYear: year,
      examDate: today,
      startTime: '08:00',
      endTime: '11:00',
      classIds: classId ? [classId] : [],
    }),
  });
  const examId = extractId(exam);
  assert('POST examen physique', !!examId, String(exam.status));
  if (examId) {
    entries.push({
      label: 'PhysicalExamSession',
      id: examId,
      verifyDb: async (p) => {
        const r = await p.physicalExamSession.findUnique({ where: { id: examId } });
        return !!r && r.title.includes(marker);
      },
    });
  }

  if (classId) {
    const council = await req('/admin/class-councils', {
      method: 'POST',
      token: t,
      schoolId,
      body: JSON.stringify({
        classId,
        period: 'Trimestre 1',
        academicYear: year,
        title: `${marker} conseil`,
        meetingDate: new Date().toISOString(),
        summary: 'Synthèse',
      }),
    });
    const councilId = extractId(council);
    assert('POST conseil de classe', !!councilId, String(council.status));
    if (councilId && studentId) {
      await req(`/admin/class-councils/${councilId}/opinions`, {
        method: 'PUT',
        token: t,
        schoolId,
        body: JSON.stringify({
          studentOpinions: [
            { studentId, average: 13, subjectOpinion: 'Bien', conductOpinion: 'OK', councilDecision: 'Encouragements' },
          ],
        }),
      });
      await req(`/admin/class-councils/${councilId}/finalize`, {
        method: 'POST',
        token: t,
        schoolId,
      });
      entries.push({
        label: 'ClassCouncilSession',
        id: councilId,
        verifyDb: async (p) => {
          const r = await p.classCouncilSession.findUnique({ where: { id: councilId } });
          return !!r && r.title.includes(marker) && r.status === 'FINALIZED';
        },
      });
    }
  }
}

async function writeTeacher(ctx: TestContext, entries: PersistEntry[]): Promise<void> {
  const { marker, courseId, studentId, tokens } = ctx;
  if (!tokens.teacher) {
    skip('Espace enseignant', 'token manquant');
    return;
  }
  console.log('\n-- Enseignant --');
  const t = tokens.teacher;

  if (courseId && studentId) {
    const grade = await req('/teacher/grades', {
      method: 'POST',
      token: t,
      body: JSON.stringify({
        studentId,
        courseId,
        evaluationType: 'EVALUATION',
        title: `${marker} note`,
        score: 14,
        maxScore: 20,
      }),
    });
    const gradeId = extractId(grade);
    assert('POST note enseignant', !!gradeId, String(grade.status));
    if (gradeId) {
      entries.push({
        label: 'Grade',
        id: gradeId,
        verifyDb: async (p) => {
          const r = await p.grade.findUnique({ where: { id: gradeId } });
          return !!r && r.title.includes(marker);
        },
      });
    }

    const due = futureIso(72);
    const assign = await req('/teacher/assignments', {
      method: 'POST',
      token: t,
      body: JSON.stringify({
        courseId,
        title: `${marker} devoir`,
        description: 'Consignes test',
        dueDate: due,
      }),
    });
    const assignId = extractId(assign);
    assert('POST devoir enseignant', !!assignId, String(assign.status));
    if (assignId) {
      entries.push({
        label: 'Assignment',
        id: assignId,
        verifyDb: async (p) => {
          const r = await p.assignment.findUnique({ where: { id: assignId } });
          return !!r && r.title.includes(marker);
        },
      });
    }
  }

  const profile = await req('/teacher/profile', { token: t });
  const courses =
    typeof profile.body === 'object' && profile.body && Array.isArray((profile.body as Json).courses)
      ? ((profile.body as Json).courses as Json[])
      : [];
  const course = courses[0];
  const cId = course ? String(course.id) : courseId;
  const clId = course
    ? String((course.class as Json | undefined)?.id ?? course.classId ?? ctx.classId)
    : ctx.classId;

  if (cId && clId) {
    const log = await req('/teacher/lesson-logs', {
      method: 'POST',
      token: t,
      body: JSON.stringify({
        courseId: cId,
        classId: clId,
        title: `${marker} séance`,
        content: `${marker} contenu cahier`,
        lessonDate: new Date().toISOString(),
      }),
    });
    const logId = extractId(log);
    assert('POST cahier de texte', !!logId, String(log.status));
    if (logId) {
      entries.push({
        label: 'LessonLog',
        id: logId,
        verifyDb: async (p) => {
          const r = await p.lessonLog.findUnique({ where: { id: logId } });
          return !!r && r.content.includes(marker);
        },
        verifyApi: async (c, token) => {
          const list = asArray(
            (await req('/admin/lesson-logs', { token, schoolId: c.schoolId })).body
          );
          return !!findInList(list, logId);
        },
      });
    }
  }
}

async function writeParent(ctx: TestContext, entries: PersistEntry[]): Promise<void> {
  const { marker, childId, teacherId, tokens, year } = ctx;
  if (!tokens.parent || !childId) {
    skip('Espace parent', 'token ou enfant manquant');
    return;
  }
  console.log('\n-- Parent --');
  const t = tokens.parent;

  if (teacherId) {
    const appt = await req('/parent/appointments', {
      method: 'POST',
      token: t,
      body: JSON.stringify({
        studentId: childId,
        teacherId,
        scheduledStart: futureIso(2),
        topic: `${marker} RDV`,
      }),
    });
    const apptId = extractId(appt);
    assert('POST rendez-vous parent', !!apptId, String(appt.status));
    if (apptId) {
      entries.push({
        label: 'ParentTeacherAppointment',
        id: apptId,
        verifyDb: async (p) => {
          const r = await p.parentTeacherAppointment.findUnique({ where: { id: apptId } });
          return !!r && String(r.topic ?? '').includes(marker);
        },
      });
    }
  }

  const start = futureDateOnly(3);
  const end = futureDateOnly(4);
  const perm = await req(`/parent/children/${childId}/absence-permission-requests`, {
    method: 'POST',
    token: t,
    body: JSON.stringify({
      startDate: `${start}T00:00:00.000Z`,
      endDate: `${end}T23:59:59.000Z`,
      motif: 'MEDICAL',
      reasonDetail: `${marker} — justification test persistance`,
    }),
  });
  const permId = extractId(perm);
  assert('POST autorisation absence parent', !!permId, String(perm.status));
  if (permId) {
    entries.push({
      label: 'StudentAbsencePermissionRequest (parent)',
      id: permId,
      verifyDb: async (p) => {
        const r = await p.studentAbsencePermissionRequest.findUnique({ where: { id: permId } });
        return !!r && r.reasonDetail.includes(marker);
      },
    });
  }

  const { default: prisma } = await import('../src/utils/prisma');
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
      average: 12,
      comments: marker,
      published: true,
      publishedAt: new Date(),
    },
    update: {
      published: true,
      publishedAt: new Date(),
      parentAcknowledgedAt: null,
      parentAckSignature: null,
      comments: marker,
    },
  });
  await req(`/parent/children/${childId}/report-cards/${rc.id}/acknowledge`, {
    method: 'POST',
    token: t,
    body: JSON.stringify({ signature: `${marker} signature parent` }),
  });
  entries.push({
    label: 'ReportCard AR',
    id: rc.id,
    verifyDb: async (p) => {
      const r = await p.reportCard.findUnique({ where: { id: rc.id } });
      return !!r?.parentAcknowledgedAt && String(r.parentAckSignature ?? '').includes(marker);
    },
  });

  const contact = await req('/parent/my-contacts', {
    method: 'POST',
    token: t,
    body: JSON.stringify({
      label: `${marker} contact`,
      phone: '+33601020304',
    }),
  });
  const contactId = extractId(contact);
  assert('POST contact parent', !!contactId, String(contact.status));
  if (contactId) {
    entries.push({
      label: 'ParentContact',
      id: contactId,
      verifyDb: async (p) => {
        const r = await p.parentContact.findUnique({ where: { id: contactId } });
        return !!r && r.label.includes(marker);
      },
    });
  }

  const profile = await req('/parent/my-profile', {
    method: 'PUT',
    token: t,
    body: JSON.stringify({ profession: `${marker} profession` }),
  });
  assert('PUT profil parent', profile.status === 200, String(profile.status));
  entries.push({
    label: 'Parent profile',
    id: `parent-${marker}`,
    verifyDb: async (p) => {
      const parent = await p.parent.findFirst({
        where: { user: { email: 'parent1@school.com' } },
        select: { profession: true },
      });
      return String(parent?.profession ?? '').includes(marker);
    },
  });
}

async function writeStudent(ctx: TestContext, entries: PersistEntry[]): Promise<void> {
  if (!ctx.tokens.student) {
    skip('Espace élève', 'token manquant');
    return;
  }
  console.log('\n-- Élève --');
  const t = ctx.tokens.student;
  const start = futureDateOnly(5);
  const end = futureDateOnly(6);

  const perm = await req('/student/absence-permission-requests', {
    method: 'POST',
    token: t,
    body: JSON.stringify({
      startDate: `${start}T00:00:00.000Z`,
      endDate: `${end}T23:59:59.000Z`,
      motif: 'FAMILIAL',
      reasonDetail: `${ctx.marker} — demande élève persistance`,
    }),
  });
  const permId = extractId(perm);
  assert('POST autorisation absence élève', !!permId, String(perm.status));
  if (permId) {
    entries.push({
      label: 'StudentAbsencePermissionRequest (élève)',
      id: permId,
      verifyDb: async (p) => {
        const r = await p.studentAbsencePermissionRequest.findUnique({ where: { id: permId } });
        return !!r && r.reasonDetail.includes(ctx.marker);
      },
    });
  }

  const reenroll = await req('/student/reenrollment-requests', {
    method: 'POST',
    token: t,
    body: JSON.stringify({
      targetAcademicYear: '2026-2027',
      message: `${ctx.marker} réinscription`,
    }),
  });
  const reenrollId = extractId(reenroll);
  assert(
    'POST demande réinscription élève',
    !!reenrollId || reenroll.status === 409,
    String(reenroll.status)
  );
  if (reenrollId) {
    entries.push({
      label: 'StudentReenrollmentRequest',
      id: reenrollId,
      verifyDb: async (p) => {
        const r = await p.studentReenrollmentRequest.findUnique({ where: { id: reenrollId } });
        return !!r && String(r.message ?? '').includes(ctx.marker);
      },
    });
  }
}

async function writeEducator(ctx: TestContext, entries: PersistEntry[]): Promise<void> {
  if (!ctx.tokens.educator || !ctx.studentId) {
    skip('Espace éducateur', 'token ou élève manquant');
    return;
  }
  console.log('\n-- Éducateur --');
  const conduct = await req('/educator/conducts', {
    method: 'POST',
    token: ctx.tokens.educator,
    body: JSON.stringify({
      studentId: ctx.studentId,
      period: 'Trimestre 1',
      academicYear: ctx.year,
      punctuality: 16,
      respect: 15,
      behavior: 17,
      comments: ctx.marker,
    }),
  });
  assert('POST conduite éducateur', conduct.status === 200 || conduct.status === 201, String(conduct.status));
  entries.push({
    label: 'Conduct (educator)',
    id: `edu-${ctx.studentId}`,
    verifyDb: async (p) => {
      const r = await p.conduct.findFirst({
        where: { studentId: ctx.studentId, academicYear: ctx.year, period: 'Trimestre 1' },
        orderBy: { updatedAt: 'desc' },
      });
      return !!r && String(r.comments ?? '').includes(ctx.marker);
    },
  });
}

async function writeHealth(ctx: TestContext, entries: PersistEntry[]): Promise<void> {
  if (!ctx.tokens.nurse || !ctx.studentId) {
    skip('Infirmerie', 'token infirmière ou élève manquant');
    return;
  }
  console.log('\n-- Infirmerie --');
  const t = ctx.tokens.nurse;
  const { marker, studentId, schoolId } = ctx;

  const visit = await req('/health/visits', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({ studentId, motive: `${marker} visite`, outcome: 'RETURN_TO_CLASS' }),
  });
  const visitId = extractId(visit);
  assert('POST visite infirmerie', !!visitId, String(visit.status));
  if (visitId) {
    entries.push({
      label: 'InfirmaryVisit',
      id: visitId,
      verifyDb: async (p) => {
        const r = await p.infirmaryVisit.findUnique({ where: { id: visitId } });
        return !!r && r.motive.includes(marker);
      },
    });
  }

  const vacc = await req(`/health/students/${studentId}/vaccinations`, {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      vaccineName: `${marker} vaccin`,
      administeredAt: new Date().toISOString(),
    }),
  });
  const vaccId = extractId(vacc);
  assert('POST vaccination', !!vaccId, String(vacc.status));
  if (vaccId) {
    entries.push({
      label: 'StudentVaccination',
      id: vaccId,
      verifyDb: async (p) => {
        const r = await p.studentVaccination.findUnique({ where: { id: vaccId } });
        return !!r && r.vaccineName.includes(marker);
      },
    });
  }

  const allergy = await req(`/health/students/${studentId}/allergies`, {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({ allergen: `${marker} allergène`, severity: 'MODERATE' }),
  });
  const allergyId = extractId(allergy);
  assert('POST allergie', !!allergyId, String(allergy.status));
  if (allergyId) {
    entries.push({
      label: 'StudentAllergyRecord',
      id: allergyId,
      verifyDb: async (p) => {
        const r = await p.studentAllergyRecord.findUnique({ where: { id: allergyId } });
        return !!r && r.allergen.includes(marker);
      },
    });
  }

  const campStart = futureDateOnly(10);
  const campEnd = futureDateOnly(12);
  const camp = await req('/health/campaigns', {
    method: 'POST',
    token: t,
    schoolId,
    body: JSON.stringify({
      kind: 'AWARENESS',
      title: `${marker} campagne`,
      startDate: `${campStart}T08:00:00.000Z`,
      endDate: `${campEnd}T17:00:00.000Z`,
      description: 'Campagne test',
    }),
  });
  const campId = extractId(camp);
  assert('POST campagne santé', !!campId, String(camp.status));
  if (campId) {
    entries.push({
      label: 'HealthCampaign',
      id: campId,
      verifyDb: async (p) => {
        const r = await p.healthCampaign.findUnique({ where: { id: campId } });
        return !!r && r.title.includes(marker);
      },
    });
  }
}

async function writePublic(ctx: TestContext, entries: PersistEntry[]): Promise<void> {
  console.log('\n-- Public --');
  const visitorCookie = `visitor_id=persist-${Date.now()}`;

  const lead = await req('/public/leads/contact', {
    method: 'POST',
    cookie: visitorCookie,
    body: JSON.stringify({
      name: `${ctx.marker} visiteur`,
      email: `persist-${Date.now()}@example.com`,
      message: `${ctx.marker} message contact public`,
    }),
  });
  assert('POST lead contact public', lead.status === 201, String(lead.status));
  entries.push({
    label: 'PublicContactLead',
    id: `lead-${ctx.marker}`,
    verifyDb: async (p) => {
      const r = await p.publicContactLead.findFirst({
        where: { message: { contains: ctx.marker } },
      });
      return !!r;
    },
  });
}

async function main() {
  console.log('=== Test de persistance — toutes les saisies ===\n');
  console.log(`API: ${API}\n`);

  const health = await req('/health');
  assert('API /health', health.status === 200, String(health.status));
  if (health.status !== 200) {
    console.error('\nAPI indisponible. Lancez npm run dev.');
    process.exit(1);
  }

  const ctx = await setupContext();
  if (!ctx) {
    console.error('\nContexte seed incomplet.');
    process.exit(1);
  }
  console.log(`Marqueur: ${ctx.marker}\n`);

  const entries: PersistEntry[] = [];
  const { default: prisma } = await import('../src/utils/prisma');

  await writeAdmin(ctx, entries);
  await writeTeacher(ctx, entries);
  await writeParent(ctx, entries);
  await writeStudent(ctx, entries);
  await writeEducator(ctx, entries);
  await writeHealth(ctx, entries);
  await writePublic(ctx, entries);

  await new Promise((r) => setTimeout(r, 400));
  await verifyAll(entries, ctx, prisma);
  await prisma.$disconnect();

  const { passed, failed, skipped } = getStats();
  console.log('\n=== Résumé persistance (toutes saisies) ===');
  console.log(`Entités testées : ${entries.length}`);
  console.log(`OK: ${passed} | FAIL: ${failed} | SKIP: ${skipped}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
