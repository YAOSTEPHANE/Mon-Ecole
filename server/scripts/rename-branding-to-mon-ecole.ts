/**
 * Remplace les libellés Tranlefet / CPTB du branding et des écoles par « Mon Ecole ».
 * Usage: npx tsx scripts/rename-branding-to-mon-ecole.ts [--confirm]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const confirm = process.argv.includes('--confirm');

function replaceName(value: string | null | undefined): string | null {
  if (!value?.trim()) return value ?? null;
  const next = value
    .replace(/Collège Privé Tranlefet de Bouaké/gi, 'Mon Ecole')
    .replace(/College Prive Tranlefet de Bouake/gi, 'Mon Ecole')
    .replace(/COLLEGE PRIVE TRANLEFET DE BOUAKÉ/gi, 'MON ECOLE')
    .replace(/Collège Tranlefet/gi, 'Mon Ecole')
    .replace(/Tranlefet/gi, 'Mon Ecole')
    .replace(/\bCPTB\b/g, 'Mon Ecole');
  return next === value ? value : next;
}

async function main() {
  const brandings = await prisma.appBranding.findMany();

  let brandingUpdates = 0;
  for (const row of brandings) {
    const appTitle = replaceName(row.appTitle);
    const schoolDisplayName = replaceName(row.schoolDisplayName);
    const schoolEmail =
      row.schoolEmail && /tranlefet/i.test(row.schoolEmail) ? null : row.schoolEmail;
    const studiesDirectorMessage = replaceName(row.studiesDirectorMessage);
    const studiesDirectorFooterLine = replaceName(row.studiesDirectorFooterLine);
    const appTagline = replaceName(row.appTagline);
    const changed =
      appTitle !== row.appTitle ||
      schoolDisplayName !== row.schoolDisplayName ||
      schoolEmail !== row.schoolEmail ||
      studiesDirectorMessage !== row.studiesDirectorMessage ||
      studiesDirectorFooterLine !== row.studiesDirectorFooterLine ||
      appTagline !== row.appTagline;
    if (!changed) continue;
    brandingUpdates += 1;
    if (confirm) {
      await prisma.appBranding.update({
        where: { id: row.id },
        data: {
          appTitle,
          schoolDisplayName,
          schoolEmail,
          studiesDirectorMessage,
          studiesDirectorFooterLine,
          appTagline,
          schoolCode:
            row.schoolCode === '253798' ? null : row.schoolCode,
        },
      });
    }
  }

  const schools = await prisma.school.findMany({
    select: { id: true, name: true, shortName: true },
  });
  let schoolUpdates = 0;
  for (const school of schools) {
    const name = replaceName(school.name) || 'Mon Ecole';
    const shortName = replaceName(school.shortName);
    if (name === school.name && shortName === school.shortName) continue;
    schoolUpdates += 1;
    if (confirm) {
      await prisma.school.update({
        where: { id: school.id },
        data: { name, shortName },
      });
    }
  }

  console.log(
    confirm
      ? `Mis à jour : ${brandingUpdates} branding(s), ${schoolUpdates} école(s).`
      : `À mettre à jour : ${brandingUpdates} branding(s), ${schoolUpdates} école(s). Relancez avec --confirm.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
