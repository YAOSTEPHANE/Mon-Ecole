import express from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { SchoolContextRequest } from '../utils/school-context.util';
import { auditTimetableConflicts } from '../utils/timetable-audit.util';
import { billAllCampusServices } from '../utils/campus-billing.util';
import { runAutomaticAbsenceReminders } from '../utils/absence-reminder.util';
import { buildClassCouncilMinutesHtml } from '../utils/html-document.util';

const router = express.Router();

function schoolIdFrom(req: SchoolContextRequest): string | undefined {
  return req.schoolId || undefined;
}

function parseDateYmd(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return null;
  return v.trim();
}

// ——— Audit conflits EDT ———

router.get('/timetable/conflicts-audit', async (req: SchoolContextRequest, res) => {
  try {
    const classId = typeof req.query.classId === 'string' ? req.query.classId.trim() : '';
    const result = await auditTimetableConflicts(prisma, classId ? { classIds: [classId] } : undefined);
    res.json(result);
  } catch (e) {
    console.error('GET /admin/timetable/conflicts-audit:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Facturation campus → scolarité ———

router.post('/campus/bill-subscriptions', async (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const academicYear = typeof b.academicYear === 'string' ? b.academicYear.trim() : undefined;
    const dueDate =
      typeof b.dueDate === 'string' && b.dueDate ? new Date(b.dueDate) : undefined;
    const result = await billAllCampusServices({ academicYear, dueDate });
    res.json(result);
  } catch (e) {
    console.error('POST /admin/campus/bill-subscriptions:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Relances absences (manuel) ———

router.post('/attendance/run-absence-reminders', async (_req, res) => {
  try {
    const result = await runAutomaticAbsenceReminders();
    res.json(result);
  } catch (e) {
    console.error('POST /admin/attendance/run-absence-reminders:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Menus cantine du jour ———

router.get('/campus/canteen/menus', async (req: SchoolContextRequest, res) => {
  try {
    const menuDate = parseDateYmd(req.query.menuDate) ?? parseDateYmd(new Date().toISOString().slice(0, 10));
    const planId = typeof req.query.planId === 'string' ? req.query.planId.trim() : undefined;
    const sid = schoolIdFrom(req);
    const where: Prisma.CanteenDailyMenuWhereInput = {
      menuDate: menuDate ?? undefined,
      ...(planId ? { planId } : {}),
      ...(sid ? { OR: [{ schoolId: sid }, { schoolId: null }] } : {}),
    };
    const rows = await prisma.canteenDailyMenu.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { id: true, name: true } } },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/campus/canteen/menus', async (req: AuthRequest & SchoolContextRequest, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const menuDate = parseDateYmd(b.menuDate);
    const mainCourse = typeof b.mainCourse === 'string' ? b.mainCourse.trim() : '';
    if (!menuDate || !mainCourse) {
      return res.status(400).json({ error: 'menuDate (YYYY-MM-DD) et mainCourse requis' });
    }
    const row = await prisma.canteenDailyMenu.create({
      data: {
        menuDate,
        mainCourse,
        sideDish: typeof b.sideDish === 'string' ? b.sideDish.trim() || null : null,
        dessert: typeof b.dessert === 'string' ? b.dessert.trim() || null : null,
        notes: typeof b.notes === 'string' ? b.notes.trim() || null : null,
        planId: typeof b.planId === 'string' && b.planId.trim() ? b.planId.trim() : null,
        schoolId: schoolIdFrom(req) ?? null,
      },
      include: { plan: { select: { id: true, name: true } } },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/campus/canteen/menus/:id', async (req, res) => {
  try {
    await prisma.canteenDailyMenu.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Pointage repas cantine ———

router.get('/campus/canteen/check-ins', async (req, res) => {
  try {
    const menuDate = parseDateYmd(req.query.menuDate);
    if (!menuDate) return res.status(400).json({ error: 'menuDate requis (YYYY-MM-DD)' });
    const rows = await prisma.canteenMealCheckIn.findMany({
      where: { menuDate },
      orderBy: { checkedInAt: 'desc' },
      take: 500,
    });
    const studentIds = [...new Set(rows.map((r) => r.studentId))] as string[];
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { user: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    res.json(
      rows.map((r) => ({
        ...r,
        student: byId.get(r.studentId) ?? null,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/campus/canteen/check-ins', async (req: AuthRequest, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const studentId = typeof b.studentId === 'string' ? b.studentId.trim() : '';
    const menuDate = parseDateYmd(b.menuDate) ?? parseDateYmd(new Date().toISOString().slice(0, 10));
    if (!studentId || !menuDate) {
      return res.status(400).json({ error: 'studentId et menuDate requis' });
    }
    const mealType =
      b.mealType === 'BREAKFAST' || b.mealType === 'SNACK' ? b.mealType : 'LUNCH';
    const row = await prisma.canteenMealCheckIn.upsert({
      where: { studentId_menuDate_mealType: { studentId, menuDate, mealType } },
      create: {
        studentId,
        menuDate,
        mealType,
        checkedInByUserId: req.user?.id ?? null,
        planId: typeof b.planId === 'string' ? b.planId.trim() || null : null,
        notes: typeof b.notes === 'string' ? b.notes.trim() || null : null,
      },
      update: {
        checkedInAt: new Date(),
        checkedInByUserId: req.user?.id ?? null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Check-in transport ———

router.get('/campus/transport/check-ins', async (req, res) => {
  try {
    const routeId = typeof req.query.routeId === 'string' ? req.query.routeId.trim() : '';
    const dateStr = parseDateYmd(req.query.date);
    const where: Prisma.TransportCheckInWhereInput = {};
    if (routeId) where.routeId = routeId;
    if (dateStr) {
      const start = new Date(`${dateStr}T00:00:00.000Z`);
      const end = new Date(`${dateStr}T23:59:59.999Z`);
      where.checkedInAt = { gte: start, lte: end };
    }
    const rows = await prisma.transportCheckIn.findMany({
      where,
      orderBy: { checkedInAt: 'desc' },
      take: 300,
      include: { route: { select: { id: true, name: true } } },
    });
    const studentIds = [...new Set(rows.map((r) => r.studentId))] as string[];
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    res.json(rows.map((r) => ({ ...r, student: byId.get(r.studentId) ?? null })));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/campus/transport/check-ins', async (req: AuthRequest, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const routeId = typeof b.routeId === 'string' ? b.routeId.trim() : '';
    const studentId = typeof b.studentId === 'string' ? b.studentId.trim() : '';
    if (!routeId || !studentId) {
      return res.status(400).json({ error: 'routeId et studentId requis' });
    }
    const checkInType = b.checkInType === 'DROPOFF' ? 'DROPOFF' : 'BOARD';
    const row = await prisma.transportCheckIn.create({
      data: {
        routeId,
        studentId,
        checkInType,
        stopLabel: typeof b.stopLabel === 'string' ? b.stopLabel.trim() || null : null,
        recordedByUserId: req.user?.id ?? null,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
        notes: typeof b.notes === 'string' ? b.notes.trim() || null : null,
      },
      include: { route: { select: { id: true, name: true } } },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Examens physiques ———

router.get('/physical-exams', async (req: SchoolContextRequest, res) => {
  try {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
    const sid = schoolIdFrom(req);
    const rows = await prisma.physicalExamSession.findMany({
      where: {
        ...(academicYear ? { academicYear } : {}),
        ...(sid ? { OR: [{ schoolId: sid }, { schoolId: null }] } : {}),
      },
      orderBy: { examDate: 'asc' },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/physical-exams', async (req: AuthRequest & SchoolContextRequest, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    const academicYear = typeof b.academicYear === 'string' ? b.academicYear.trim() : '';
    const examDate = typeof b.examDate === 'string' ? new Date(b.examDate) : null;
    const startTime = typeof b.startTime === 'string' ? b.startTime.trim() : '';
    const endTime = typeof b.endTime === 'string' ? b.endTime.trim() : '';
    if (!title || !academicYear || !examDate || !startTime || !endTime) {
      return res.status(400).json({
        error: 'title, academicYear, examDate, startTime et endTime requis',
      });
    }
    const row = await prisma.physicalExamSession.create({
      data: {
        title,
        examKind: typeof b.examKind === 'string' ? b.examKind.trim() || 'AUTRE' : 'AUTRE',
        subject: typeof b.subject === 'string' ? b.subject.trim() || null : null,
        academicYear,
        examDate,
        startTime,
        endTime,
        room: typeof b.room === 'string' ? b.room.trim() || null : null,
        supervisorIds: Array.isArray(b.supervisorIds) ? b.supervisorIds.map(String) : [],
        classIds: Array.isArray(b.classIds) ? b.classIds.map(String) : [],
        notes: typeof b.notes === 'string' ? b.notes.trim() || null : null,
        isPublished: Boolean(b.isPublished),
        schoolId: schoolIdFrom(req) ?? null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.patch('/physical-exams/:id', async (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const row = await prisma.physicalExamSession.update({
      where: { id: req.params.id },
      data: {
        ...(b.title != null ? { title: String(b.title).trim() } : {}),
        ...(b.examKind != null ? { examKind: String(b.examKind).trim() } : {}),
        ...(b.subject !== undefined ? { subject: b.subject ? String(b.subject).trim() : null } : {}),
        ...(b.examDate != null ? { examDate: new Date(String(b.examDate)) } : {}),
        ...(b.startTime != null ? { startTime: String(b.startTime).trim() } : {}),
        ...(b.endTime != null ? { endTime: String(b.endTime).trim() } : {}),
        ...(b.room !== undefined ? { room: b.room ? String(b.room).trim() : null } : {}),
        ...(b.isPublished !== undefined ? { isPublished: Boolean(b.isPublished) } : {}),
        ...(b.notes !== undefined ? { notes: b.notes ? String(b.notes).trim() : null } : {}),
        ...(Array.isArray(b.classIds) ? { classIds: b.classIds.map(String) } : {}),
        ...(Array.isArray(b.supervisorIds) ? { supervisorIds: b.supervisorIds.map(String) } : {}),
      },
    });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/physical-exams/:id', async (req, res) => {
  try {
    await prisma.physicalExamSession.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Conseil de classe : avis élèves + PV HTML ———

router.put('/class-councils/:id/opinions', async (req, res) => {
  try {
    const opinions = req.body?.studentOpinions;
    if (!Array.isArray(opinions)) {
      return res.status(400).json({ error: 'studentOpinions (tableau) requis' });
    }
    const updated = await prisma.classCouncilSession.update({
      where: { id: req.params.id },
      data: { studentOpinions: opinions },
      include: { class: { select: { id: true, name: true, level: true } } },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/class-councils/:id/finalize', async (req, res) => {
  try {
    const updated = await prisma.classCouncilSession.update({
      where: { id: req.params.id },
      data: { status: 'FINALIZED' },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/class-councils/:id/minutes-html', async (req, res) => {
  try {
    const council = await prisma.classCouncilSession.findUnique({
      where: { id: req.params.id },
      include: { class: { select: { name: true, level: true } } },
    });
    if (!council) return res.status(404).json({ error: 'Conseil introuvable' });

    const rawOpinions = council.studentOpinions;
    const opinionList = Array.isArray(rawOpinions) ? rawOpinions : [];
    const studentIds = opinionList
      .map((o) => (typeof o === 'object' && o && 'studentId' in o ? String((o as { studentId: string }).studentId) : ''))
      .filter(Boolean);
    const students = studentIds.length
      ? await prisma.student.findMany({
          where: { id: { in: studentIds } },
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      : [];
    const nameById = new Map(
      students.map((s) => [s.id, `${s.user.firstName} ${s.user.lastName}`.trim()])
    );

    const studentOpinions = opinionList.map((o) => {
      const row = o as Record<string, unknown>;
      const sid = String(row.studentId ?? '');
      return {
        studentName: (nameById.get(sid) ?? sid) || 'Élève',
        subjectOpinion: row.subjectOpinion != null ? String(row.subjectOpinion) : undefined,
        conductOpinion: row.conductOpinion != null ? String(row.conductOpinion) : undefined,
        councilDecision: row.councilDecision != null ? String(row.councilDecision) : undefined,
        average: row.average != null ? Number(row.average) : null,
      };
    });

    const html = buildClassCouncilMinutesHtml({
      className: council.class.name,
      classLevel: council.class.level,
      period: council.period,
      academicYear: council.academicYear,
      meetingDate: council.meetingDate,
      title: council.title,
      summary: council.summary,
      decisions: council.decisions,
      recommendations: council.recommendations,
      studentOpinions,
    });

    await prisma.classCouncilSession.update({
      where: { id: council.id },
      data: { minutesGeneratedAt: new Date() },
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="pv-conseil-${council.class.name.replace(/\s+/g, '-')}.html"`
    );
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Cahier de texte (admin lecture) ———

router.get('/lesson-logs', async (req, res) => {
  try {
    const classId = typeof req.query.classId === 'string' ? req.query.classId.trim() : '';
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId.trim() : '';
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;
    const rows = await prisma.lessonLog.findMany({
      where: {
        ...(classId ? { classId } : {}),
        ...(courseId ? { courseId } : {}),
        ...(from || to
          ? {
              lessonDate: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { lessonDate: 'desc' },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
