'use client';

import type { ReactNode } from 'react';
import type { AboutPageContentRecord, AboutTitleTextItem } from '@/lib/aboutPageContent';

type AboutPageContentPanelProps = {
  draft: AboutPageContentRecord;
  onChange: (next: AboutPageContentRecord) => void;
  onResetDefaults: () => void;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all';
const textareaClass = `${inputClass} resize-y`;

function updateAtout(
  list: AboutTitleTextItem[] | null | undefined,
  index: number,
  patch: Partial<AboutTitleTextItem>,
  fallbackLen: number,
): AboutTitleTextItem[] {
  const base = [...(list ?? Array.from({ length: fallbackLen }, () => ({ title: '', text: '' })))];
  while (base.length < fallbackLen) base.push({ title: '', text: '' });
  base[index] = { ...base[index], ...patch };
  return base;
}

export default function AboutPageContentPanel({
  draft,
  onChange,
  onResetDefaults,
}: AboutPageContentPanelProps) {
  const atouts = draft.atouts ?? [];
  const features = draft.platformFeatures ?? [];
  const goalsText = (draft.platformGoals ?? []).join('\n');

  return (
    <div className="p-4 sm:p-5 bg-amber-50/50 rounded-xl border-2 border-amber-200/80 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">Page À propos</p>
          <p className="text-xs text-gray-500 mt-1">
            Textes de la page publique <span className="font-medium">/a-propos</span>. Laissez un
            champ vide pour conserver la valeur par défaut à l’affichage après réinitialisation
            complète.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="shrink-0 text-sm font-semibold text-amber-800 hover:text-amber-950 underline-offset-2 hover:underline"
        >
          Réinitialiser aux défauts
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre du hero">
          <input
            type="text"
            value={draft.heroTitle ?? ''}
            onChange={(e) => onChange({ ...draft, heroTitle: e.target.value })}
            className={inputClass}
            maxLength={120}
          />
        </Field>
        <Field label="Tagline">
          <input
            type="text"
            value={draft.tagline ?? ''}
            onChange={(e) => onChange({ ...draft, tagline: e.target.value })}
            className={inputClass}
            maxLength={300}
          />
        </Field>
      </div>

      <Field
        label="Vision fondatrice"
        hint="Séparez les paragraphes par une ligne vide. Le dernier paragraphe est affiché en citation."
      >
        <textarea
          value={draft.founderParagraphs ?? ''}
          onChange={(e) => onChange({ ...draft, founderParagraphs: e.target.value })}
          rows={8}
          className={textareaClass}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Mission — titre">
          <input
            type="text"
            value={draft.missionTitle ?? ''}
            onChange={(e) => onChange({ ...draft, missionTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Valeurs — titre">
          <input
            type="text"
            value={draft.valuesTitle ?? ''}
            onChange={(e) => onChange({ ...draft, valuesTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Mission — texte">
          <textarea
            value={draft.missionText ?? ''}
            onChange={(e) => onChange({ ...draft, missionText: e.target.value })}
            rows={3}
            className={textareaClass}
          />
        </Field>
        <Field label="Valeurs — texte">
          <textarea
            value={draft.valuesText ?? ''}
            onChange={(e) => onChange({ ...draft, valuesText: e.target.value })}
            rows={3}
            className={textareaClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Chiffres — surtitre">
          <input
            type="text"
            value={draft.statsEyebrow ?? ''}
            onChange={(e) => onChange({ ...draft, statsEyebrow: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Chiffres — titre">
          <input
            type="text"
            value={draft.statsTitle ?? ''}
            onChange={(e) => onChange({ ...draft, statsTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Atouts — surtitre">
          <input
            type="text"
            value={draft.atoutsEyebrow ?? ''}
            onChange={(e) => onChange({ ...draft, atoutsEyebrow: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Atouts — titre">
          <input
            type="text"
            value={draft.atoutsTitle ?? ''}
            onChange={(e) => onChange({ ...draft, atoutsTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-800">Les 3 atouts</p>
        {[0, 1, 2].map((idx) => (
          <div
            key={`atout-${idx}`}
            className="rounded-xl border border-amber-200/70 bg-white/70 p-3 space-y-2"
          >
            <input
              type="text"
              value={atouts[idx]?.title ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  atouts: updateAtout(draft.atouts, idx, { title: e.target.value }, 3),
                })
              }
              className={inputClass}
              placeholder={`Atout ${idx + 1} — titre`}
            />
            <textarea
              value={atouts[idx]?.text ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  atouts: updateAtout(draft.atouts, idx, { text: e.target.value }, 3),
                })
              }
              rows={2}
              className={textareaClass}
              placeholder="Description"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        <Field label="Plateforme — badge">
          <input
            type="text"
            value={draft.platformBadge ?? ''}
            onChange={(e) => onChange({ ...draft, platformBadge: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Plateforme — titre">
          <input
            type="text"
            value={draft.platformTitle ?? ''}
            onChange={(e) => onChange({ ...draft, platformTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Plateforme — introduction">
          <textarea
            value={draft.platformIntro ?? ''}
            onChange={(e) => onChange({ ...draft, platformIntro: e.target.value })}
            rows={4}
            className={textareaClass}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-800">Fonctionnalités plateforme</p>
        {[0, 1, 2, 3, 4].map((idx) => (
          <div
            key={`feat-${idx}`}
            className="rounded-xl border border-amber-200/70 bg-white/70 p-3 space-y-2"
          >
            <input
              type="text"
              value={features[idx]?.title ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  platformFeatures: updateAtout(draft.platformFeatures, idx, { title: e.target.value }, 5),
                })
              }
              className={inputClass}
              placeholder={`Fonctionnalité ${idx + 1} — titre`}
            />
            <textarea
              value={features[idx]?.text ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  platformFeatures: updateAtout(draft.platformFeatures, idx, { text: e.target.value }, 5),
                })
              }
              rows={2}
              className={textareaClass}
              placeholder="Description"
            />
          </div>
        ))}
      </div>

      <Field label="Objectifs plateforme" hint="Un objectif par ligne.">
        <textarea
          value={goalsText}
          onChange={(e) =>
            onChange({
              ...draft,
              platformGoals: e.target.value
                .split(/\n+/)
                .map((l) => l.trim())
                .filter(Boolean),
            })
          }
          rows={4}
          className={textareaClass}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Personnel — surtitre">
          <input
            type="text"
            value={draft.staffEyebrow ?? ''}
            onChange={(e) => onChange({ ...draft, staffEyebrow: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Personnel — titre">
          <input
            type="text"
            value={draft.staffTitle ?? ''}
            onChange={(e) => onChange({ ...draft, staffTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Personnel — texte">
        <textarea
          value={draft.staffText ?? ''}
          onChange={(e) => onChange({ ...draft, staffText: e.target.value })}
          rows={3}
          className={textareaClass}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Établissements — surtitre">
          <input
            type="text"
            value={draft.campusesEyebrow ?? ''}
            onChange={(e) => onChange({ ...draft, campusesEyebrow: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Établissements — titre">
          <input
            type="text"
            value={draft.campusesTitle ?? ''}
            onChange={(e) => onChange({ ...draft, campusesTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Règlement — surtitre">
          <input
            type="text"
            value={draft.reglementEyebrow ?? ''}
            onChange={(e) => onChange({ ...draft, reglementEyebrow: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Règlement — titre">
          <input
            type="text"
            value={draft.reglementTitle ?? ''}
            onChange={(e) => onChange({ ...draft, reglementTitle: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Règlement — texte">
        <textarea
          value={draft.reglementText ?? ''}
          onChange={(e) => onChange({ ...draft, reglementText: e.target.value })}
          rows={3}
          className={textareaClass}
        />
      </Field>
    </div>
  );
}
