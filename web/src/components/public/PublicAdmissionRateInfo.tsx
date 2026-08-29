'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiAward, FiArrowUpRight } from 'react-icons/fi';
import { publicApi } from '@/services/api';

type PublicAdmissionRateInfoProps = {
  variant: 'chip' | 'stat';
  school?: string;
  className?: string;
};

const ROTATE_MS = 3800;

function formatRate(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

function useRotatingIndex(length: number, paused: boolean) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= length) setIndex(0);
  }, [index, length]);

  useEffect(() => {
    if (length <= 1 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [length, paused]);

  return index;
}

export default function PublicAdmissionRateInfo({
  variant,
  school,
  className = '',
}: PublicAdmissionRateInfoProps) {
  const [paused, setPaused] = useState(false);
  const { data } = useQuery({
    queryKey: ['public-academic-results', school ?? ''],
    queryFn: () => publicApi.getAcademicResults(school ? { school } : undefined),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const stats = data?.examStats ?? [];
  const index = useRotatingIndex(stats.length, paused);
  const active = stats[index] ?? stats[0];

  if (!active) return null;

  const displayYear = active.academicYear || data?.academicYear || '';
  const summary = stats
    .map((stat) => `${stat.examLabel} ${formatRate(stat.passRate)} % (${stat.academicYear || displayYear})`)
    .join(' · ');
  const ariaLabel = `Taux d’admission ${active.examLabel} ${displayYear} : ${formatRate(active.passRate)} pour cent`;
  const others = stats.filter((_, i) => i !== index);

  const pauseHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };

  const dots =
    stats.length > 1 ? (
      <span className="admission-lux-dots" aria-hidden>
        {stats.map((stat, i) => (
          <span
            key={`${stat.examLabel}-${i}`}
            className={i === index ? 'is-active' : undefined}
          />
        ))}
      </span>
    ) : null;

  if (variant === 'stat') {
    return (
      <a
        href="/home#resultats"
        className={`admission-lux-stat ${className}`.trim()}
        title={summary}
        aria-label={ariaLabel}
        {...pauseHandlers}
      >
        <span className="admission-lux-stat__sheen" aria-hidden />
        <span className="admission-lux-stat__glow" aria-hidden />
        <span className="admission-lux-stat__frame" aria-hidden />
        <span className="admission-lux-kicker">
          <span className="admission-lux-live" aria-hidden />
          Taux d’admission
        </span>
        <span className="admission-lux-stat__stage" aria-live="polite">
          {stats.map((stat, i) => (
            <span
              key={`${stat.examLabel}-${stat.passRate}`}
              className={`admission-lux-stat__slide ${i === index ? 'is-active' : ''}`}
              aria-hidden={i !== index}
            >
              <span className="admission-lux-stat__value font-sans font-extrabold tabular-nums tracking-tight">
                {formatRate(stat.passRate)}
                <span className="admission-lux-stat__unit font-sans font-extrabold tabular-nums">%</span>
              </span>
              <span className="admission-lux-exam">{stat.examLabel}</span>
              {displayYear ? (
                <span className="admission-lux-year">Session {displayYear}</span>
              ) : null}
            </span>
          ))}
        </span>
        <span className="admission-lux-stat__meta">
          <span className="admission-lux-stat__more">
            {displayYear ? `Session ${displayYear}` : 'Résultats officiels'}
            {others.length > 0
              ? ` · ${others
                  .slice(0, 2)
                  .map((stat) => `${stat.examLabel} ${formatRate(stat.passRate)} %`)
                  .join(' · ')}`
              : ''}
          </span>
          {dots}
        </span>
      </a>
    );
  }

  return (
    <a
      href="/home#resultats"
      className={`admission-lux-chip ${className}`.trim()}
      title={summary}
      aria-label={ariaLabel}
      {...pauseHandlers}
    >
      <span className="admission-lux-chip__sheen" aria-hidden />
      <span className="admission-lux-live" aria-hidden />
      <span className="admission-lux-chip__icon" aria-hidden>
        <FiAward />
      </span>
      <span className="admission-lux-chip__copy">
        <span className="admission-lux-chip__label">Taux d’admission</span>
        <span className="admission-lux-chip__stage" aria-live="polite">
          {stats.map((stat, i) => (
            <span
              key={`${stat.examLabel}-${stat.passRate}`}
              className={`admission-lux-chip__slide ${i === index ? 'is-active' : ''}`}
              aria-hidden={i !== index}
            >
              <span className="admission-lux-chip__exam">{stat.examLabel}</span>
              <em className="font-sans font-extrabold tabular-nums tracking-tight not-italic">{formatRate(stat.passRate)} %</em>
              {displayYear ? (
                <span className="admission-lux-chip__year">{displayYear}</span>
              ) : null}
            </span>
          ))}
        </span>
        {dots}
      </span>
      <FiArrowUpRight className="admission-lux-chip__arrow" aria-hidden />
    </a>
  );
}
