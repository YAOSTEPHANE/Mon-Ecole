import { getCurrentAcademicYear } from '@/utils/academicYear';
import {
  getCurrentTrimester as getCurrentTrimesterFromConfig,
  type AcademicTermDatesConfig,
} from '@/lib/academicTermDates';

export { getCurrentAcademicYear };

/** Année scolaire déduite d’une date (sans override admin localStorage). */
export function getCurrentAcademicYearFromDate(reference = new Date()): string {
  const currentYear = reference.getFullYear();
  const currentMonth = reference.getMonth() + 1;
  if (currentMonth >= 9) {
    return `${currentYear}-${currentYear + 1}`;
  }
  return `${currentYear - 1}-${currentYear}`;
}

/** Trimestre courant selon la date du jour (dates par défaut si config absente). */
export function getCurrentTrimester(
  reference = new Date(),
  academicYear = getCurrentAcademicYearFromDate(reference),
  termDates?: AcademicTermDatesConfig | null,
): string {
  return getCurrentTrimesterFromConfig(reference, academicYear, termDates);
}
