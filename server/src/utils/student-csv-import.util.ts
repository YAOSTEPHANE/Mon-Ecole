import type { Gender } from '@prisma/client';
import prisma from './prisma';
import {
  inviteNewUserToSetPassword,
  resolveAdminProvidedOrInvitePassword,
} from './admin-user-initial-password.util';
import { validatePasswordStrength } from './password.util';
import { generateDigitalCardPublicId } from './digital-card.util';
import { encryptStudentScalarsForPrismaCreate } from './student-sensitive-crypto.util';
import {
  isSyntheticStudentEmail,
  resolveStudentAccountEmail,
} from './student-login-identifier.util';

export const STUDENT_IMPORT_CSV_TEMPLATE = `N° élève;Nom;Prénom;Date naissance;Genre;Email;Mot de passe;Classe;Téléphone;Lieu naissance;Adresse;Contact urgence;Tél urgence;Matricule national
ELV001;Dupont;Alice;15/03/2012;F;alice.dupont@exemple.com;MotDePasse1!;6ème A;0600000001;Abidjan;;;;
ELV002;Koné;Ibrahim;22/07/2011;M;;MotDePasse1!;6ème A;0600000002;Bouaké;;;;
`;

export const STUDENT_IMPORT_MAX_ROWS = 200;

export type StudentImportRow = {
  line: number;
  studentId: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  gender: Gender;
  email: string | null;
  password: string | null;
  className: string | null;
  phone: string | null;
  birthPlace: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  nationalMatricule: string | null;
};

export type StudentImportRowResult = {
  line: number;
  studentId: string;
  ok: boolean;
  error?: string;
  loginIdentifier?: string;
  passwordSetupEmailSent?: boolean;
};

export type StudentImportReport = {
  total: number;
  created: number;
  failed: number;
  results: StudentImportRowResult[];
};

const HEADER_ALIASES: Record<keyof Omit<StudentImportRow, 'line' | 'gender' | 'dateOfBirth'> | 'dateOfBirth' | 'gender', string[]> = {
  studentId: ['n° élève', "n° eleve", 'numero eleve', 'numéro élève', 'studentid', 'matricule', 'id'],
  lastName: ['nom', 'lastname', 'name'],
  firstName: ['prénom', 'prenom', 'firstname'],
  dateOfBirth: ['date naissance', 'date de naissance', 'dateofbirth', 'naissance', 'dob'],
  gender: ['genre', 'sexe', 'gender', 'sex'],
  email: ['email', 'e-mail', 'mail'],
  password: ['mot de passe', 'password', 'mdp'],
  className: ['classe', 'class', 'classename', 'niveau'],
  phone: ['téléphone', 'telephone', 'phone', 'tel'],
  birthPlace: ['lieu naissance', 'lieu de naissance', 'birthplace'],
  address: ['adresse', 'address'],
  emergencyContact: ['contact urgence', "contact d'urgence", 'emergencycontact'],
  emergencyPhone: ['tél urgence', 'tel urgence', 'emergencyphone'],
  nationalMatricule: ['matricule national', 'matricule fne', 'nationalmatricule', 'fne'],
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && (ch === ';' || ch === ',')) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parseGender(raw: string): Gender | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (['m', 'h', 'male', 'homme', 'garcon', 'garçon', 'masculin'].includes(v)) return 'MALE';
  if (['f', 'female', 'femme', 'fille', 'feminin', 'féminin'].includes(v)) return 'FEMALE';
  if (['other', 'autre', 'x'].includes(v)) return 'OTHER';
  return null;
}

