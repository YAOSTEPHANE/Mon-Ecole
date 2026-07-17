'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { parentApi, studentApi } from '../../services/api';
import Card from '../ui/Card';
import { FiCalendar, FiImage } from 'react-icons/fi';

type FeedFilter = 'all' | 'circular' | 'news' | 'events' | 'photos';

type PortalFeedItem =
  | {
      kind: 'announcement';
      sortAt: string;
      displayCategory: 'circular' | 'news' | 'gallery';
      data: Record<string, unknown>;
    }
  | { kind: 'calendar'; sortAt: string; data: Record<string, unknown> }
  | { kind: 'gallery'; sortAt: string; data: Record<string, unknown> };

const eventTypeLabel: Record<string, string> = {
  HOLIDAY: 'Jour férié',
  VACATION: 'Vacances',
  EXAM_PERIOD: 'Examens',
  MEETING: 'Réunion',
  OTHER: 'Événement',
};

function PortalSchoolFeed({ role, compact }: { role: 'parent' | 'student'; compact?: boolean }) {
  const api = role === 'parent' ? parentApi : studentApi;
  const [filter, setFilter] = useState<FeedFilter>('all');

  const { data: feed, isLoading } = useQuery({
    queryKey: ['portal-feed', role],
    queryFn: () => api.getPortalFeed(),
  });

  const items = useMemo(() => (Array.isArray(feed) ? (feed as PortalFeedItem[]) : []), [feed]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter === 'all') return true;
      if (filter === 'circular') return it.kind === 'announcement' && it.displayCategory === 'circular';
      if (filter === 'news') {
        return (
          it.kind === 'announcement' &&
          (it.displayCategory === 'news' || it.displayCategory === 'gallery')
        );
      }
      if (filter === 'events') return it.kind === 'calendar';
      if (filter === 'photos') return it.kind === 'gallery';
      return true;
    });
  }, [items, filter]);

  const chips: { id: FeedFilter; label: string }[] = [
    { id: 'all', label: 'Tout' },
    { id: 'circular', label: 'Circulaires' },
    { id: 'news', label: 'Actualités' },
    { id: 'events', label: 'Calendrier' },
    { id: 'photos', label: 'Galerie' },
  ];

  return (
    <Card className={`border border-slate-200/90 shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h3 className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
            Annonces & vie de l’école
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Circulaires officielles, actualités, événements du calendrier et photos publiées par l’administration.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              filter === c.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-slate-500 py-6 text-center">Aucun contenu pour ce filtre pour le moment.</p>
      )}

      {!isLoading && filtered.length > 0 && (
        <ul className="space-y-3 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
          {filtered.map((it) => {
            if (it.kind === 'calendar') {
              const e = it.data as {
                id: string;
                title: string;
                description?: string | null;
                type?: string;
                startDate: string;
                endDate: string;
                academicYear: string;
              };
              return (
                <li
                  key={`cal-${e.id}`}
                  className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 flex gap-3"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800">
                      {eventTypeLabel[e.type || 'OTHER'] || 'Événement'}
                    </span>
                    <p className="font-medium text-slate-900 text-sm">{e.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {format(new Date(e.startDate), 'd MMM yyyy', { locale: fr })}
                      {' — '}
                      {format(new Date(e.endDate), 'd MMM yyyy', { locale: fr })}
                      {e.academicYear ? ` · ${e.academicYear}` : ''}
                    </p>
                    {e.description ? (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-3 whitespace-pre-wrap">{e.description}</p>
                    ) : null}
                  </div>
                </li>
              );
            }

            if (it.kind === 'gallery') {
              const g = it.data as {
                id: string;
                title?: string | null;
                caption?: string | null;
                imageUrl: string;
              };
              return (
                <li
                  key={`gal-${g.id}`}
                  className="rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm"
                >
                  <div className="relative aspect-[16/9] max-h-48 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-3 flex gap-2">
                    <FiImage className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-emerald-800">Galerie</span>
                      {g.title ? <p className="font-medium text-slate-900 text-sm">{g.title}</p> : null}
                      {g.caption ? (
                        <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{g.caption}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            }

            const a = it.data as {
              id: string;
              title: string;
              content: string;
              publishedAt?: string | null;
              createdAt: string;
              coverImageUrl?: string | null;
              imageUrls?: string[];
              author?: { firstName?: string; lastName?: string };
              targetClass?: { name?: string } | null;
            };
            const label =
              it.displayCategory === 'circular'
                ? 'Circulaire'
                : it.displayCategory === 'gallery'
                  ? 'Galerie'
                  : 'Actualité';
            const badgeClass =
              it.displayCategory === 'circular'
                ? 'bg-rose-100 text-rose-900'
                : it.displayCategory === 'gallery'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-sky-100 text-sky-900';

            return (
              <li
                key={`ann-${a.id}`}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${badgeClass}`}>
                    {label}
                  </span>
                  {a.targetClass?.name ? (
                    <span className="text-[10px] text-slate-500">Classe : {a.targetClass.name}</span>
                  ) : null}
                </div>
                <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {format(new Date(a.publishedAt || a.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  {a.author
                    ? ` · ${a.author.firstName || ''} ${a.author.lastName || ''}`.trim()
                    : ''}
                </p>
                {a.coverImageUrl ? (
                  <div className="mt-2 rounded-lg overflow-hidden border border-slate-100 max-h-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.coverImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : null}
                <p className="text-xs text-slate-700 mt-2 line-clamp-4 whitespace-pre-wrap">{a.content}</p>
                {Array.isArray(a.imageUrls) && a.imageUrls.length > 0 ? (
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {a.imageUrls.slice(0, 6).map((url, idx) => (
                      <div key={idx} className="aspect-square rounded-md overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default PortalSchoolFeed;
