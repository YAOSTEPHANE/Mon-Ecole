/**
 * Optimiseur simple d’emploi du temps : score les créneaux candidats
 * (conflits enseignant / salle / classe) et propose le meilleur.
 */

export type TimetableSlotCandidate = {
  dayOfWeek: number; // 1=lundi … 7=dimanche
  startTime: string; // HH:mm
  endTime: string;
  roomKey?: string | null;
};

export type ExistingLesson = TimetableSlotCandidate & {
  id?: string;
  classId?: string;
  teacherId?: string | null;
};

export type OptimizeRequest = {
  candidates: TimetableSlotCandidate[];
  existing: ExistingLesson[];
  classId: string;
  teacherId?: string | null;
  preferMorning?: boolean;
};

export type ScoredSlot = TimetableSlotCandidate & {
  score: number;
  reasons: string[];
  conflicts: string[];
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function overlaps(a: TimetableSlotCandidate, b: TimetableSlotCandidate): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const a0 = toMinutes(a.startTime);
  const a1 = toMinutes(a.endTime);
  const b0 = toMinutes(b.startTime);
  const b1 = toMinutes(b.endTime);
  return a0 < b1 && b0 < a1;
}

export function scoreTimetableCandidates(req: OptimizeRequest): ScoredSlot[] {
  const scored: ScoredSlot[] = req.candidates.map((c) => {
    let score = 100;
    const reasons: string[] = [];
    const conflicts: string[] = [];

    for (const ex of req.existing) {
      if (!overlaps(c, ex)) continue;
      if (ex.classId === req.classId) {
        score -= 50;
        conflicts.push('Conflit classe');
      }
      if (req.teacherId && ex.teacherId === req.teacherId) {
        score -= 40;
        conflicts.push('Conflit enseignant');
      }
      if (c.roomKey && ex.roomKey && c.roomKey === ex.roomKey) {
        score -= 35;
        conflicts.push('Conflit salle');
      }
    }

    const start = toMinutes(c.startTime);
    if (req.preferMorning !== false) {
      if (start >= 7 * 60 && start < 12 * 60) {
        score += 10;
        reasons.push('Créneau matinal privilégié');
      } else if (start >= 16 * 60) {
        score -= 5;
        reasons.push('Fin de journée');
      }
    }

    if (conflicts.length === 0) reasons.push('Aucun conflit détecté');

    return { ...c, score, reasons, conflicts };
  });

  return scored.sort((a, b) => b.score - a.score);
}

export function pickBestTimetableSlot(req: OptimizeRequest): ScoredSlot | null {
  const ranked = scoreTimetableCandidates(req);
  return ranked[0] ?? null;
}