/** Accepte JJ/MM/AAAA, JJ-MM-AAAA ou AAAA-MM-JJ. */
export function parseStudentBirthDate(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const fr = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(v);
  if (fr) {
    const day = Number(fr[1]);
    const month = Number(fr[2]);
    const year = Number(fr[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
      return d;
    }
    return null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day) {
      return d;
    }
    return null;
  }
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapHeaders(headerCells: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const map: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  headerCells.forEach((cell, index) => {
    const normalized = normalizeHeader(cell);
    (Object.keys(HEADER_ALIASES) as Array<keyof typeof HEADER_ALIASES>).forEach((key) => {
      if (map[key] !== undefined) return;
      const aliases = HEADER_ALIASES[key].map((a) => normalizeHeader(a));
      if (aliases.includes(normalized)) {
        map[key] = index;
      }
    });
  });
  return map;
}

function cellAt(cells: string[], index: number | undefined): string {
  if (index === undefined) return '';
  return (cells[index] ?? '').trim();
}

export function parseStudentImportCsv(csv: string): StudentImportRow[] {
  const text = csv.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV vide ou sans lignes de données (en-tête + au moins une ligne)');
  }

  const headerMap = mapHeaders(splitCsvLine(lines[0]));
  const required: Array<keyof typeof HEADER_ALIASES> = [
    'studentId',
    'lastName',
    'firstName',
    'dateOfBirth',
    'gender',
  ];
  for (const key of required) {
    if (headerMap[key] === undefined) {
      throw new Error(`Colonne obligatoire manquante : ${HEADER_ALIASES[key][0]}`);
    }
  }

  const rows: StudentImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cells = splitCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;

    const genderRaw = cellAt(cells, headerMap.gender);
    const gender = parseGender(genderRaw);
    if (!gender) {
      throw new Error(`Ligne ${lineNo}: genre invalide (« ${genderRaw} »). Utilisez M, F ou OTHER.`);
    }

    const dateRaw = cellAt(cells, headerMap.dateOfBirth);
    if (!parseStudentBirthDate(dateRaw)) {
      throw new Error(
        `Ligne ${lineNo}: date de naissance invalide (« ${dateRaw} »). Format JJ/MM/AAAA ou AAAA-MM-JJ.`,
      );
    }

    const studentId = cellAt(cells, headerMap.studentId);
    const lastName = cellAt(cells, headerMap.lastName);
    const firstName = cellAt(cells, headerMap.firstName);
    if (!studentId || !lastName || !firstName) {
      throw new Error(`Ligne ${lineNo}: N° élève, Nom et Prénom sont obligatoires`);
    }

    const emailRaw = cellAt(cells, headerMap.email);
    const passwordRaw = cellAt(cells, headerMap.password);
    const className = cellAt(cells, headerMap.className);
    const phone = cellAt(cells, headerMap.phone);
    const birthPlace = cellAt(cells, headerMap.birthPlace);
    const address = cellAt(cells, headerMap.address);
    const emergencyContact = cellAt(cells, headerMap.emergencyContact);
    const emergencyPhone = cellAt(cells, headerMap.emergencyPhone);
    const nationalMatricule = cellAt(cells, headerMap.nationalMatricule);

    rows.push({
      line: lineNo,
      studentId,
      lastName,
      firstName,
      dateOfBirth: dateRaw,
      gender,
      email: emailRaw || null,
      password: passwordRaw || null,
      className: className || null,
      phone: phone || null,
      birthPlace: birthPlace || null,
      address: address || null,
      emergencyContact: emergencyContact || null,
      emergencyPhone: emergencyPhone || null,
      nationalMatricule: nationalMatricule || null,
    });
  }

  if (rows.length === 0) {
    throw new Error('Aucune ligne de données exploitable');
  }
  if (rows.length > STUDENT_IMPORT_MAX_ROWS) {
    throw new Error(`Trop de lignes (${rows.length}). Maximum : ${STUDENT_IMPORT_MAX_ROWS}.`);
  }

  return rows;
}

function normalizeClassKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

async function resolveClassId(
  className: string | null,
  schoolId: string | undefined,
  cache: Map<string, string | null>,
): Promise<string | undefined> {
  if (!className?.trim()) return undefined;
  const key = normalizeClassKey(className);
  if (cache.has(key)) {
    const cached = cache.get(key);
    return cached ?? undefined;
  }

  const classes = await prisma.class.findMany({
    where: {
      ...(schoolId ? { schoolId } : {}),
    },
    select: { id: true, name: true, level: true },
  });

  for (const cls of classes) {
    const candidates = [
      cls.name,
      cls.level ? `${cls.name} (${cls.level})` : null,
      cls.level,
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      cache.set(normalizeClassKey(c), cls.id);
    }
  }

  // exact match preferred
  const exact = classes.find((c) => normalizeClassKey(c.name) === key);
  if (exact) {
    cache.set(key, exact.id);
    return exact.id;
  }

  const byLevel = classes.find((c) => c.level && normalizeClassKey(c.level) === key);
  if (byLevel) {
    cache.set(key, byLevel.id);
    return byLevel.id;
  }

  cache.set(key, null);
  return undefined;
}

