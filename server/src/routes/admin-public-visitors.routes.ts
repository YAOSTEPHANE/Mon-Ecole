import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import type { SchoolContextRequest } from '../utils/school-context.util';
import { admissionScopeWhere } from '../utils/school-context.util';
import { isObjectId } from '../utils/school-access-guard.util';
import type { AuthRequest } from '../middleware/auth.middleware';
import type { PublicChatThreadStatus } from '@prisma/client';

const router = express.Router();

type ScopedReq = SchoolContextRequest & AuthRequest;

function schoolScope(schoolId: string, isDefaultSchool = false) {
  return admissionScopeWhere(schoolId, isDefaultSchool);
}

router.get('/public-visitors/stats', async (req: ScopedReq, res) => {
  try {
    const schoolId = req.schoolId!;
    const scope = schoolScope(schoolId, req.school?.isDefault);

    const [
      visitorsCount,
      pageViewsCount,
      contactLeadsCount,
      openThreadsCount,
      recommendationsCount,
    ] = await Promise.all([
      prisma.publicVisitor.count({ where: scope }),
      prisma.publicVisitorEvent.count({
        where: { ...scope, eventType: 'PAGE_VIEW' },
      }),
      prisma.publicContactLead.count({ where: scope }),
      prisma.publicChatThread.count({
        where: { ...scope, status: 'OPEN' },
      }),
      prisma.publicRecommendationRequest.count({ where: scope }),
    ]);

    res.json({
      visitorsCount,
      pageViewsCount,
      contactLeadsCount,
      openThreadsCount,
      recommendationsCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public-visitors/stats:', error);
    res.status(500).json({ error: message });
  }
});

router.get('/public-visitors', async (req: ScopedReq, res) => {
  try {
    const schoolId = req.schoolId!;
    const scope = schoolScope(schoolId, req.school?.isDefault);
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const take = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 50;

    const visitors = await prisma.publicVisitor.findMany({
      where: scope,
      orderBy: { lastSeenAt: 'desc' },
      take,
      select: {
        id: true,
        visitorId: true,
        firstSeenAt: true,
        lastSeenAt: true,
        createdAt: true,
        lastIp: true,
        countryCode: true,
        country: true,
        region: true,
        city: true,
        userAgent: true,
        deviceType: true,
        browser: true,
        os: true,
        language: true,
        timezone: true,
        _count: {
          select: {
            events: true,
            contactLeads: true,
            chatThreads: true,
          },
        },
      },
    });

    res.json(visitors);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public-visitors:', error);
    res.status(500).json({ error: message });
  }
});

router.get('/public-visitors/:id', async (req: ScopedReq, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!isObjectId(id)) return res.status(400).json({ error: 'id invalide' });

    const schoolId = req.schoolId!;
    const scope = schoolScope(schoolId, req.school?.isDefault);

    const visitor = await prisma.publicVisitor.findFirst({
      where: { id, ...scope },
      select: {
        id: true,
        visitorId: true,
        firstSeenAt: true,
        lastSeenAt: true,
        createdAt: true,
        lastIp: true,
        countryCode: true,
        country: true,
        region: true,
        city: true,
        userAgent: true,
        deviceType: true,
        browser: true,
        os: true,
        language: true,
        timezone: true,
        contactLeads: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            subject: true,
            createdAt: true,
          },
        },
        chatThreads: {
          orderBy: { updatedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            updatedAt: true,
            _count: { select: { messages: true } },
          },
        },
      },
    });
    if (!visitor) return res.status(404).json({ error: 'Visiteur introuvable' });

    const events = await prisma.publicVisitorEvent.findMany({
      where: { publicVisitorId: visitor.id },
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: {
        id: true,
        eventType: true,
        pageUrl: true,
        referrerUrl: true,
        createdAt: true,
        metadata: true,
      },
    });

    res.json({ visitor, events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public-visitors/:id:', error);
    res.status(500).json({ error: message });
  }
});

router.get('/public-contact-leads', async (req: ScopedReq, res) => {
  try {
    const schoolId = req.schoolId!;
    const scope = schoolScope(schoolId, req.school?.isDefault);
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const take = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 50;

    const leads = await prisma.publicContactLead.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        createdAt: true,
        publicVisitor: {
          select: { id: true, visitorId: true },
        },
      },
    });

    res.json(leads);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public-contact-leads:', error);
    res.status(500).json({ error: message });
  }
});

