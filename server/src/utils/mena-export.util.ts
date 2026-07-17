import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { getAppBrandingDelegate } from './app-branding-prisma.util';
import { brandingIdForSchool, classScopeWhere, studentScopeWhere } from './school-context.util';
import { toPublicBrandingShape } from './branding-assets.util';

export type MenaExportPackage = {
  meta: {
    schemaVersion: string;
    generatedAt: string;
    purpose: string;
    academicYear: string | null;
    schoolId: string;
  };
  etablissement: Record<string, unknown>;
  eleves: Array<Record<string, unknown>>;
  effectifs: {
    total: number;
    actifs: number;
    affectesEtat: number;
    nonAffectes: number;
    avecMatriculeFne: number;
    sansMatriculeFne: number;
    parNiveau: Array<{
      niveau: string;
      total: number;
      garcons: number;
      filles: number;
      autre: number;
      affectesEtat: number;
    }>;
    parClasse: Array<{
      classeId: string;
      classe: string;
      niveau: string;
      anneeScolaire: string | null;
      total: number;
      garcons: number;
      filles: number;
      autre: number;
      affectesEtat: number;
    }>;
  };
};

function isStateAssigned(raw: string | null | undefined): boolean {
  return raw === 'STATE_ASSIGNED';
}

export async function buildMenaStudentExportPackage(
  schoolId: string,
  isDefaultSchool: boolean,
  academicYear?: string
): Promise<MenaExportPackage> {
  const year = academicYear?.trim() || null;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      shortName: true,
      slug: true,
      address: true,
      phone: true,
      email: true,
      website: true,
      principalName: true,
      isDefault: true,
    },
  });

  const brandingDelegate = getAppBrandingDelegate();
  let branding: ReturnType<typeof toPublicBrandingShape> | null = null;
  if (brandingDelegate) {
    const brandingId = await brandingIdForSchool(schoolId);
    const row = await brandingDelegate.findUnique({ where: { id: brandingId } });
    if (row) {
      branding = toPublicBrandingShape(row as Parameters<typeof toPublicBrandingShape>[0]);
    }
  }

  const classWhere: Prisma.ClassWhereInput = {
    ...classScopeWhere(schoolId, isDefaultSchool),
    ...(year ? { academicYear: year } : {}),
  };

  const classes = await prisma.class.findMany({
    where: classWhere,
    select: {
      id: true,
      name: true,
      level: true,
      academicYear: true,
      capacity: true,
    },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });
  const classIds = classes.map((c) => c.id);

  const studentWhere: Prisma.StudentWhereInput = {
    ...studentScopeWhere(schoolId, isDefaultSchool),
    archivedAt: null,
    ...(year
      ? classIds.length > 0
        ? { OR: [{ classId: { in: classIds } }, { classId: null }] }
        : { classId: null }
      : {}),
  };

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      studentId: true,
      nationalMatricule: true,
      dateOfBirth: true,
      birthPlace: true,
      gender: true,
      isRepeating: true,
      address: true,
      emergencyContact: true,
      emergencyPhone: true,
      emergencyContact2: true,
      emergencyPhone2: true,
      medicalInfo: true,
      allergies: true,
      specialNeeds: true,
      stateAssignment: true,
      enrollmentStatus: true,
      enrollmentDate: true,
      lastReenrollmentAt: true,
      isActive: true,
      classId: true,
      schoolId: true,
      class: {
        select: {
          id: true,
          name: true,
          level: true,
          academicYear: true,
          capacity: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      parents: {
        select: {
          relation: true,
          parent: {
            select: {
              profession: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
      identityDocuments: {
        select: {
          type: true,
          label: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      schoolHistory: {
        select: {
          academicYear: true,
          className: true,
          classLevel: true,
          establishment: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { academicYear: 'desc' },
      },
      transfers: {
        select: {
          effectiveDate: true,
          transferType: true,
          reason: true,
          notes: true,
          fromClassId: true,
          toClassId: true,
        },
        orderBy: { effectiveDate: 'desc' },
      },
    },
    orderBy: [{ studentId: 'asc' }],
  });

  const eleves = students.map((s) => ({
    idInterne: s.id,
    matriculeEtablissement: s.studentId,
    matriculeFne: s.nationalMatricule,
    nom: s.user.lastName,
    prenoms: s.user.firstName,
    sexe: s.gender === 'MALE' ? 'M' : s.gender === 'FEMALE' ? 'F' : 'A',
    dateNaissance: s.dateOfBirth.toISOString().slice(0, 10),
    lieuNaissance: s.birthPlace,
    adresse: s.address,
    email: s.user.email,
    telephone: s.user.phone,
    contactUrgence1: s.emergencyContact
      ? { nom: s.emergencyContact, telephone: s.emergencyPhone }
      : null,
    contactUrgence2: s.emergencyContact2
      ? { nom: s.emergencyContact2, telephone: s.emergencyPhone2 }
      : null,
    infosMedicales: s.medicalInfo,
    allergies: s.allergies,
    besoinsSpecifiques: s.specialNeeds,
    redoublant: s.isRepeating,
    affecteEtat: isStateAssigned(s.stateAssignment),
    statutAffectation: s.stateAssignment ?? 'NOT_STATE_ASSIGNED',
    statutInscription: s.enrollmentStatus,
    dateInscription: s.enrollmentDate.toISOString().slice(0, 10),
    dateDerniereReinscription: s.lastReenrollmentAt
      ? s.lastReenrollmentAt.toISOString().slice(0, 10)
      : null,
    actif: s.isActive,
    etablissementId: s.schoolId,
    classe: s.class
      ? {
          id: s.class.id,
          nom: s.class.name,
          niveau: s.class.level,
          anneeScolaire: s.class.academicYear,
          capacite: s.class.capacity,
        }
      : null,
    parents: s.parents.map((link) => ({
      lien: link.relation,
      nom: link.parent.user.lastName,
      prenoms: link.parent.user.firstName,
      email: link.parent.user.email,
      telephone: link.parent.user.phone,
      profession: link.parent.profession,
    })),
    documentsIdentite: s.identityDocuments.map((d) => ({
      type: d.type,
      libelle: d.label,
      nomFichier: d.originalName,
      mimeType: d.mimeType,
      tailleOctets: d.fileSize,
      notes: d.notes,
      dateDepot: d.createdAt.toISOString().slice(0, 10),
    })),
    historiqueScolaire: s.schoolHistory.map((h) => ({
      anneeScolaire: h.academicYear,
      classe: h.className,
      niveau: h.classLevel,
      etablissement: h.establishment,
      notes: h.notes,
      enregistreLe: h.createdAt.toISOString().slice(0, 10),
    })),
    transferts: s.transfers.map((t) => ({
      dateEffectivite: t.effectiveDate.toISOString().slice(0, 10),
      type: t.transferType,
      motif: t.reason,
      notes: t.notes,
      classeOrigineId: t.fromClassId,
      classeDestinationId: t.toClassId,
    })),
  }));

  const actifs = students.filter((s) => s.isActive && s.enrollmentStatus === 'ACTIVE');
  const affectes = actifs.filter((s) => isStateAssigned(s.stateAssignment));
  const avecFne = actifs.filter((s) => Boolean(s.nationalMatricule?.trim()));

  const byLevel = new Map<
    string,
    { niveau: string; total: number; garcons: number; filles: number; autre: number; affectesEtat: number }
  >();
  const byClass = new Map<
    string,
    {
      classeId: string;
      classe: string;
      niveau: string;
      anneeScolaire: string | null;
      total: number;
      garcons: number;
      filles: number;
      autre: number;
      affectesEtat: number;
    }
  >();

  for (const s of actifs) {
    const niveau = s.class?.level ?? 'Sans niveau';
    const lr = byLevel.get(niveau) ?? {
      niveau,
      total: 0,
      garcons: 0,
      filles: 0,
      autre: 0,
      affectesEtat: 0,
    };
    lr.total += 1;
    if (s.gender === 'MALE') lr.garcons += 1;
    else if (s.gender === 'FEMALE') lr.filles += 1;
    else lr.autre += 1;
    if (isStateAssigned(s.stateAssignment)) lr.affectesEtat += 1;
    byLevel.set(niveau, lr);

    if (s.classId && s.class) {
      const cr = byClass.get(s.classId) ?? {
        classeId: s.classId,
        classe: s.class.name,
        niveau: s.class.level,
        anneeScolaire: s.class.academicYear,
        total: 0,
        garcons: 0,
        filles: 0,
        autre: 0,
        affectesEtat: 0,
      };
      cr.total += 1;
      if (s.gender === 'MALE') cr.garcons += 1;
      else if (s.gender === 'FEMALE') cr.filles += 1;
      else cr.autre += 1;
      if (isStateAssigned(s.stateAssignment)) cr.affectesEtat += 1;
      byClass.set(s.classId, cr);
    }
  }

  return {
    meta: {
      schemaVersion: 'mena-eleves-1.1',
      generatedAt: new Date().toISOString(),
      purpose:
        'Dossier complet élèves établissement pour remontée MENA / DESPS (identité, FNE, parents, contacts, documents, historique, effectifs, affectés État). Biométrie / NFC exclus.',
      academicYear: year,
      schoolId,
    },
    etablissement: {
      id: school?.id ?? schoolId,
      nom: branding?.schoolDisplayName || school?.name || null,
      nomCourt: school?.shortName ?? null,
      slug: school?.slug ?? null,
      codeMena: branding?.schoolCode ?? null,
      drena: branding?.schoolDrena ?? null,
      iepp: branding?.schoolIepp ?? null,
      statut: branding?.schoolStatus ?? null,
      milieu: branding?.schoolMilieu ?? null,
      region: branding?.schoolRegion ?? null,
      salles: branding?.classroomCount ?? null,
      adresse: branding?.schoolAddress || school?.address || null,
      telephone: branding?.schoolPhone || school?.phone || null,
      email: branding?.schoolEmail || school?.email || null,
      siteWeb: branding?.schoolWebsite || school?.website || null,
      directeur: branding?.schoolPrincipal || school?.principalName || null,
      classesOuvertes: classes.length,
      capaciteTotale: classes.reduce((sum, c) => sum + (c.capacity || 0), 0),
    },
    eleves,
    effectifs: {
      total: students.length,
      actifs: actifs.length,
      affectesEtat: affectes.length,
      nonAffectes: actifs.length - affectes.length,
      avecMatriculeFne: avecFne.length,
      sansMatriculeFne: actifs.length - avecFne.length,
      parNiveau: [...byLevel.values()].sort((a, b) => a.niveau.localeCompare(b.niveau, 'fr')),
      parClasse: [...byClass.values()].sort(
        (a, b) => a.niveau.localeCompare(b.niveau, 'fr') || a.classe.localeCompare(b.classe, 'fr')
      ),
    },
  };
}

export function checksumMenaPackage(pkg: MenaExportPackage): string {
  return createHash('sha256').update(JSON.stringify(pkg)).digest('hex').slice(0, 32);
}

export function menaPackageToStudentsCsv(pkg: MenaExportPackage): string {
  const header = [
    'matricule_etablissement',
    'matricule_fne',
    'nom',
    'prenoms',
    'sexe',
    'date_naissance',
    'lieu_naissance',
    'adresse',
    'classe',
    'niveau',
    'annee_scolaire',
    'affecte_etat',
    'statut_affectation',
    'statut_inscription',
    'date_inscription',
    'redoublant',
    'actif',
    'email',
    'telephone',
    'contact_urgence_1',
    'tel_urgence_1',
    'contact_urgence_2',
    'tel_urgence_2',
    'allergies',
    'besoins_specifiques',
    'nb_parents',
    'nb_documents_identite',
    'nb_historique_scolaire',
  ];
  const lines = [header.join(';')];
  for (const e of pkg.eleves) {
    const classe = e.classe as { nom?: string; niveau?: string; anneeScolaire?: string } | null;
    const u1 = e.contactUrgence1 as { nom?: string; telephone?: string | null } | null;
    const u2 = e.contactUrgence2 as { nom?: string; telephone?: string | null } | null;
    const parents = Array.isArray(e.parents) ? e.parents : [];
    const docs = Array.isArray(e.documentsIdentite) ? e.documentsIdentite : [];
    const hist = Array.isArray(e.historiqueScolaire) ? e.historiqueScolaire : [];
    const row = [
      String(e.matriculeEtablissement ?? ''),
      String(e.matriculeFne ?? ''),
      String(e.nom ?? ''),
      String(e.prenoms ?? ''),
      String(e.sexe ?? ''),
      String(e.dateNaissance ?? ''),
      String(e.lieuNaissance ?? ''),
      String(e.adresse ?? ''),
      String(classe?.nom ?? ''),
      String(classe?.niveau ?? ''),
      String(classe?.anneeScolaire ?? ''),
      e.affecteEtat ? 'OUI' : 'NON',
      String(e.statutAffectation ?? ''),
      String(e.statutInscription ?? ''),
      String(e.dateInscription ?? ''),
      e.redoublant ? 'OUI' : 'NON',
      e.actif ? 'OUI' : 'NON',
      String(e.email ?? ''),
      String(e.telephone ?? ''),
      String(u1?.nom ?? ''),
      String(u1?.telephone ?? ''),
      String(u2?.nom ?? ''),
      String(u2?.telephone ?? ''),
      String(e.allergies ?? ''),
      String(e.besoinsSpecifiques ?? ''),
      String(parents.length),
      String(docs.length),
      String(hist.length),
    ].map((cell) => {
      if (/[";\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
      return cell;
    });
    lines.push(row.join(';'));
  }
  return '\ufeff' + lines.join('\n');
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '***';
  }
}

export async function pushMenaPackageToWebhook(
  pkg: MenaExportPackage,
  webhookUrl: string
): Promise<{ ok: boolean; status: number; bodyPreview: string }> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Mena-Package-Schema': pkg.meta.schemaVersion,
      'X-School-Id': pkg.meta.schoolId,
    },
    body: JSON.stringify(pkg),
  });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    bodyPreview: text.slice(0, 500),
  };
}

export function getConfiguredMenaWebhookUrl(): string | null {
  const url = process.env.MENA_WEBHOOK_URL?.trim() || process.env.MENA_API_URL?.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export function maskConfiguredMenaWebhook(): string | null {
  const url = getConfiguredMenaWebhookUrl();
  return url ? maskUrl(url) : null;
}
