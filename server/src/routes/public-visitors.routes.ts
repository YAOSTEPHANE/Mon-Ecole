import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { apiGlobalLimiter } from '../middleware/rate-limit.middleware';
import { readPublicVisitorIdFromRequest } from '../utils/public-visitor-cookie.util';
import { ensureDefaultSchool } from '../utils/ensure-default-school.util';
import { readSchoolIdFromRequest } from '../utils/school-context.util';
import type { Request, Response } from 'express';
import { publicServerErrorMessage } from '../utils/http-error.util';
import { PUBLIC_VISITOR_COOKIE_NAME } from '../utils/public-visitor-cookie.util';
import { isObjectId } from '../utils/school-access-guard.util';
import { parseUserAgent } from '../utils/public-visitor-device.util';
import { readClientIp, resolveVisitorGeo } from '../utils/public-visitor-geo.util';

const router = express.Router();

function getVisitorOr400(req: Request, res: Response) {
  const visitorId = readPublicVisitorIdFromRequest(req);
  if (!visitorId) {
    res.status(400).json({ error: `Cookie ${PUBLIC_VISITOR_COOKIE_NAME} manquant` });
    return null;
  }
  return visitorId;
}

async function resolveSchoolId(req: Request): Promise<string> {
  const fromHeader = readSchoolIdFromRequest(req);
  if (fromHeader) return fromHeader;
  return ensureDefaultSchool();
}

type VisitorContextPatch = {
  lastIp?: string | null;
  countryCode?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  language?: string | null;
  timezone?: string | null;
};

async function upsertVisitor(visitorId: string, schoolId: string, ctx?: VisitorContextPatch) {
  const patch = {
    ...(ctx?.lastIp != null ? { lastIp: ctx.lastIp } : {}),
    ...(ctx?.countryCode != null ? { countryCode: ctx.countryCode } : {}),
    ...(ctx?.country != null ? { country: ctx.country } : {}),
    ...(ctx?.region != null ? { region: ctx.region } : {}),
    ...(ctx?.city != null ? { city: ctx.city } : {}),
    ...(ctx?.userAgent != null ? { userAgent: ctx.userAgent } : {}),
    ...(ctx?.deviceType != null ? { deviceType: ctx.deviceType } : {}),
    ...(ctx?.browser != null ? { browser: ctx.browser } : {}),
    ...(ctx?.os != null ? { os: ctx.os } : {}),
    ...(ctx?.language != null ? { language: ctx.language } : {}),
    ...(ctx?.timezone != null ? { timezone: ctx.timezone } : {}),
  };

  return prisma.publicVisitor.upsert({
    where: { visitorId },
    create: { visitorId, schoolId, ...patch },
    update: { schoolId, ...patch },
  });
}

async function buildVisitorContext(
  req: Request,
  body: Record<string, unknown>,
): Promise<VisitorContextPatch> {
  const userAgent =
    typeof body.userAgent === 'string' && body.userAgent.trim()
      ? body.userAgent.trim().slice(0, 512)
      : req.get('user-agent') || null;
  const device = parseUserAgent(userAgent);
  const ip = readClientIp(req);
  const geo = await resolveVisitorGeo(req, ip);
  const language =
    typeof body.language === 'string' && body.language.trim()
      ? body.language.trim().slice(0, 32)
      : req.get('accept-language')?.split(',')[0]?.trim().slice(0, 32) || null;
  const timezone =
    typeof body.timezone === 'string' && body.timezone.trim()
      ? body.timezone.trim().slice(0, 64)
      : null;

  return {
    lastIp: ip,
    countryCode: geo.countryCode,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    userAgent,
    deviceType: device.deviceType,
    browser: device.browser,
    os: device.os,
    language,
    timezone,
  };
}

