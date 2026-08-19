'use client';

import { useQuery } from '@tanstack/react-query';
import { FiAward, FiStar } from 'react-icons/fi';
import { publicApi } from '@/services/api';
import HomeReveal from './HomeReveal';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function HomeAcademicResultsSection() {
  const { data, isPending } = useQuery({
    queryKey: ['public-academic-results', ''],
    queryFn: () => publicApi.getAcademicResults(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const examStats = data?.examStats ?? [];
  const honorStudents = data?.honorRoll?.students ?? [];
  if (!isPending && examStats.length === 0 && honorStudents.length === 0) return null;

  return (
    <section
      id="resultats"
      className="relative z-10 scroll-mt-20 px-3 py-12 sm:px-6 sm:py-20"
      aria-labelledby="public-results-title"
    >
      <HomeReveal>
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="home-eyebrow mx-auto">
              <FiAward className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
              Résultats
            </span>
            <h2
              id="public-results-title"
              className="mt-4 font-display text-[1.65rem] font-semibold tracking-tight text-stone-900 sm:text-4xl"
            >
              Réussites et palmarès
            </h2>
            <div className="home-section-accent mt-4" aria-hidden />
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
              {data?.academicYear
                ? `Année scolaire ${data.academicYear}`
                : 'Les résultats officiels de l’établissement.'}
              {data?.honorRoll?.periodLabel ? ` · ${data.honorRoll.periodLabel}` : ''}
            </p>
          </div>

          {examStats.length > 0 ? (
            <div
              className={`mt-10 grid gap-4 ${
                examStats.length === 1
                  ? 'mx-auto max-w-sm'
                  : examStats.length === 2
                    ? 'sm:grid-cols-2'
                    : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {examStats.map((stat) => (
                <article
                  key={stat.id}
                  className="overflow-hidden rounded-3xl border border-tran-mustard-200/70 bg-gradient-to-br from-tran-mauve-950 via-tran-mauve-900 to-stone-950 p-5 text-center text-white shadow-xl sm:p-7"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tran-mustard-200">
                    {stat.examLabel}
                  </p>
                  <p className="mt-3 font-sans text-4xl font-extrabold tabular-nums tracking-tight text-white sm:text-5xl">
                    {stat.passRate.toLocaleString('fr-FR')}
                    <span className="ml-1 text-2xl font-bold tracking-normal text-tran-mustard-200">%</span>
                  </p>
                  <p className="mt-2 text-xs font-medium text-stone-300">Taux d’admission</p>
                  {stat.candidates != null && stat.admitted != null ? (
                    <p className="mt-3 text-[11px] text-stone-400">
                      {stat.admitted} admis / {stat.candidates} candidats
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {honorStudents.length > 0 ? (
            <div className="mt-12">
              <h3 className="text-center font-display text-lg font-semibold text-stone-900 sm:text-xl">
                Meilleurs de chaque niveau
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-center text-sm text-stone-500">
                Premier de chaque niveau (6ᵉ à Terminale).
              </p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {honorStudents.map((student) => {
                  const fullName = `${student.firstName} ${student.lastName}`;
                  return (
                    <article key={student.classId} className="flex flex-col items-center gap-4 text-center">
                      <div className="h-40 w-40 overflow-hidden rounded-full bg-stone-100 shadow-md sm:h-44 sm:w-44">
                        {student.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={student.photoUrl}
                            alt={`Portrait de ${fullName}`}
                            className="h-full w-full object-cover object-[center_18%]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-tran-mauve-900 to-tran-mustard-800 font-display text-3xl font-bold text-white">
                            {initials(student.firstName, student.lastName)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-display text-base font-semibold leading-snug text-stone-900">
                          {fullName}
                        </p>
                        <p className="mt-2 text-xs text-stone-600">
                          <span className="font-semibold text-stone-800">Classe</span> · {student.className}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-600">
                          <span className="font-semibold text-stone-800">Niveau</span> · {student.classLevel}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold tabular-nums text-tran-mustard-800">
                          <FiStar className="h-3.5 w-3.5" aria-hidden />
                          {Number(student.average).toFixed(2)}/20
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </HomeReveal>
    </section>
  );
}