export async function importStudentsFromCsvRows(
  rows: StudentImportRow[],
  options: {
    schoolId?: string;
    defaultPassword?: string | null;
    actorUserId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<StudentImportReport> {
  const classCache = new Map<string, string | null>();
  const results: StudentImportRowResult[] = [];
  let created = 0;

  const defaultPassword =
    typeof options.defaultPassword === 'string' && options.defaultPassword.trim()
      ? options.defaultPassword.trim()
      : null;
  if (defaultPassword) {
    validatePasswordStrength(defaultPassword);
  }

  for (const row of rows) {
    try {
      const dob = parseStudentBirthDate(row.dateOfBirth);
      if (!dob) {
        throw new Error('Date de naissance invalide');
      }

      let classId: string | undefined;
      if (row.className) {
        classId = await resolveClassId(row.className, options.schoolId, classCache);
        if (!classId) {
          throw new Error(`Classe introuvable : « ${row.className} »`);
        }
      }

      const resolved = resolveStudentAccountEmail({
        email: row.email,
        studentId: row.studentId,
        nationalMatricule: row.nationalMatricule,
      });
      const accountEmail = resolved.email;
      const usesMatriculeLogin = resolved.usesMatriculeLogin;

      const passwordRaw = (row.password || defaultPassword || '').trim();
      if (usesMatriculeLogin && !passwordRaw) {
        throw new Error(
          'Sans e-mail, un mot de passe est obligatoire (colonne « Mot de passe » ou mot de passe par défaut)',
        );
      }
      if (passwordRaw) {
        validatePasswordStrength(passwordRaw);
      }

      const existingUser = await prisma.user.findUnique({ where: { email: accountEmail } });
      if (existingUser) {
        throw new Error(
          usesMatriculeLogin
            ? 'Ce n° élève / matricule est déjà utilisé comme identifiant'
            : 'Cet e-mail est déjà utilisé',
        );
      }

      const existingStudent = await prisma.student.findUnique({ where: { studentId: row.studentId } });
      if (existingStudent) {
        throw new Error('Ce numéro d’élève existe déjà');
      }

      const { hashedPassword, shouldSendSetupEmail } = await resolveAdminProvidedOrInvitePassword(
        usesMatriculeLogin ? passwordRaw : passwordRaw || undefined,
      );
      const sendSetupEmail =
        shouldSendSetupEmail && !usesMatriculeLogin && !isSyntheticStudentEmail(accountEmail);

      const sensitiveFields = encryptStudentScalarsForPrismaCreate({
        address: row.address,
        emergencyContact: row.emergencyContact,
        emergencyPhone: row.emergencyPhone,
      });

      const user = await prisma.user.create({
        data: {
          email: accountEmail,
          password: hashedPassword,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone ?? undefined,
          role: 'STUDENT',
          studentProfile: {
            create: {
              studentId: row.studentId,
              dateOfBirth: dob,
              birthPlace: row.birthPlace ?? undefined,
              gender: row.gender,
              ...sensitiveFields,
              digitalCardPublicId: generateDigitalCardPublicId(),
              classId,
              schoolId: options.schoolId,
              enrollmentStatus: 'ACTIVE',
              ...(row.nationalMatricule
                ? { nationalMatricule: row.nationalMatricule.slice(0, 64) }
                : {}),
            },
          },
        },
        select: { id: true, email: true, firstName: true },
      });

      if (sendSetupEmail) {
        try {
          await inviteNewUserToSetPassword(user.id, user.email, user.firstName);
        } catch (inviteErr) {
          console.error('Invitation mot de passe (import élève):', inviteErr);
        }
      }

      created += 1;
      results.push({
        line: row.line,
        studentId: row.studentId,
        ok: true,
        loginIdentifier: usesMatriculeLogin
          ? row.nationalMatricule?.trim() || row.studentId
          : accountEmail,
        passwordSetupEmailSent: sendSetupEmail,
      });
    } catch (err: unknown) {
      results.push({
        line: row.line,
        studentId: row.studentId,
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  if (created > 0 && options.actorUserId) {
    try {
      await prisma.securityEvent.create({
        data: {
          userId: options.actorUserId,
          type: 'students_imported',
          description: `Import CSV élèves : ${created} créé(s) / ${rows.length} ligne(s)`,
          ipAddress: options.ipAddress ?? undefined,
          userAgent: options.userAgent ?? undefined,
          severity: 'info',
        },
      });
    } catch {
      /* best-effort */
    }
  }

  return {
    total: rows.length,
    created,
    failed: rows.length - created,
    results,
  };
}
