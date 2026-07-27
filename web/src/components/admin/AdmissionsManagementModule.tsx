'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FiUserPlus, FiRefreshCw } from 'react-icons/fi';
import { adminApi } from '../../services/api';
import { ADM } from './adminModuleLayout';
import AdmissionsManagement from './AdmissionsManagement';
import StudentReenrollmentRequestsPanel from './StudentReenrollmentRequestsPanel';

type AdmissionsTab = 'preinscriptions' | 'reenrollments';

export default function AdmissionsManagementModule() {
  const searchParams = useSearchParams();
  const initial = searchParams?.get('admissionsTab');
  const [tab, setTab] = useState<AdmissionsTab>(() =>
    initial === 'reenrollments' ? 'reenrollments' : 'preinscriptions',
  );

  useEffect(() => {
    if (initial === 'reenrollments' || initial === 'preinscriptions') {
      setTab(initial);
    }
  }, [initial]);

  const { data: reenrollmentStats } = useQuery({
    queryKey: ['admin-reenrollment-request-stats'],
    queryFn: () => adminApi.getReenrollmentRequestStats(),
    staleTime: 30_000,
  });

  const pendingReenrollments = reenrollmentStats?.pending ?? 0;

  return (
    <div className={ADM.root}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('preinscriptions')}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border transition ${
            tab === 'preinscriptions'
              ? 'border-violet-600 bg-violet-600 text-white'
              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
          }`}
        >
          <FiUserPlus className="h-4 w-4" />
          Pré-inscriptions
        </button>
        <button
          type="button"
          onClick={() => setTab('reenrollments')}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium border transition ${
            tab === 'reenrollments'
              ? 'border-violet-600 bg-violet-600 text-white'
              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
          }`}
        >
          <FiRefreshCw className="h-4 w-4" />
          Réinscriptions
          {pendingReenrollments > 0 ? (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                tab === 'reenrollments' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {pendingReenrollments}
            </span>
          ) : null}
        </button>
      </div>

      {tab === 'preinscriptions' ? <AdmissionsManagement /> : <StudentReenrollmentRequestsPanel />}
    </div>
  );
}
