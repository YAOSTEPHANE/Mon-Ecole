'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiLoader, FiSearch, FiFileText } from 'react-icons/fi';
import UltraPremiumPageShell from '@/components/public/UltraPremiumPageShell';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { publicApi } from '@/services/api';

type BulletinPayload = Awaited<ReturnType<typeof publicApi.lookupMockExamResults>>;

const KIND_LABEL: Record<string, string> = {
  BEPC: 'BEPC',
  BAC: 'Baccalauréat',
  OTHER: 'Autre',
};

function mentionFor(score: number, passed: boolean | null): string {
  if (passed === true) return 'Admis';
  if (passed === false) return 'Ajourné';
  if (score >= 10) return 'Admis';
  return 'Ajourné';
}

export default function PublicMockExamsPage() {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [bulletin, setBulletin] = useState<BulletinPayload | null>(null);

  const lookup = useMutation({
    mutationFn: () =>
      publicApi.lookupMockExamResults({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        matricule: matricule.trim(),
      }),
    onSuccess: (data) => {
      setBulletin(data);
      if (!data.lines.length) {
        toast('Élève trouvé, mais aucune note d’examen blanc pour cette année.', { icon: 'ℹ️' });
      }
    },
    onError: (err: unknown) => {
      setBulletin(null);
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Recherche impossible';
      toast.error(msg);
    },
  });

  const canSubmit =
    lastName.trim().length >= 2 &&
    firstName.trim().length >= 2 &&
    matricule.trim().length >= 2 &&
    !lookup.isPending;

  return (
    <UltraPremiumPageShell
      navLabel="Examens"
      title="Examens blancs"
      description="Recherchez un élève par nom, prénom et numéro matricule pour consulter ses notes d’examens blancs sous forme de bulletin."
    >
      <div className="mx-auto max-w-4xl px-3 pb-16 sm:px-6">
        <form
          className="mt-8 rounded-3xl border border-stone-200/90 bg-white/95 p-5 shadow-sm sm:p-7"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            lookup.mutate();
          }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0018A8]/10 text-[#0018A8]">
              <FiSearch className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-stone-900">
                Consulter les notes
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Saisissez exactement le nom, le prénom et le n° élève (ou matricule FNE) de
                l’élève.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Input
              label="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
            <Input
              label="Prénom(s)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
            <Input
              label="N° matricule"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!canSubmit}>
              {lookup.isPending ? (
                <>
                  <FiLoader className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Recherche…
                </>
              ) : (
                <>
                  <FiSearch className="mr-2 h-4 w-4" aria-hidden />
                  Afficher le bulletin
                </>
              )}
            </Button>
            {bulletin ? (
              <button
                type="button"
                className="text-sm font-semibold text-stone-600 underline-offset-2 hover:underline"
                onClick={() => setBulletin(null)}
              >
                Effacer le résultat
              </button>
            ) : null}
          </div>
        </form>

        {bulletin ? (
          <article
            className="mt-8 overflow-hidden rounded-3xl border border-stone-300/90 bg-white shadow-lg print:border print:shadow-none"
            aria-label="Bulletin examens blancs"
          >
            <header className="border-b border-stone-200 bg-gradient-to-r from-[#07081a] via-[#001270] to-[#07081a] px-5 py-6 text-white sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
                    Bulletin — Examens blancs
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    {bulletin.student.lastName.toUpperCase()} {bulletin.student.firstName}
                  </h3>
                  <p className="mt-1 text-sm text-stone-300">
                    Matricule {bulletin.student.studentId}
                    {bulletin.student.className
                      ? ` · ${bulletin.student.className}${
                          bulletin.student.classLevel ? ` (${bulletin.student.classLevel})` : ''
                        }`
                      : ''}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-300">
                    Année scolaire
                  </p>
                  <p className="mt-0.5 text-sm font-bold">{bulletin.academicYear}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-stone-300">
                    Moyenne
                  </p>
                  <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-amber-200">
                    {bulletin.averageOn20 != null
                      ? `${bulletin.averageOn20.toFixed(2)}/20`
                      : '—'}
                  </p>
                </div>
              </div>
            </header>

            <div className="px-3 py-5 sm:px-6">
              {bulletin.lines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center">
                  <FiFileText className="mx-auto h-8 w-8 text-stone-300" aria-hidden />
                  <p className="mt-3 text-sm text-stone-600">
                    Aucune note d’examen blanc enregistrée pour cet élève sur l’année{' '}
                    {bulletin.academicYear}.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-stone-800 text-left text-[11px] font-bold uppercase tracking-wide text-stone-600">
                        <th className="px-2 py-3">Matière / épreuve</th>
                        <th className="px-2 py-3">Type</th>
                        <th className="px-2 py-3 text-right">Note</th>
                        <th className="px-2 py-3 text-right">Mention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulletin.lines.map((line) => (
                        <tr key={line.examId} className="border-b border-stone-100">
                          <td className="px-2 py-3 align-top">
                            <p className="font-semibold text-stone-900">{line.subject || line.title}</p>
                            {line.subject ? (
                              <p className="text-xs text-stone-500">{line.title}</p>
                            ) : null}
                          </td>
                          <td className="px-2 py-3 align-top text-stone-700">
                            {KIND_LABEL[line.examKind] ?? line.examKind}
                          </td>
                          <td className="px-2 py-3 align-top text-right font-bold tabular-nums text-stone-900">
                            {line.scoreOn20.toFixed(2)}
                            <span className="font-medium text-stone-500">/20</span>
                          </td>
                          <td className="px-2 py-3 align-top text-right">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                mentionFor(line.scoreOn20, line.passed) === 'Admis'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-rose-50 text-rose-800'
                              }`}
                            >
                              {mentionFor(line.scoreOn20, line.passed)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-stone-800">
                        <td className="px-2 py-4 font-bold text-stone-900" colSpan={2}>
                          Moyenne générale
                        </td>
                        <td className="px-2 py-4 text-right font-display text-lg font-bold tabular-nums text-stone-900">
                          {bulletin.averageOn20 != null
                            ? `${bulletin.averageOn20.toFixed(2)}/20`
                            : '—'}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <p className="mt-6 text-center text-[11px] text-stone-500">
                Document consultatif — les questionnaires et le détail des réponses restent réservés
                à l’espace élève.{' '}
                <Link href="/login" className="font-semibold text-[#0018A8] hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </article>
        ) : null}
      </div>
    </UltraPremiumPageShell>
  );
}