router.post(
  '/visitors/page-view',
  apiGlobalLimiter,
  body('pageUrl').isString().trim().notEmpty().withMessage('pageUrl requise'),
  body('language').optional().isString().trim().isLength({ max: 32 }),
  body('timezone').optional().isString().trim().isLength({ max: 64 }),
  body('screen').optional().isString().trim().isLength({ max: 32 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const visitorId = getVisitorOr400(req, res);
      if (!visitorId) return;

      const schoolId = await resolveSchoolId(req);
      const pageUrl = String(req.body.pageUrl).slice(0, 2048);
      const referrerUrl =
        typeof req.body.referrerUrl === 'string' ? req.body.referrerUrl.slice(0, 2048) : null;
      const screen =
        typeof req.body.screen === 'string' && req.body.screen.trim()
          ? req.body.screen.trim().slice(0, 32)
          : null;

      const ctx = await buildVisitorContext(req, req.body as Record<string, unknown>);
      const visitor = await upsertVisitor(visitorId, schoolId, ctx);

      await prisma.publicVisitorEvent.create({
        data: {
          publicVisitorId: visitor.id,
          eventType: 'PAGE_VIEW',
          schoolId,
          pageUrl,
          referrerUrl,
          metadata: {
            userAgent: ctx.userAgent,
            deviceType: ctx.deviceType,
            browser: ctx.browser,
            os: ctx.os,
            language: ctx.language,
            timezone: ctx.timezone,
            screen,
            city: ctx.city,
            country: ctx.country,
            countryCode: ctx.countryCode,
          },
        },
      });

      res.status(201).json({ message: 'ok' });
    } catch (error: unknown) {
      res.status(500).json({ error: publicServerErrorMessage(error) });
    }
  }
);

router.post(
  '/leads/contact',
  apiGlobalLimiter,
  body('name').isString().trim().notEmpty().withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('message').isString().trim().notEmpty().withMessage('Message requis'),
  body('subject').optional().isString().trim().isLength({ max: 200 }).withMessage('Sujet trop long'),
  body('phone').optional().isString().trim().isLength({ max: 40 }).withMessage('Téléphone trop long'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const visitorId = getVisitorOr400(req, res);
      if (!visitorId) return;

      const schoolId = await resolveSchoolId(req);
      const visitor = await upsertVisitor(visitorId, schoolId);

      const name = String(req.body.name).trim().slice(0, 120);
      const email = String(req.body.email).trim().toLowerCase();
      const phone = typeof req.body.phone === 'string' && req.body.phone.trim() ? req.body.phone.trim().slice(0, 40) : null;
      const subject = typeof req.body.subject === 'string' && req.body.subject.trim() ? req.body.subject.trim().slice(0, 200) : null;
      const message = String(req.body.message).trim().slice(0, 10_000);

      await prisma.publicContactLead.create({
        data: {
          publicVisitorId: visitor.id,
          schoolId,
          name,
          email,
          phone,
          subject,
          message,
        },
      });

      // On journalise aussi un event global (utile pour la même logique que admissions)
      await prisma.publicVisitorEvent.create({
        data: {
          publicVisitorId: visitor.id,
          eventType: 'CONTACT_LEAD_SUBMIT',
          schoolId,
          metadata: { leadKind: 'contact' },
        },
      });

      res.status(201).json({ message: 'Message enregistré' });
    } catch (error: unknown) {
      res.status(500).json({ error: publicServerErrorMessage(error) });
    }
  }
);

router.post(
  '/chat/threads',
  apiGlobalLimiter,
  async (req, res) => {
    try {
      const visitorId = getVisitorOr400(req, res);
      if (!visitorId) return;
      const schoolId = await resolveSchoolId(req);
      const visitor = await upsertVisitor(visitorId, schoolId);

      const thread = await prisma.publicChatThread.create({
        data: {
          publicVisitorId: visitor.id,
          schoolId,
          status: 'OPEN',
        },
        select: { id: true },
      });

      await prisma.publicVisitorEvent.create({
        data: {
          publicVisitorId: visitor.id,
          eventType: 'CHAT_THREAD_CREATE',
          schoolId,
          chatThreadId: thread.id,
        },
      });

      res.status(201).json({ threadId: thread.id });
    } catch (error: unknown) {
      res.status(500).json({ error: publicServerErrorMessage(error) });
    }
  }
);

