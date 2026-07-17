import express from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { SchoolContextRequest } from '../utils/school-context.util';
import {
  subscribeStudentToCanteen,
  subscribeStudentToTransport,
} from '../utils/campus-services.util';

const router = express.Router();

function schoolIdFrom(req: SchoolContextRequest): string | undefined {
  return req.schoolId || undefined;
}

// ——— Cantine ———

router.get('/campus/canteen/plans', async (req: SchoolContextRequest, res) => {
  try {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
    const publishedOnly = req.query.publishedOnly === 'true';
    const where: Prisma.CanteenMealPlanWhereInput = {
      ...(academicYear ? { academicYear } : {}),
      ...(publishedOnly ? { isPublished: true, isActive: true } : {}),
      ...(schoolIdFrom(req)
        ? { OR: [{ schoolId: schoolIdFrom(req) }, { schoolId: null }] }
        : {}),
    };
    const rows = await prisma.canteenMealPlan.findMany({
      where,
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json(rows);
  } catch (e) {
    console.error('GET /admin/campus/canteen/plans:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/campus/canteen/plans', async (req: AuthRequest & SchoolContextRequest, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    const academicYear = typeof b.academicYear === 'string' ? b.academicYear.trim() : '';
    if (!name || !academicYear) {
      return res.status(400).json({ error: 'name et academicYear requis' });
    }
    const row = await prisma.canteenMealPlan.create({
      data: {
        name,
        academicYear,
        description: typeof b.description === 'string' ? b.description.trim() || null : null,
        priceAmount: Number(b.priceAmount ?? 0) || 0,
        weekdays: Array.isArray(b.weekdays) ? b.weekdays.map(String) : [],
        menuNotes: typeof b.menuNotes === 'string' ? b.menuNotes.trim() || null : null,
        maxSubscribers:
          b.maxSubscribers != null && String(b.maxSubscribers).trim() !== ''
            ? Math.max(0, parseInt(String(b.maxSubscribers), 10) || 0) || null
            : null,
        isPublished: Boolean(b.isPublished),
        isActive: b.isActive === undefined ? true : Boolean(b.isActive),
        schoolId: schoolIdFrom(req) ?? null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.put('/campus/canteen/plans/:id', async (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const row = await prisma.canteenMealPlan.update({
      where: { id: req.params.id },
      data: {
        ...(b.name != null ? { name: String(b.name).trim() } : {}),
        ...(b.description !== undefined
          ? { description: b.description ? String(b.description).trim() : null }
          : {}),
        ...(b.priceAmount != null ? { priceAmount: Number(b.priceAmount) || 0 } : {}),
        ...(b.weekdays != null ? { weekdays: Array.isArray(b.weekdays) ? b.weekdays.map(String) : [] } : {}),
        ...(b.menuNotes !== undefined
          ? { menuNotes: b.menuNotes ? String(b.menuNotes).trim() : null }
          : {}),
        ...(b.maxSubscribers !== undefined
          ? {
              maxSubscribers:
                b.maxSubscribers === null || b.maxSubscribers === ''
                  ? null
                  : Math.max(0, parseInt(String(b.maxSubscribers), 10) || 0) || null,
            }
          : {}),
        ...(b.isPublished !== undefined ? { isPublished: Boolean(b.isPublished) } : {}),
        ...(b.isActive !== undefined ? { isActive: Boolean(b.isActive) } : {}),
      },
    });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/campus/canteen/plans/:id', async (req, res) => {
  try {
    await prisma.canteenSubscription.deleteMany({ where: { planId: req.params.id } });
    await prisma.canteenMealPlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Formule supprimée' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/campus/canteen/plans/:id/subscriptions', async (req, res) => {
  try {
    const rows = await prisma.canteenSubscription.findMany({
      where: { planId: req.params.id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, level: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/campus/canteen/subscriptions', async (req, res) => {
  try {
    const studentId = typeof req.body?.studentId === 'string' ? req.body.studentId : '';
    const planId = typeof req.body?.planId === 'string' ? req.body.planId : '';
    if (!studentId || !planId) return res.status(400).json({ error: 'studentId et planId requis' });
    const result = await subscribeStudentToCanteen(studentId, planId);
    res.status(201).json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/campus/canteen/subscriptions/:id', async (req, res) => {
  try {
    await prisma.canteenSubscription.delete({ where: { id: req.params.id } });
    res.json({ message: 'Inscription cantine annulée' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// ——— Transport ———

router.get('/campus/transport/routes', async (req: SchoolContextRequest, res) => {
  try {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
    const publishedOnly = req.query.publishedOnly === 'true';
    const where: Prisma.TransportRouteWhereInput = {
      ...(academicYear ? { academicYear } : {}),
      ...(publishedOnly ? { isPublished: true, isActive: true } : {}),
      ...(schoolIdFrom(req)
        ? { OR: [{ schoolId: schoolIdFrom(req) }, { schoolId: null }] }
        : {}),
    };
    const rows = await prisma.transportRoute.findMany({
      where,
      orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/campus/transport/routes', async (req: AuthRequest & SchoolContextRequest, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    const academicYear = typeof b.academicYear === 'string' ? b.academicYear.trim() : '';
    if (!name || !academicYear) {
      return res.status(400).json({ error: 'name et academicYear requis' });
    }
    const row = await prisma.transportRoute.create({
      data: {
        name,
        academicYear,
        description: typeof b.description === 'string' ? b.description.trim() || null : null,
        departureArea: typeof b.departureArea === 'string' ? b.departureArea.trim() || null : null,
        arrivalArea: typeof b.arrivalArea === 'string' ? b.arrivalArea.trim() || null : null,
        scheduleNotes: typeof b.scheduleNotes === 'string' ? b.scheduleNotes.trim() || null : null,
        vehicleLabel: typeof b.vehicleLabel === 'string' ? b.vehicleLabel.trim() || null : null,
        driverName: typeof b.driverName === 'string' ? b.driverName.trim() || null : null,
        driverPhone: typeof b.driverPhone === 'string' ? b.driverPhone.trim() || null : null,
        capacity:
          b.capacity != null && String(b.capacity).trim() !== ''
            ? Math.max(0, parseInt(String(b.capacity), 10) || 0) || null
            : null,
        priceAmount: Number(b.priceAmount ?? 0) || 0,
        isPublished: Boolean(b.isPublished),
        isActive: b.isActive === undefined ? true : Boolean(b.isActive),
        schoolId: schoolIdFrom(req) ?? null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.put('/campus/transport/routes/:id', async (req, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const row = await prisma.transportRoute.update({
      where: { id: req.params.id },
      data: {
        ...(b.name != null ? { name: String(b.name).trim() } : {}),
        ...(b.description !== undefined
          ? { description: b.description ? String(b.description).trim() : null }
          : {}),
        ...(b.departureArea !== undefined
          ? { departureArea: b.departureArea ? String(b.departureArea).trim() : null }
          : {}),
        ...(b.arrivalArea !== undefined
          ? { arrivalArea: b.arrivalArea ? String(b.arrivalArea).trim() : null }
          : {}),
        ...(b.scheduleNotes !== undefined
          ? { scheduleNotes: b.scheduleNotes ? String(b.scheduleNotes).trim() : null }
          : {}),
        ...(b.vehicleLabel !== undefined
          ? { vehicleLabel: b.vehicleLabel ? String(b.vehicleLabel).trim() : null }
          : {}),
        ...(b.driverName !== undefined
          ? { driverName: b.driverName ? String(b.driverName).trim() : null }
          : {}),
        ...(b.driverPhone !== undefined
          ? { driverPhone: b.driverPhone ? String(b.driverPhone).trim() : null }
          : {}),
        ...(b.capacity !== undefined
          ? {
              capacity:
                b.capacity === null || b.capacity === ''
                  ? null
                  : Math.max(0, parseInt(String(b.capacity), 10) || 0) || null,
            }
          : {}),
        ...(b.priceAmount != null ? { priceAmount: Number(b.priceAmount) || 0 } : {}),
        ...(b.isPublished !== undefined ? { isPublished: Boolean(b.isPublished) } : {}),
        ...(b.isActive !== undefined ? { isActive: Boolean(b.isActive) } : {}),
      },
    });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/campus/transport/routes/:id', async (req, res) => {
  try {
    await prisma.transportSubscription.deleteMany({ where: { routeId: req.params.id } });
    await prisma.transportRoute.delete({ where: { id: req.params.id } });
    res.json({ message: 'Ligne supprimée' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/campus/transport/routes/:id/subscriptions', async (req, res) => {
  try {
    const rows = await prisma.transportSubscription.findMany({
      where: { routeId: req.params.id },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { name: true, level: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/campus/transport/subscriptions', async (req, res) => {
  try {
    const studentId = typeof req.body?.studentId === 'string' ? req.body.studentId : '';
    const routeId = typeof req.body?.routeId === 'string' ? req.body.routeId : '';
    const stopLabel = typeof req.body?.stopLabel === 'string' ? req.body.stopLabel : undefined;
    if (!studentId || !routeId) return res.status(400).json({ error: 'studentId et routeId requis' });
    const result = await subscribeStudentToTransport(studentId, routeId, stopLabel);
    res.status(201).json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/campus/transport/subscriptions/:id', async (req, res) => {
  try {
    await prisma.transportSubscription.delete({ where: { id: req.params.id } });
    res.json({ message: 'Inscription transport annulée' });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
