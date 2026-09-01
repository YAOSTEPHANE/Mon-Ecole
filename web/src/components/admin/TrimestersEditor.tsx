'use client';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { formatTrimesterRangeFr, type TrimesterFormRow } from '@/lib/academicTermDates';
import { useAcademicTrimestersEditor } from '@/hooks/useAcademicTrimestersEditor';
import { FiCalendar, FiSave } from 'react-icons/fi';

export type TrimestersEditorProps = {
  rows: TrimesterFormRow[];
  onRowsChange: (rows: TrimesterFormRow[]) => void;
  academicYear?: string;
  onAcademicYearChange?: (year: string) => void;
  showYearField?: boolean;
  showSaveButton?: boolean;
  onSave?: () => void | Promise<void>;
  isSaving?: boolean;
  compact?: boolean;
  embedded?: boolean;
  className?: string;
};

export function TrimestersEditor({
  rows,
  onRowsChange,
  academicYear,
  onAcademicYearChange,
  showYearField = false,
  showSaveButton = false,
  onSave,
  isSaving = false,
  compact = false,
  embedded = false,
  className = '',
}: TrimestersEditorProps) {
  const updateRow = (index: number, patch: Partial<TrimesterFormRow>) => {
    const next = [...rows];
    next[index] = { ...next[index]!, ...patch };
    onRowsChange(next);
  };

  const content = (
    <>
      <div className={`flex flex-col gap-3 ${showSaveButton ? 'sm:flex-row sm:items-start sm:justify-between' : ''}`}>
        <div>
          <h3
            className={
              compact
                ? 'text-sm font-bold text-gray-900 flex items-center gap-2'
                : 'text-base font-bold text-gray-900 flex items-center gap-2'
            }
          >
            <FiCalendar className="h-4 w-4 text-indigo-600 shrink-0" aria-hidden />
            Trimestres
          </h3>
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500 mt-1 leading-relaxed`}>
            Dates utilisées pour les bulletins, le palmarès et le rattachement des notes. Modifiez
            les dates de début et de fin ci-dessous.
          </p>
        </div>
        {showSaveButton && onSave ? (
          <Button
            type="button"
            size={compact ? 'sm' : 'md'}
            onClick={() => void onSave()}
            disabled={isSaving}
            className="shrink-0"
          >
            <FiSave className="w-4 h-4 mr-2 inline" />
            {isSaving ? 'Enregistrement…' : 'Enregistrer les trimestres'}
          </Button>
        ) : null}
      </div>

      {showYearField && academicYear != null && onAcademicYearChange ? (
        <div className={`${compact ? 'mt-3' : 'mt-4'} max-w-xs`}>
          <Input
            label="Année scolaire active"
            type="text"
            value={academicYear}
            onChange={(e) => onAcademicYearChange(e.target.value)}
            placeholder="2026-2027"
          />
        </div>
      ) : null}

      <div className={`space-y-3 ${compact ? 'mt-3' : 'mt-4'}`}>
        {rows.map((trimester, index) => (
          <div
            key={trimester.key}
            className="rounded-xl border-2 border-gray-200 bg-gray-50/80 p-3 sm:p-4"
          >
            <div className="mb-3">
              <p className="font-semibold text-gray-900">{trimester.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Période : {formatTrimesterRangeFr(trimester.start, trimester.end)}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Date de début"
                type="date"
                value={trimester.start}
                onChange={(e) => updateRow(index, { start: e.target.value })}
              />
              <Input
                label="Date de fin"
                type="date"
                value={trimester.end}
                onChange={(e) => updateRow(index, { end: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={`border border-gray-200 ${compact ? 'p-3' : 'p-4'} ${className}`}>
      {content}
    </Card>
  );
}

/** Éditeur autonome avec chargement / sauvegarde via l’API branding. */
export function TrimestersEditorStandalone({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  const { rows, setRows, academicYear, setAcademicYear, save, isSaving } =
    useAcademicTrimestersEditor();

  return (
    <TrimestersEditor
      rows={rows}
      onRowsChange={setRows}
      academicYear={academicYear}
      onAcademicYearChange={setAcademicYear}
      showYearField
      showSaveButton
      onSave={save}
      isSaving={isSaving}
      compact={compact}
      className={className}
    />
  );
}

export default TrimestersEditor;
