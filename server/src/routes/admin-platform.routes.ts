import express from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listConfiguredPaymentProviders } from '../utils/payment-providers.util';
import {
  sendWhatsAppText,
  isWhatsAppConfigured,
  normalizeWaPhone,
} from '../utils/whatsapp.util';
import { scoreTimetableCandidates, pickBestTimetableSlot } from '../utils/timetable-optimizer.util';
import { linearForecast, growthRate } from '../utils/predictive-bi.util';
import {
  awardGamificationPoints,
  getStudentGamificationSummary,
} from '../utils/gamification.util';
import {
  assertClassInSchool,
  assertStudentInSchool,
  assertTeacherInSchool,
  scopedParentWhere,
} from '../utils/school-access-guard.util';
import { classScopeWhere, type SchoolContextRequest } from '../utils/school-context.util';
import { whatsappSendLimiter } from '../middleware/rate-limit.middleware';

const router = express.Router();

function errorStatus(error: unknown): number {
  return typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
    ? error.status
    : 500;
}

router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN', 'STAFF'));

/** État des connecteurs paiement (sans secrets). */
router.get('/integrations/payments', (_req, res) => {
  res.json({
    providers: listConfiguredPaymentProviders(),
    webhookPath: '/api/payments/webhooks/mobile-money',
    hint: 'Configurer WAVE_API_KEY, CINETPAY_*, PAYSTACK_SECRET_KEY, ORANGE_MONEY_*, MTN_MOMO_* et PAYMENT_WEBHOOK_SECRET. Webhooks: /api/payments/webhooks/{mobile-money|paystack|cinetpay|wave}',
  });
});

router.get('/integrations/whatsapp/status', (_req, res) => {
  res.json({ configured: isWhatsAppConfigured() });
});

router.post(
  '/integrations/whatsapp/send',
  authorize('ADMIN', 'SUPER_ADMIN'),
  whatsappSendLimiter,
  async (req: SchoolContextRequest, res) => {
    try {
      const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!phone || !message || message.length > 4000) {
        return res.status(400).json({ error: 'phone ou message invalide' });
      }

      const normalized = normalizeWaPhone(phone);
      if (normalized.length < 8 || normalized.length > 15) {
        return res.status(400).json({ error: 'Numéro WhatsApp invalide' });
      }
      const countryCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '237').replace(/\D/g, '');
      const local =
        countryCode && normalized.startsWith(countryCode)
          ? `0${normalized.slice(countryCode.length)}`
          : '';
      const phoneVariants = [...new Set([phone, normalized, `+${normalized}`, `00${normalized}`, local])]
        .filter(Boolean);

      const parent = await prisma.parent.findFirst({
        where: {
          ...scopedParentWhere(req.schoolId!),
          OR: [
            { user: { phone: { in: phoneVariants } } },
            { contacts: { some: { phone: { in: phoneVariants } } } },
          ],
        },
        select: {
          user: { select: { phone: true } },
          contacts: { select: { phone: true } },
        },
      });
      const registeredPhones = [
        parent?.user.phone,
        ...(parent?.contacts.map((contact) => contact.phone) ?? []),
      ].filter((value): value is string => Boolean(value));
      const registeredPhone = registeredPhones.find(
        (value) => normalizeWaPhone(value) === normalized,
      );
      if (!registeredPhone) {
        return res.status(403).json({
          error: 'Ce numéro n’appartient pas à un parent de l’établissement actif.',
        });
      }

      const result = await sendWhatsAppText(registeredPhone, message);
      if (!result.success) return res.status(502).json(result);
      return res.json(result);
    } catch (e) {
      return res
        .status(errorStatus(e))
        .json({ error: e instanceof Error ? e.message : 'Erreur WhatsApp' });
    }
  },
);

/** GPS transport — dernière position + historique */
router.get('/campus/transport/routes/:id/tracking', async (req: SchoolContextRequest, res) => {
  try {
    const routeId = req.params.id;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const route = await prisma.transportRoute.findFirst({
      where: {
        id: routeId,
        ...(req.school?.isDefault
          ? { OR: [{ schoolId: req.schoolId }, { schoolId: null }] }
          : { schoolId: req.schoolId }),
      },
      select: { id: true, name: true, vehicleLabel: true },
    });
    if (!route) return res.status(404).json({ error: 'Ligne introuvable' });
    const pings = await prisma.transportVehiclePing.findMany({
      where: { routeId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    res.json({ route, latest: pings[0] ?? null, pings });
  } catch (e) {
    res.status(errorStatus(e)).json({ error: e instanceof Error ? e.message : 'Erreur tracking' });
  }
});

router.post('/campus/transport/routes/:id/tracking', async (req: SchoolContextRequest, res) => {
  try {
    const routeId = req.params.id;
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ error: 'Coordonnées GPS invalides' });
    }
    const route = await prisma.transportRoute.findFirst({
      where: {
        id: routeId,
        ...(req.school?.isDefault
          ? { OR: [{ schoolId: req.schoolId }, { schoolId: null }] }
          : { schoolId: req.schoolId }),
      },
      select: { id: true },
    });
    if (!route) return res.status(404).json({ error: 'Ligne introuvable' });

    const ping = await prisma.transportVehiclePing.create({
      data: {
        routeId,
        latitude,
        longitude,
        speedKmh:
          req.body?.speedKmh != null && Number.isFinite(Number(req.body.speedKmh))
            ? Number(req.body.speedKmh)
            : null,
        heading:
          req.body?.heading != null && Number.isFinite(Number(req.body.heading))
            ? Number(req.body.heading)
            : null,
        note: typeof req.body?.note === 'string' ? req.body.note.slice(0, 200) : null,
      },
    });
    res.status(201).json(ping);
  } catch (e) {
    res.status(errorStatus(e)).json({ error: e instanceof Error ? e.message : 'Erreur ping GPS' });
  }
});