router.get('/public-recommendations', async (req: ScopedReq, res) => {
  try {
    const schoolId = req.schoolId!;
    const scope = schoolScope(schoolId, req.school?.isDefault);
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const take = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 50;

    const rows = await prisma.publicRecommendationRequest.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        criteria: true,
        result: true,
        createdAt: true,
        publicVisitorId: true,
      },
    });

    res.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public-recommendations:', error);
    res.status(500).json({ error: message });
  }
});

router.get('/public-chat/threads', async (req: ScopedReq, res) => {
  try {
    const schoolId = req.schoolId!;
    const scope = schoolScope(schoolId, req.school?.isDefault);
    const status =
      typeof req.query.status === 'string' &&
      (req.query.status === 'OPEN' || req.query.status === 'CLOSED')
        ? (req.query.status as PublicChatThreadStatus)
        : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const take = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 50;

    const threads = await prisma.publicChatThread.findMany({
      where: {
        ...scope,
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        publicVisitor: {
          select: { id: true, visitorId: true, lastSeenAt: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            senderType: true,
            createdAt: true,
          },
        },
        _count: { select: { messages: true } },
      },
    });

    res.json(threads);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public-chat/threads:', error);
    res.status(500).json({ error: message });
  }
});

router.get('/public-chat/threads/:threadId/messages', async (req: ScopedReq, res) => {
  try {
    const threadId = String(req.params.threadId || '').trim();
    if (!isObjectId(threadId)) return res.status(400).json({ error: 'threadId invalide' });

    const schoolId = req.schoolId!;
    const scope = schoolScope(schoolId, req.school?.isDefault);

    const thread = await prisma.publicChatThread.findFirst({
      where: { id: threadId, ...scope },
      select: {
        id: true,
        status: true,
        createdAt: true,
        publicVisitor: { select: { id: true, visitorId: true } },
      },
    });
    if (!thread) return res.status(404).json({ error: 'Fil introuvable' });

    const messages = await prisma.publicChatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderType: true,
        content: true,
        createdAt: true,
      },
    });

    res.json({ thread, messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public-chat/threads/:threadId/messages:', error);
    res.status(500).json({ error: message });
  }
});

router.post(
  '/public-chat/threads/:threadId/messages',
  body('content').isString().trim().notEmpty().isLength({ max: 2000 }).withMessage('Message invalide'),
  async (req: ScopedReq, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const threadId = String(req.params.threadId || '').trim();
      if (!isObjectId(threadId)) return res.status(400).json({ error: 'threadId invalide' });

      const schoolId = req.schoolId!;
      const scope = schoolScope(schoolId, req.school?.isDefault);

      const thread = await prisma.publicChatThread.findFirst({
        where: { id: threadId, ...scope },
        select: { id: true, status: true, publicVisitorId: true },
      });
      if (!thread) return res.status(404).json({ error: 'Fil introuvable' });
      if (thread.status === 'CLOSED') {
        return res.status(400).json({ error: 'Ce fil est fermé' });
      }

      const content = String(req.body.content).trim().slice(0, 2000);

      const message = await prisma.publicChatMessage.create({
        data: {
          threadId: thread.id,
          senderType: 'STAFF',
          content,
        },
        select: { id: true, senderType: true, content: true, createdAt: true },
      });

      await prisma.publicChatThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
      });

      res.status(201).json({ message });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      console.error('POST /public-chat/threads/:threadId/messages:', error);
      res.status(500).json({ error: message });
    }
  }
);

router.patch(
  '/public-chat/threads/:threadId',
  body('status')
    .optional()
    .isIn(['OPEN', 'CLOSED'])
    .withMessage('status doit être OPEN ou CLOSED'),
  async (req: ScopedReq, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const threadId = String(req.params.threadId || '').trim();
      if (!isObjectId(threadId)) return res.status(400).json({ error: 'threadId invalide' });

      const schoolId = req.schoolId!;
      const scope = schoolScope(schoolId, req.school?.isDefault);

      const existing = await prisma.publicChatThread.findFirst({
        where: { id: threadId, ...scope },
        select: { id: true },
      });
      if (!existing) return res.status(404).json({ error: 'Fil introuvable' });

      const status = req.body.status as PublicChatThreadStatus | undefined;
      if (!status) return res.status(400).json({ error: 'status requis' });

      const thread = await prisma.publicChatThread.update({
        where: { id: existing.id },
        data: { status },
        select: { id: true, status: true, updatedAt: true },
      });

      res.json(thread);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      console.error('PATCH /public-chat/threads/:threadId:', error);
      res.status(500).json({ error: message });
    }
  }
);

export default router;
