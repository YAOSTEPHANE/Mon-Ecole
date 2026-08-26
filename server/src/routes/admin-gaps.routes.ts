/**
 * Routes pour les écarts SI scolaire : alumni CRM, parapheur, achats,
 * marketing, LTI/SCORM, patrimoine, leaderboard gamification.
 */
import express from 'express';
import prisma from '../utils/prisma';
import type { SchoolContextRequest } from '../utils/school-context.util';
import { notifyParentWhatsApp } from '../utils/whatsapp.util';
import { sendSMS, formatPhoneNumber, isValidPhoneNumber } from '../utils/sms.util';

const router = express.Router();

function schoolWhere(req: SchoolContextRequest): { schoolId?: string | null } {
  if (!req.schoolId) return {};
  return { schoolId: req.schoolId };
}

function errorMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Erreur serveur';
}

// ---------- Alumni CRM ----------
router.get('/alumni/profiles', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.alumniProfile.findMany({
      where: schoolWhere(req),
      orderBy: [{ graduationYear: 'desc' }, { lastName: 'asc' }],
      take: 500,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/alumni/profiles', async (req: SchoolContextRequest, res) => {
  try {
    const b = req.body ?? {};
    const firstName = String(b.firstName ?? '').trim();
    const lastName = String(b.lastName ?? '').trim();
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Prénom et nom requis' });
    }
    const row = await prisma.alumniProfile.create({
      data: {
        schoolId: req.schoolId ?? null,
        studentId: typeof b.studentId === 'string' ? b.studentId : null,
        firstName,
        lastName,
        email: typeof b.email === 'string' ? b.email.trim() || null : null,
        phone: typeof b.phone === 'string' ? b.phone.trim() || null : null,
        graduationYear: b.graduationYear != null ? Number(b.graduationYear) : null,
        currentJob: typeof b.currentJob === 'string' ? b.currentJob.trim() || null : null,
        company: typeof b.company === 'string' ? b.company.trim() || null : null,
        linkedInUrl: typeof b.linkedInUrl === 'string' ? b.linkedInUrl.trim() || null : null,
        notes: typeof b.notes === 'string' ? b.notes.trim() || null : null,
        newsletterOptIn: b.newsletterOptIn !== false,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/alumni/profiles/sync-graduated', async (req: SchoolContextRequest, res) => {
  try {
    const graduated = await prisma.student.findMany({
      where: {
        enrollmentStatus: 'GRADUATED',
        ...(req.schoolId
          ? { OR: [{ schoolId: req.schoolId }, { schoolId: null }] }
          : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      take: 2000,
    });
    let created = 0;
    for (const s of graduated) {
      const existing = await prisma.alumniProfile.findFirst({
        where: { studentId: s.id },
      });
      if (existing) continue;
      await prisma.alumniProfile.create({
        data: {
          schoolId: s.schoolId ?? req.schoolId ?? null,
          studentId: s.id,
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          email: s.user.email || null,
          phone: s.user.phone || null,
          graduationYear: new Date().getFullYear(),
        },
      });
      created += 1;
    }
    res.json({ created, scanned: graduated.length });
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.put('/alumni/profiles/:id', async (req, res) => {
  try {
    const b = req.body ?? {};
    const data: Record<string, unknown> = {};
    for (const k of [
      'firstName',
      'lastName',
      'email',
      'phone',
      'currentJob',
      'company',
      'linkedInUrl',
      'notes',
    ] as const) {
      if (typeof b[k] === 'string') data[k] = b[k].trim() || null;
    }
    if (b.graduationYear !== undefined) data.graduationYear = Number(b.graduationYear) || null;
    if (b.newsletterOptIn !== undefined) data.newsletterOptIn = Boolean(b.newsletterOptIn);
    const row = await prisma.alumniProfile.update({ where: { id: req.params.id }, data });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.get('/alumni/events', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.alumniEvent.findMany({
      where: schoolWhere(req),
      include: { _count: { select: { registrations: true } } },
      orderBy: { eventDate: 'desc' },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/alumni/events', async (req: SchoolContextRequest, res) => {
  try {
    const b = req.body ?? {};
    const title = String(b.title ?? '').trim();
    if (!title || !b.eventDate) {
      return res.status(400).json({ error: 'title et eventDate requis' });
    }
    const row = await prisma.alumniEvent.create({
      data: {
        schoolId: req.schoolId ?? null,
        title,
        description: typeof b.description === 'string' ? b.description : null,
        eventDate: new Date(b.eventDate),
        location: typeof b.location === 'string' ? b.location : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/alumni/events/:id/register', async (req, res) => {
  try {
    const alumniProfileId = String(req.body?.alumniProfileId ?? '');
    if (!alumniProfileId) return res.status(400).json({ error: 'alumniProfileId requis' });
    const row = await prisma.alumniEventRegistration.create({
      data: { eventId: req.params.id, alumniProfileId },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.get('/alumni/donations', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.alumniDonation.findMany({
      where: schoolWhere(req),
      include: { profile: true },
      orderBy: { donatedAt: 'desc' },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/alumni/donations', async (req: SchoolContextRequest, res) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    const row = await prisma.alumniDonation.create({
      data: {
        schoolId: req.schoolId ?? null,
        alumniProfileId: typeof req.body?.alumniProfileId === 'string' ? req.body.alumniProfileId : null,
        amount,
        currency: typeof req.body?.currency === 'string' ? req.body.currency : 'XOF',
        donatedAt: req.body?.donatedAt ? new Date(req.body.donatedAt) : new Date(),
        note: typeof req.body?.note === 'string' ? req.body.note : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

// ---------- Parapheur / e-signature ----------
router.get('/esignature/requests', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.signatureRequest.findMany({
      where: schoolWhere(req),
      include: { actions: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/esignature/requests', async (req: SchoolContextRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Titre requis' });
    const row = await prisma.signatureRequest.create({
      data: {
        schoolId: req.schoolId ?? null,
        title,
        documentType: req.body?.documentType || 'OTHER',
        status: 'PENDING',
        targetUserId: typeof req.body?.targetUserId === 'string' ? req.body.targetUserId : null,
        studentId: typeof req.body?.studentId === 'string' ? req.body.studentId : null,
        fileUrl: typeof req.body?.fileUrl === 'string' ? req.body.fileUrl : null,
        createdById: userId,
        expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null,
        actions: req.body?.targetUserId
          ? {
              create: {
                signerUserId: String(req.body.targetUserId),
                signerRole: typeof req.body?.signerRole === 'string' ? req.body.signerRole : null,
                status: 'PENDING',
              },
            }
          : undefined,
      },
      include: { actions: true },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/esignature/requests/:id/sign', async (req: SchoolContextRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const signatureData = String(req.body?.signatureData ?? '').trim();
    if (!signatureData) return res.status(400).json({ error: 'signatureData requis' });
    const request = await prisma.signatureRequest.findUnique({
      where: { id: req.params.id },
      include: { actions: true },
    });
    if (!request) return res.status(404).json({ error: 'Demande introuvable' });
    const action =
      request.actions.find((a) => a.signerUserId === userId && a.status === 'PENDING') ||
      request.actions[0];
    if (action) {
      await prisma.signatureAction.update({
        where: { id: action.id },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          signatureData,
          ip: req.ip || null,
          signerUserId: userId,
        },
      });
    } else {
      await prisma.signatureAction.create({
        data: {
          requestId: request.id,
          signerUserId: userId,
          status: 'SIGNED',
          signedAt: new Date(),
          signatureData,
          ip: req.ip || null,
        },
      });
    }
    const updated = await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: 'SIGNED' },
      include: { actions: true },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

// ---------- Achats / marchés ----------
router.get('/procurement/requests', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.procurementRequest.findMany({
      where: schoolWhere(req),
      include: { bids: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/procurement/requests', async (req: SchoolContextRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const title = String(req.body?.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Titre requis' });
    const row = await prisma.procurementRequest.create({
      data: {
        schoolId: req.schoolId ?? null,
        title,
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        category: typeof req.body?.category === 'string' ? req.body.category : null,
        estimatedAmount:
          req.body?.estimatedAmount != null ? Number(req.body.estimatedAmount) : null,
        status: 'DRAFT',
        requestedById: userId,
        supplierId: typeof req.body?.supplierId === 'string' ? req.body.supplierId : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.patch('/procurement/requests/:id/status', async (req: SchoolContextRequest, res) => {
  try {
    const status = String(req.body?.status ?? '');
    const allowed = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED', 'CANCELLED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    const data: Record<string, unknown> = { status };
    if (status === 'APPROVED' && req.user?.id) data.approvedById = req.user.id;
    const row = await prisma.procurementRequest.update({
      where: { id: req.params.id },
      data,
      include: { bids: true },
    });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/procurement/requests/:id/bids', async (req, res) => {
  try {
    const vendorName = String(req.body?.vendorName ?? '').trim();
    const amount = Number(req.body?.amount);
    if (!vendorName || !Number.isFinite(amount)) {
      return res.status(400).json({ error: 'vendorName et amount requis' });
    }
    const row = await prisma.procurementBid.create({
      data: {
        requestId: req.params.id,
        vendorName,
        amount,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/procurement/requests/:id/select-bid', async (req, res) => {
  try {
    const bidId = String(req.body?.bidId ?? '');
    if (!bidId) return res.status(400).json({ error: 'bidId requis' });
    await prisma.procurementBid.updateMany({
      where: { requestId: req.params.id },
      data: { selected: false },
    });
    await prisma.procurementBid.update({ where: { id: bidId }, data: { selected: true } });
    const row = await prisma.procurementRequest.update({
      where: { id: req.params.id },
      data: { status: 'ORDERED' },
      include: { bids: true },
    });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

// ---------- Marketing CRM ----------
router.patch('/marketing/leads/:id', async (req, res) => {
  try {
    const b = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof b.status === 'string') data.status = b.status;
    if (typeof b.source === 'string') data.source = b.source;
    if (typeof b.assignedToId === 'string') data.assignedToId = b.assignedToId;
    if (Array.isArray(b.tags)) data.tags = b.tags.map(String);
    if (b.markContacted) data.lastContactedAt = new Date();
    const row = await prisma.publicContactLead.update({ where: { id: req.params.id }, data });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.get('/marketing/campaigns', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.marketingCampaign.findMany({
      where: schoolWhere(req),
      include: { _count: { select: { recipients: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/marketing/campaigns', async (req: SchoolContextRequest, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const messageBody = String(req.body?.messageBody ?? '').trim();
    if (!name || !messageBody) {
      return res.status(400).json({ error: 'name et messageBody requis' });
    }
    const row = await prisma.marketingCampaign.create({
      data: {
        schoolId: req.schoolId ?? null,
        name,
        channel: req.body?.channel || 'EMAIL',
        status: 'DRAFT',
        messageBody,
        audienceFilter: req.body?.audienceFilter ?? undefined,
        scheduledAt: req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/marketing/campaigns/:id/send', async (req: SchoolContextRequest, res) => {
  try {
    const campaign = await prisma.marketingCampaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) return res.status(404).json({ error: 'Campagne introuvable' });
    const leads = await prisma.publicContactLead.findMany({
      where: {
        ...(req.schoolId ? { schoolId: req.schoolId } : {}),
        status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] },
      },
      take: 200,
    });
    let sent = 0;
    let failed = 0;
    for (const lead of leads) {
      let ok = false;
      try {
        if (
          (campaign.channel === 'SMS' || campaign.channel === 'MIXED') &&
          lead.phone &&
          isValidPhoneNumber(lead.phone)
        ) {
          await sendSMS(formatPhoneNumber(lead.phone), campaign.messageBody.slice(0, 300));
          ok = true;
        }
        if (
          (campaign.channel === 'WHATSAPP' || campaign.channel === 'MIXED') &&
          lead.phone
        ) {
          await notifyParentWhatsApp(lead.phone, campaign.name, campaign.messageBody);
          ok = true;
        }
        if (campaign.channel === 'EMAIL') ok = true; // e-mail via notify ultérieur
        await prisma.campaignRecipient.create({
          data: {
            campaignId: campaign.id,
            leadId: lead.id,
            status: ok ? 'SENT' : 'FAILED',
            sentAt: ok ? new Date() : null,
          },
        });
        if (ok) {
          sent += 1;
          await prisma.publicContactLead.update({
            where: { id: lead.id },
            data: { lastContactedAt: new Date(), status: 'CONTACTED' },
          });
        } else failed += 1;
      } catch {
        failed += 1;
      }
    }
    const updated = await prisma.marketingCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        stats: { sent, failed, audience: leads.length },
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

// ---------- Patrimoine ----------
router.get('/estate/buildings', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.estateBuilding.findMany({
      where: schoolWhere(req),
      include: { assets: true },
      orderBy: { name: 'asc' },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/estate/buildings', async (req: SchoolContextRequest, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const row = await prisma.estateBuilding.create({
      data: {
        schoolId: req.schoolId ?? null,
        name,
        code: typeof req.body?.code === 'string' ? req.body.code : null,
        address: typeof req.body?.address === 'string' ? req.body.address : null,
        floors: req.body?.floors != null ? Number(req.body.floors) : null,
        yearBuilt: req.body?.yearBuilt != null ? Number(req.body.yearBuilt) : null,
        areaSqm: req.body?.areaSqm != null ? Number(req.body.areaSqm) : null,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/estate/assets', async (req: SchoolContextRequest, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const row = await prisma.estateAsset.create({
      data: {
        schoolId: req.schoolId ?? null,
        buildingId: typeof req.body?.buildingId === 'string' ? req.body.buildingId : null,
        name,
        category: req.body?.category || 'OTHER',
        value: req.body?.value != null ? Number(req.body.value) : null,
        acquisitionDate: req.body?.acquisitionDate ? new Date(req.body.acquisitionDate) : null,
        notes: typeof req.body?.notes === 'string' ? req.body.notes : null,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

// ---------- Gamification leaderboard ----------
router.get('/gamification/leaderboard', async (req: SchoolContextRequest, res) => {
  try {
    const events = await prisma.studentGamificationEvent.groupBy({
      by: ['studentId'],
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 50,
    });
    const ids = events.map((e) => e.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    res.json(
      events.map((e, i) => ({
        rank: i + 1,
        studentId: e.studentId,
        points: e._sum.points ?? 0,
        student: byId.get(e.studentId) ?? null,
      })),
    );
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

// ---------- LTI / SCORM ----------
router.get('/lti/config', async (req: SchoolContextRequest, res) => {
  try {
    const row = await prisma.ltiPlatformConfig.findFirst({
      where: req.schoolId ? { schoolId: req.schoolId } : {},
      orderBy: { updatedAt: 'desc' },
    });
    const issuer = row?.issuer || process.env.LTI_ISSUER?.trim() || 'https://ecole.example.org';
    res.json({
      status: row?.enabled ? 'ready' : 'configured',
      enabled: row?.enabled ?? false,
      issuer,
      clientId: row?.clientId || process.env.LTI_CLIENT_ID || null,
      deploymentId: row?.deploymentId ?? null,
      keysetUrl: row?.keysetUrl || `${issuer}/lti/jwks`,
      redirectUris: row?.redirectUris ?? [],
      authLoginUrl: `${issuer}/lti/login`,
      authTokenUrl: `${issuer}/lti/token`,
      jwksUrl: row?.keysetUrl || `${issuer}/lti/jwks`,
    });
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.put('/lti/config', async (req: SchoolContextRequest, res) => {
  try {
    const issuer = String(req.body?.issuer ?? '').trim();
    const clientId = String(req.body?.clientId ?? '').trim();
    if (!issuer || !clientId) {
      return res.status(400).json({ error: 'issuer et clientId requis' });
    }
    const existing = await prisma.ltiPlatformConfig.findFirst({
      where: req.schoolId ? { schoolId: req.schoolId } : {},
    });
    const data = {
      schoolId: req.schoolId ?? null,
      enabled: Boolean(req.body?.enabled),
      issuer,
      clientId,
      deploymentId: typeof req.body?.deploymentId === 'string' ? req.body.deploymentId : null,
      keysetUrl: typeof req.body?.keysetUrl === 'string' ? req.body.keysetUrl : null,
      redirectUris: Array.isArray(req.body?.redirectUris)
        ? req.body.redirectUris.map(String)
        : [],
    };
    const row = existing
      ? await prisma.ltiPlatformConfig.update({ where: { id: existing.id }, data })
      : await prisma.ltiPlatformConfig.create({ data });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.get('/scorm/packages', async (req: SchoolContextRequest, res) => {
  try {
    const rows = await prisma.scormPackage.findMany({
      where: schoolWhere(req),
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.post('/scorm/packages', async (req: SchoolContextRequest, res) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    const entryUrl = String(req.body?.entryUrl ?? '').trim();
    if (!title || !entryUrl) {
      return res.status(400).json({ error: 'title et entryUrl requis' });
    }
    const row = await prisma.scormPackage.create({
      data: {
        schoolId: req.schoolId ?? null,
        title,
        version: typeof req.body?.version === 'string' ? req.body.version : '1.2',
        entryUrl,
        active: req.body?.active !== false,
      },
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

/** Lecteur SCORM 1.2 minimal (API LMS* en localStorage + iframe). */
router.get('/scorm/packages/:id/player', async (req: SchoolContextRequest, res) => {
  try {
    const row = await prisma.scormPackage.findFirst({
      where: { id: req.params.id, ...(req.schoolId ? { schoolId: req.schoolId } : {}) },
    });
    if (!row || !row.active) return res.status(404).send('Package SCORM introuvable');
    const entry = String(row.entryUrl).replace(/"/g, '&quot;');
    const title = String(row.title).replace(/</g, '&lt;');
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>${title}</title>
<style>html,body{margin:0;height:100%;font-family:system-ui,sans-serif}iframe{border:0;width:100%;height:calc(100% - 40px)}.bar{padding:8px 12px;background:#1c1917;color:#fff;font-size:14px}</style>
</head><body>
<div class="bar">SCORM — ${title}</div>
<iframe id="sco" src="${entry}" title="Contenu SCORM"></iframe>
<script>
(function(){
  var store = {};
  var key = 'scorm:' + ${JSON.stringify(row.id)};
  try { store = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch(e) { store = {}; }
  function save(){ try { localStorage.setItem(key, JSON.stringify(store)); } catch(e) {} }
  var api = {
    LMSInitialize: function(){ return 'true'; },
    LMSFinish: function(){ save(); return 'true'; },
    LMSGetValue: function(n){ return store[n] != null ? String(store[n]) : ''; },
    LMSSetValue: function(n,v){ store[n]=v; save(); return 'true'; },
    LMSCommit: function(){ save(); return 'true'; },
    LMSGetLastError: function(){ return '0'; },
    LMSGetErrorString: function(){ return 'No error'; },
    LMSGetDiagnostic: function(){ return ''; }
  };
  window.API = api;
  window.API_1484_11 = {
    Initialize: api.LMSInitialize, Terminate: api.LMSFinish,
    GetValue: api.LMSGetValue, SetValue: api.LMSSetValue, Commit: api.LMSCommit,
    GetLastError: api.LMSGetLastError, GetErrorString: api.LMSGetErrorString, GetDiagnostic: api.LMSGetDiagnostic
  };
})();
</script></body></html>`;
    res.type('html').send(html);
  } catch (e) {
    res.status(500).send(errorMsg(e));
  }
});

router.post('/lti/launch', async (req: SchoolContextRequest, res) => {
  try {
    const claims = req.body?.claims ?? req.body ?? {};
    const iss = typeof claims.iss === 'string' ? claims.iss : typeof req.body?.iss === 'string' ? req.body.iss : '';
    const clientId =
      typeof claims.aud === 'string'
        ? claims.aud
        : Array.isArray(claims.aud)
          ? String(claims.aud[0] ?? '')
          : typeof req.body?.clientId === 'string'
            ? req.body.clientId
            : '';
    const cfg = await prisma.ltiPlatformConfig.findFirst({
      where: req.schoolId ? { schoolId: req.schoolId } : {},
      orderBy: { updatedAt: 'desc' },
    });
    if (cfg?.enabled) {
      if (iss && cfg.issuer && iss !== cfg.issuer) {
        return res.status(401).json({ error: 'Issuer LTI non reconnu' });
      }
      if (clientId && cfg.clientId && clientId !== cfg.clientId) {
        return res.status(401).json({ error: 'client_id LTI non reconnu' });
      }
    }
    const targetLinkUri =
      typeof claims.target_link_uri === 'string'
        ? claims.target_link_uri
        : typeof req.body?.targetLinkUri === 'string'
          ? req.body.targetLinkUri
          : null;
    const row = await prisma.ltiLaunch.create({
      data: {
        schoolId: req.schoolId ?? null,
        userId: req.user?.id ?? null,
        resourceLinkId:
          typeof claims.resource_link_id === 'string'
            ? claims.resource_link_id
            : typeof req.body?.resourceLinkId === 'string'
              ? req.body.resourceLinkId
              : null,
        targetLinkUri,
        rawClaims: claims,
      },
    });
    res.status(201).json({
      ok: true,
      launch: row,
      redirectUrl: targetLinkUri || null,
    });
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.get('/integrations/pix', async (_req, res) => {
  const launchUrl = process.env.PIX_LAUNCH_URL?.trim() || null;
  res.json({ enabled: Boolean(launchUrl), launchUrl });
});

router.get('/integrations/visio', async (_req, res) => {
  res.json({
    jitsiBase: process.env.JITSI_BASE_URL?.trim() || 'https://meet.jit.si',
    bbbBase: process.env.BBB_BASE_URL?.trim() || null,
  });
});

router.get('/sso/config', async (req: SchoolContextRequest, res) => {
  try {
    const row = await prisma.schoolSsoConfig.findFirst({
      where: req.schoolId ? { schoolId: req.schoolId } : {},
      orderBy: { updatedAt: 'desc' },
    });
    if (!row) {
      return res.json({ enabled: false, status: 'not_configured', provider: null });
    }
    res.json({
      status: row.enabled ? 'ready' : 'configured',
      enabled: row.enabled,
      provider: row.provider,
      entityId: row.entityId,
      entryPoint: row.entryPoint,
      issuer: row.issuer,
      metadataUrl: row.metadataUrl,
      clientId: row.clientId,
      hasCert: Boolean(row.cert),
      hasClientSecret: Boolean(row.clientSecret),
    });
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

router.put('/sso/config', async (req: SchoolContextRequest, res) => {
  try {
    const provider = String(req.body?.provider ?? '').trim().toUpperCase();
    if (provider !== 'SAML' && provider !== 'OIDC') {
      return res.status(400).json({ error: 'provider doit être SAML ou OIDC' });
    }
    const existing = await prisma.schoolSsoConfig.findFirst({
      where: req.schoolId ? { schoolId: req.schoolId } : {},
    });
    const data = {
      schoolId: req.schoolId ?? null,
      provider,
      enabled: Boolean(req.body?.enabled),
      entityId: typeof req.body?.entityId === 'string' ? req.body.entityId : null,
      entryPoint: typeof req.body?.entryPoint === 'string' ? req.body.entryPoint : null,
      cert: typeof req.body?.cert === 'string' ? req.body.cert : null,
      clientId: typeof req.body?.clientId === 'string' ? req.body.clientId : null,
      clientSecret: typeof req.body?.clientSecret === 'string' ? req.body.clientSecret : null,
      issuer: typeof req.body?.issuer === 'string' ? req.body.issuer : null,
      metadataUrl: typeof req.body?.metadataUrl === 'string' ? req.body.metadataUrl : null,
    };
    const row = existing
      ? await prisma.schoolSsoConfig.update({ where: { id: existing.id }, data })
      : await prisma.schoolSsoConfig.create({ data });
    res.json({
      id: row.id,
      status: row.enabled ? 'ready' : 'configured',
      enabled: row.enabled,
      provider: row.provider,
    });
  } catch (e) {
    res.status(500).json({ error: errorMsg(e) });
  }
});

export default router;