/** Optimiseur EDT */
router.post('/schedule/optimize', async (req: SchoolContextRequest, res) => {
  try {
    const classId = typeof req.body?.classId === 'string' ? req.body.classId : '';
    const teacherId = typeof req.body?.teacherId === 'string' ? req.body.teacherId : undefined;
    const candidates = Array.isArray(req.body?.candidates) ? req.body.candidates : [];
    if (!classId || candidates.length === 0) {
      return res.status(400).json({ error: 'classId et candidates[] requis' });
    }
    await assertClassInSchool(classId, req.schoolId, req.school?.isDefault ?? false);
    if (teacherId) await assertTeacherInSchool(teacherId, req.schoolId);

    const existing = await prisma.schedule.findMany({
      where: { classId, class: classScopeWhere(req.schoolId!, req.school?.isDefault ?? false) },
      select: {
        id: true,
        classId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        room: true,
        course: { select: { teacherId: true } },
      },
    });

    let teacherLessons: typeof existing = [];
    if (teacherId) {
      teacherLessons = await prisma.schedule.findMany({
        where: {
          course: { teacherId },
          class: classScopeWhere(req.schoolId!, req.school?.isDefault ?? false),
        },
        select: {
          id: true,
          classId: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          course: { select: { teacherId: true } },
        },
      });
    }

    const merged = [...existing, ...teacherLessons.filter((t) => !existing.some((e) => e.id === t.id))];

    const mappedExisting = merged.map((e) => ({
      id: e.id,
      classId: e.classId,
      teacherId: e.course.teacherId,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      roomKey: e.room,
    }));

    const scored = scoreTimetableCandidates({
      classId,
      teacherId,
      candidates,
      existing: mappedExisting,
      preferMorning: req.body?.preferMorning !== false,
    });
    const best = pickBestTimetableSlot({
      classId,
      teacherId,
      candidates,
      existing: mappedExisting,
    });

    res.json({ best, ranked: scored.slice(0, 20), existingCount: merged.length });
  } catch (e) {
    res.status(errorStatus(e)).json({ error: e instanceof Error ? e.message : 'Erreur optimisation' });
  }
});

/** BI prédictive légère (encaissements) */
router.get('/analytics/forecast/payments', async (req: SchoolContextRequest, res) => {
  try {
    const months = Math.min(12, Math.max(3, Number(req.query.months) || 6));
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: since },
        ...(req.schoolId
          ? { student: { OR: [{ schoolId: req.schoolId }, { class: { schoolId: req.schoolId } }] } }
          : {}),
      },
      select: { amount: true, paidAt: true },
    });

    const bucket = new Map<string, number>();
    for (const p of payments) {
      if (!p.paidAt) continue;
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      bucket.set(key, (bucket.get(key) || 0) + p.amount);
    }
    const history = [...bucket.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, amount]) => ({ label, amount: Math.round(amount) }));

    const forecast = linearForecast(history, 3);
    res.json({
      history,
      forecast,
      growthRatePct: growthRate(history),
      method: 'régression linéaire simple',
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur forecast' });
  }
});

/** Gamification — résumé élève */
router.get('/gamification/students/:studentId', async (req: SchoolContextRequest, res) => {
  try {
    await assertStudentInSchool(
      req.params.studentId,
      req.schoolId,
      req.school?.isDefault ?? false,
    );
    const summary = await getStudentGamificationSummary(req.params.studentId);
    res.json(summary);
  } catch (e) {
    res.status(errorStatus(e)).json({ error: e instanceof Error ? e.message : 'Erreur gamification' });
  }
});

router.post('/gamification/students/:studentId/award', async (req: SchoolContextRequest, res) => {
  try {
    const points = Number(req.body?.points);
    const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
    const allowedKinds = new Set(['GRADE', 'ASSIGNMENT', 'ATTENDANCE', 'BADGE'] as const);
    const rawKind = typeof req.body?.kind === 'string' ? req.body.kind : 'BADGE';
    if (!allowedKinds.has(rawKind as 'GRADE' | 'ASSIGNMENT' | 'ATTENDANCE' | 'BADGE')) {
      return res.status(400).json({ error: 'Type de récompense invalide' });
    }
    if (!label || label.length > 200 || !Number.isFinite(points) || Math.abs(points) > 10_000) {
      return res.status(400).json({ error: 'label ou points invalides' });
    }
    await assertStudentInSchool(
      req.params.studentId,
      req.schoolId,
      req.school?.isDefault ?? false,
    );
    const kind = rawKind as 'GRADE' | 'ASSIGNMENT' | 'ATTENDANCE' | 'BADGE';
    const row = await awardGamificationPoints({
      studentId: req.params.studentId,
      kind,
      points: Math.round(points),
      label,
      badgeCode: typeof req.body?.badgeCode === 'string' ? req.body.badgeCode : undefined,
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(errorStatus(e)).json({ error: e instanceof Error ? e.message : 'Erreur award' });
  }
});

/** Stub LTI 1.3 config (pour brancher un LMS externe) */
router.get('/integrations/lti/config', (_req, res) => {
  const issuer = process.env.LTI_ISSUER?.trim() || 'https://ecole.example.org';
  res.json({
    status: 'stub',
    issuer,
    clientId: process.env.LTI_CLIENT_ID || null,
    authLoginUrl: `${issuer}/lti/login`,
    authTokenUrl: `${issuer}/lti/token`,
    jwksUrl: `${issuer}/lti/jwks`,
    note: 'Configurer LTI_ISSUER / LTI_CLIENT_ID pour brancher un outil LTI (SCORM via package zip à venir).',
  });
});

export default router;
