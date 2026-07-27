/** Ligne de gabarit d’échéancier (parts en % et décalage en jours). */
export type TuitionScheduleLine = {
  label: string;
  percentOfTotal: number;
  dueOffsetDays: number;
};

export function parseScheduleLines(raw: unknown): TuitionScheduleLine[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Le gabarit doit contenir au moins une ligne (tableau JSON).');
  }
  const lines: TuitionScheduleLine[] = [];
  let sum = 0;
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const label = String(r.label ?? '').trim();
    const percentOfTotal = Number(r.percentOfTotal);
    const dueOffsetDays = Number(r.dueOffsetDays);
    if (!label) throw new Error('Chaque ligne doit avoir un libellé.');
    if (Number.isNaN(percentOfTotal) || percentOfTotal <= 0 || percentOfTotal > 100) {
      throw new Error(`Pourcentage invalide pour « ${label} ».`);
    }
    if (Number.isNaN(dueOffsetDays) || dueOffsetDays < 0) {
      throw new Error(`Décalage en jours invalide pour « ${label} ».`);
    }
    lines.push({ label, percentOfTotal, dueOffsetDays });
    sum += percentOfTotal;
  }
  if (lines.length === 0) throw new Error('Aucune ligne valide.');
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`La somme des pourcentages doit être 100 (actuellement ${sum}).`);
  }
  return lines;
}

/** Répartit un total en FCFA entier sur les lignes (dernier versement = complément). */
export function splitTotalByPercents(total: number, lines: TuitionScheduleLine[]): number[] {
  const n = lines.length;
  if (n === 0) return [];
  const t = Math.round(total);
  const amounts: number[] = [];
  let allocated = 0;
  for (let i = 0; i < n - 1; i++) {
    const part = Math.floor((t * lines[i].percentOfTotal) / 100);
    amounts.push(part);
    allocated += part;
  }
  amounts.push(Math.max(0, t - allocated));
  return amounts;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Vérifie que la somme des tranches ne dépasse pas le montant de la structure. */
export function assertInstallmentSumWithinStructure(
  structureAmount: number,
  installmentAmounts: number[],
): void {
  const structure = Math.round(structureAmount);
  const sum = installmentAmounts.reduce((s, a) => s + Math.round(a), 0);
  if (sum > structure) {
    throw new Error(
      `La somme des tranches (${sum} FCFA) dépasse le montant de la structure (${structure} FCFA).`,
    );
  }
}
