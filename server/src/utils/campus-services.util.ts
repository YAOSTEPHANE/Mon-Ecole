import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { notifyParentsForStudent } from './parent-notify.util';
import {
  billCanteenSubscriptionNow,
  billTransportSubscriptionNow,
} from './campus-billing.util';

export async function subscribeStudentToCanteen(studentId: string, planId: string) {
  const plan = await prisma.canteenMealPlan.findFirst({
    where: { id: planId, isActive: true, isPublished: true },
  });
  if (!plan) throw Object.assign(new Error('Formule cantine introuvable ou non publiée'), { status: 404 });

  const count = await prisma.canteenSubscription.count({
    where: { planId, status: { in: ['ACTIVE', 'WAITLIST'] } },
  });
  const status =
    plan.maxSubscribers != null && count >= plan.maxSubscribers ? 'WAITLIST' : 'ACTIVE';

  const row = await prisma.canteenSubscription.upsert({
    where: { planId_studentId: { planId, studentId } },
    create: { planId, studentId, status },
    update: { status },
    include: { plan: true },
  });

  let billing: 'created' | 'skipped' | null = null;
  if (status === 'ACTIVE') {
    try {
      billing = await billCanteenSubscriptionNow(row.id);
    } catch (e) {
      console.error('bill canteen on subscribe:', e);
    }
  }

  try {
    await notifyParentsForStudent(studentId, {
      type: 'GENERAL',
      title: status === 'WAITLIST' ? 'Cantine — liste d’attente' : 'Inscription cantine confirmée',
      content: `${plan.name} (${plan.academicYear}) — statut : ${status === 'WAITLIST' ? 'liste d’attente' : 'actif'}.`,
      link: '/parent?tab=campus',
    });
  } catch (e) {
    console.error('notify canteen:', e);
  }

  return { subscription: row, status, billing };
}

export async function subscribeStudentToTransport(studentId: string, routeId: string, stopLabel?: string) {
  const route = await prisma.transportRoute.findFirst({
    where: { id: routeId, isActive: true, isPublished: true },
  });
  if (!route) throw Object.assign(new Error('Ligne de transport introuvable ou non publiée'), { status: 404 });

  const count = await prisma.transportSubscription.count({
    where: { routeId, status: { in: ['ACTIVE', 'WAITLIST'] } },
  });
  const status = route.capacity != null && count >= route.capacity ? 'WAITLIST' : 'ACTIVE';

  const row = await prisma.transportSubscription.upsert({
    where: { routeId_studentId: { routeId, studentId } },
    create: {
      routeId,
      studentId,
      status,
      stopLabel: stopLabel?.trim() || null,
    },
    update: {
      status,
      ...(stopLabel !== undefined ? { stopLabel: stopLabel.trim() || null } : {}),
    },
    include: { route: true },
  });

  let billing: 'created' | 'skipped' | null = null;
  if (status === 'ACTIVE') {
    try {
      billing = await billTransportSubscriptionNow(row.id);
    } catch (e) {
      console.error('bill transport on subscribe:', e);
    }
  }

  try {
    await notifyParentsForStudent(studentId, {
      type: 'GENERAL',
      title: status === 'WAITLIST' ? 'Transport — liste d’attente' : 'Inscription transport confirmée',
      content: `${route.name} (${route.academicYear}) — statut : ${status === 'WAITLIST' ? 'liste d’attente' : 'actif'}.`,
      link: '/parent?tab=campus',
    });
  } catch (e) {
    console.error('notify transport:', e);
  }

  return { subscription: row, status, billing };
}

export type CampusPlanWhere = Prisma.CanteenMealPlanWhereInput;
export type CampusRouteWhere = Prisma.TransportRouteWhereInput;
