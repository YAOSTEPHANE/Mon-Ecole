export type EducationSectorValue = 'GENERAL' | 'TECHNICAL';

export const EDUCATION_SECTOR_LABELS: Record<EducationSectorValue, string> = {
  GENERAL: 'Enseignement général',
  TECHNICAL: 'Enseignement technique',
};

export const EDUCATION_SECTOR_SHORT_LABELS: Record<EducationSectorValue, string> = {
  GENERAL: 'Général',
  TECHNICAL: 'Technique',
};

export function normalizeEducationSector(value: unknown): EducationSectorValue {
  return value === 'TECHNICAL' ? 'TECHNICAL' : 'GENERAL';
}

export function educationSectorBadgeVariant(
  sector: EducationSectorValue,
): 'info' | 'warning' | 'default' {
  return sector === 'TECHNICAL' ? 'warning' : 'info';
}

export const EDUCATION_SECTOR_FILTER_OPTIONS = [
  { label: 'Toutes les voies', value: 'all' },
  { label: EDUCATION_SECTOR_SHORT_LABELS.GENERAL, value: 'GENERAL' },
  { label: EDUCATION_SECTOR_SHORT_LABELS.TECHNICAL, value: 'TECHNICAL' },
] as const;
