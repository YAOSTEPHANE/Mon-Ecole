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

function isTechnicalTitle(title: string | null | undefined): boolean {
  const value = (title || '').trim();
  if (!value) return true;
  return /^(persist|seed|test|id)[-_]/i.test(value) || /^[A-Z0-9_-]{18,}$/.test(value);
}

function humanizeTitle(title: string | null | undefined, fallback: string): string {
  const value = (title || '').trim();
  if (isTechnicalTitle(value)) return fallback;
  return value;
}

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

  const visible = compact ? filtered.slice(0, 3) : filtered;

  const chips: { id: FeedFilter; label: string }[] = [
    { id: 'all', label: 'Tout' },
    { id: 'circular', label: 'Circulaires' },
    { id: 'news', label: 'Actualités' },
    { id: 'events', label: 'Calendrier' },
    { id: 'photos', label: 'Galerie' },
  ];

  const body = (
    <>
      <div className="mb-3">
        <h3 className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
          Vie de l’école
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {compact
            ? 'Prochains événements et annonces'
            : 'Circulaires, actualités, calendrier et photos publiées par l’administration.'}
        </p>
      </div>
      {!compact ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
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
      ) : null}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!isLoading && visible.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">Aucun contenu pour le moment.</p>
      )}

      {!isLoading && visible.length > 0 && (
        <ul className={`space-y-2.5 pr-1 ${compact ? '' : 'max-h-[min(70vh,520px)] overflow-y-auto'}`}>
          {visible.map((it) => {
            if (it.kind === 'calendar') {
              const e = it.data as {
                id: string;
                title: string;
                description?: string | null;
                type?: string;
                startDate: string;
                endDate: string;
              };
              const typeLabel = eventTypeLabel[e.type || 'OTHER'] || 'Événement';
              return (
                <li key={`cal-${e.id}`} className="flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <FiCalendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800">
                      {typeLabel}
                    </span>
                    <p className="text-sm font-medium text-slate-900">{humanizeTitle(e.title, typeLabel)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {format(new Date(e.startDate), 'd MMM yyyy', { locale: fr })}
                      {' — '}
                      {format(new Date(e.endDate), 'd MMM yyyy', { locale: fr })}
                    </p>
                    {!compact && e.description ? (
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-slate-600">
                        {e.description}
                      </p>
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
                  className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm"
                >
                  {!compact ? (
                    <div className="relative aspect-[16/9] max-h-48 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : null}
                  <div className="flex gap-2 p-3">
                    <FiImage className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-emerald-800">Galerie</span>
                      <p className="text-sm font-medium text-slate-900">
                        {humanizeTitle(g.title, 'Photo de l’établissement')}
                      </p>
                      {!compact && g.caption ? (
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">{g.caption}</p>
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
              <li key={`ann-${a.id}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badgeClass}`}>
                    {label}
                  </span>
                  {a.targetClass?.name ? (
                    <span className="text-[10px] text-slate-500">Classe : {a.targetClass.name}</span>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-slate-900">{humanizeTitle(a.title, label)}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {format(new Date(a.publishedAt || a.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
                {!compact && a.coverImageUrl ? (
                  <div className="mt-2 max-h-40 overflow-hidden rounded-lg border border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                ) : null}
                <p className={`mt-2 whitespace-pre-wrap text-xs text-slate-700 ${compact ? 'line-clamp-2' : 'line-clamp-4'}`}>
                  {a.content}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (compact) {
    return <div>{body}</div>;
  }

  return <Card className="border border-slate-200/90 p-4 shadow-sm">{body}</Card>;
}

export default PortalSchoolFeed;
