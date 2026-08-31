'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FiAward, FiStar, FiArrowRight } from 'react-icons/fi';
import { publicApi } from '@/services/api';
import HomeReveal from './HomeReveal';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function HomeAcademicResultsSection() {
  const { data, isPending } = useQuery({
    queryKey: ['public-academic-results', ''],
    queryFn: () => publicApi.getAcademicResults(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
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
              className="mt-4 font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]"
            >
              <span className="home-title-lux">Réussites et palmarès</span>
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
                  className="overflow-hidden rounded-3xl border border-tran-mustard-200/70 bg-tran-mauve-950 p-5 text-center text-white shadow-xl sm:p-7"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tran-mustard-200">
                    {stat.examLabel}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold tabular-nums text-tran-mustard-100/90">
                    Session {stat.academicYear || data?.academicYear}
                  </p>
                  <p className="mt-3 font-sans text-4xl font-extrabold tabular-nums tracking-tight text-white sm:text-5xl">
                    {stat.passRate.toLocaleString('fr-FR')}
                    <span className="ml-1 text-2xl font-bold tracking-normal text-tran-mustard-200">%</span>
                  </p>
                  <p className="mt-2 text-xs font-medium text-stone-300">Taux d’admission</p>
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

              <ul className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 xl:grid-cols-7 [&::-webkit-scrollbar]:hidden">
                {honorStudents.map((student) => {
                  const fullName = `${student.firstName} ${student.lastName}`;
                  return (
                    <li key={student.classId} className="w-[10.5rem] shrink-0 snap-center sm:w-auto">
                      <article className="group flex flex-col items-center text-center">
                        <div className="relative">
                          <div
                            className="absolute -inset-1 rounded-full bg-tran-mustard-500 opacity-95 shadow-[0_10px_28px_-10px_rgba(28,39,76,0.45)] transition duration-500 group-hover:opacity-100"
                            aria-hidden
                          />
                          <div className="relative h-40 w-40 overflow-hidden rounded-full bg-stone-200 ring-[3px] ring-white transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:scale-[1.04] sm:h-44 sm:w-44">
                            {student.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={student.photoUrl}
                                alt={`Portrait de ${fullName}`}
                                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out motion-safe:group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#8a6a3d] font-display text-3xl font-bold text-white">
                                {initials(student.firstName, student.lastName)}
                              </div>
                            )}
                          </div>
                          <span className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-full border border-tran-mustard-300/70 bg-tran-mauve-950 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-tran-mustard-200 shadow-md">
                            1<sup className="normal-case">er</sup>
                          </span>
                        </div>

                        <div className="mt-5">
                          <p className="font-display text-base font-semibold leading-snug text-stone-900">
                            {fullName}
                          </p>
                          <p className="mt-1.5 text-xs text-stone-500">
                            {student.className}
                            <span className="mx-1 text-stone-300" aria-hidden>
                              ·
                            </span>
                            {student.classLevel}
                          </p>
                          <p className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-tran-mustard-50 px-2.5 py-1 text-sm font-bold tabular-nums text-tran-mustard-900 ring-1 ring-tran-mustard-200/70">
                            <FiStar className="h-3.5 w-3.5 text-tran-mustard-600" aria-hidden />
                            {Number(student.average).toFixed(2)}
                            <span className="text-xs font-semibold text-tran-mustard-700/80">/20</span>
                          </p>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="mt-10 flex justify-center">
            <Link
              href="/examens-blancs"
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-amber-300/80 hover:bg-amber-50/60"
            >
              Consulter les notes d’examens blancs
              <FiArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </HomeReveal>
    </section>
  );
}
