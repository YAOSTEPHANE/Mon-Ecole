'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { adminApi } from '@/services/api';
import { getCurrentAcademicYear } from '@/utils/academicYear';
import {
  parseAcademicTermDatesFromForm,
  trimesterFormRowsFromConfig,
  type TrimesterFormRow,
} from '@/lib/academicTermDates';

export function validateAcademicYearLabel(year: string): boolean {
  const trimmed = year.trim();
  if (!/^\d{4}-\d{4}$/.test(trimmed)) return false;
  const [startYear, endYear] = trimmed.split('-').map((v) => parseInt(v, 10));
  return endYear === startYear + 1;
}

export function useAcademicTrimestersEditor() {
  const { branding, refreshBranding } = useAppBranding();
  const resolvedYear = branding.currentAcademicYear?.trim() || getCurrentAcademicYear();

  const [academicYear, setAcademicYearState] = useState(resolvedYear);
  const [rows, setRows] = useState<TrimesterFormRow[]>(() =>
    trimesterFormRowsFromConfig(branding.academicTermDates, resolvedYear),
  );

  useEffect(() => {
    const year = branding.currentAcademicYear?.trim() || getCurrentAcademicYear();
    setAcademicYearState(year);
    setRows(trimesterFormRowsFromConfig(branding.academicTermDates, year));
  }, [branding.academicTermDates, branding.currentAcademicYear]);

  const setAcademicYear = useCallback((year: string) => {
    setAcademicYearState(year);
    setRows((prev) => {
      const config = parseAcademicTermDatesFromForm(prev);
      return trimesterFormRowsFromConfig(config, year);
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const year = academicYear.trim();
      if (!validateAcademicYearLabel(year)) {
        throw new Error('Année scolaire invalide. Format attendu : 2026-2027');
      }
      await adminApi.updateAppBranding({
        currentAcademicYear: year,
        academicTermDates: parseAcademicTermDatesFromForm(rows),
      });
      await refreshBranding();
    },
    onSuccess: () => toast.success('Trimestres enregistrés'),
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des trimestres';
      toast.error(message);
    },
  });

  return {
    rows,
    setRows,
    academicYear,
    setAcademicYear,
    save: () => saveMutation.mutateAsync(),
    isSaving: saveMutation.isPending,
  };
}