router.get(
  '/chat/threads/:threadId/messages',
  apiGlobalLimiter,
  async (req, res) => {
    try {
      const visitorId = getVisitorOr400(req, res);
      if (!visitorId) return;

      const threadId = String(req.params.threadId || '').trim();
      if (!isObjectId(threadId)) return res.status(400).json({ error: 'threadId invalide' });

      const schoolId = await resolveSchoolId(req);
      const visitor = await upsertVisitor(visitorId, schoolId);

      const thread = await prisma.publicChatThread.findUnique({
        where: { id: threadId },
        select: { id: true, publicVisitorId: true, schoolId: true },
      });
      if (!thread) return res.status(404).json({ error: 'Fil introuvable' });

      if (thread.publicVisitorId && thread.publicVisitorId !== visitor.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
      const take = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 50)) : 50;

      const messages = await prisma.publicChatMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: 'asc' },
        take,
        select: { id: true, senderType: true, senderVisitorId: true, content: true, createdAt: true },
      });

      res.json({ messages });
    } catch (error: unknown) {
      res.status(500).json({ error: publicServerErrorMessage(error) });
    }
  }
);

router.post(
  '/chat/threads/:threadId/messages',
  apiGlobalLimiter,
  body('content').isString().trim().notEmpty().isLength({ max: 2000 }).withMessage('Message invalide'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const visitorId = getVisitorOr400(req, res);
      if (!visitorId) return;

      const threadId = String(req.params.threadId || '').trim();
      if (!isObjectId(threadId)) return res.status(400).json({ error: 'threadId invalide' });

      const schoolId = await resolveSchoolId(req);
      const visitor = await upsertVisitor(visitorId, schoolId);

      const thread = await prisma.publicChatThread.findUnique({
        where: { id: threadId },
        select: { id: true, publicVisitorId: true },
      });
      if (!thread) return res.status(404).json({ error: 'Fil introuvable' });

      if (thread.publicVisitorId && thread.publicVisitorId !== visitor.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      const content = String(req.body.content).trim().slice(0, 2000);

      const message = await prisma.publicChatMessage.create({
        data: {
          threadId: thread.id,
          senderType: 'VISITOR',
          senderVisitorId: visitor.id,
          content,
        },
        select: { id: true, content: true, createdAt: true, senderType: true },
      });

      await prisma.publicVisitorEvent.create({
        data: {
          publicVisitorId: visitor.id,
          eventType: 'CHAT_MESSAGE_SUBMIT',
          schoolId,
          chatThreadId: thread.id,
          metadata: { contentLen: content.length },
        },
      });

      res.status(201).json({ message });
    } catch (error: unknown) {
      res.status(500).json({ error: publicServerErrorMessage(error) });
    }
  }
);

router.post(
  '/recommendations/requests',
  apiGlobalLimiter,
  body('criteria').isObject().withMessage('criteria doit être un objet'),
  body('result').optional().isObject().withMessage('result doit être un objet'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const visitorId = getVisitorOr400(req, res);
      if (!visitorId) return;
      const schoolId = await resolveSchoolId(req);
      const visitor = await upsertVisitor(visitorId, schoolId);

      const criteria = req.body.criteria as Record<string, unknown>;
      const result = typeof req.body.result === 'object' && req.body.result ? (req.body.result as Record<string, unknown>) : null;

      const record = await prisma.publicRecommendationRequest.create({
        data: {
          publicVisitorId: visitor.id,
          schoolId,
          criteria: criteria as unknown as object,
          result: result as unknown as object | null,
        },
        select: { id: true },
      });

      await prisma.publicVisitorEvent.create({
        data: {
          publicVisitorId: visitor.id,
          eventType: 'RECOMMENDATION_REQUEST',
          schoolId,
          metadata: { criteriaKeys: Object.keys(criteria) },
        },
      });

      res.status(201).json({ requestId: record.id });
    } catch (error: unknown) {
      res.status(500).json({ error: publicServerErrorMessage(error) });
    }
  }
);

export default router;

