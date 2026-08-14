'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiFileText, FiPrinter } from 'react-icons/fi';
import { adminApi } from '@/services/api';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { useSchool } from '@/contexts/SchoolContext';
import { resolveSchoolContactInfo } from '@/lib/schoolContact';
import {
  printSchoolCertificate,
  SCHOOL_CERTIFICATE_KIND_LABELS,
  type SchoolCertificateKind,
} from '@/lib/schoolCertificatePrint';
import { getCurrentAcademicYear } from '@/utils/academicYear';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { ADM } from './adminModuleLayout';

type StudentRow = {
  id: string;
  studentId?: string;
  dateOfBirth?: string;
  gender?: string;
  enrollmentStatus?: string;
  user?: { firstName?: string; lastName?: string };
  class?: { name?: string; level?: string } | null;
};

const KINDS = Object.entries(SCHOOL_CERTIFICATE_KIND_LABELS) as [
  SchoolCertificateKind,
  string,
][];

const selectClass =
  'mt-1 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm focus:border-cptb-gold/55 focus:outline-none focus:ring-2 focus:ring-cptb-gold/40';

function formatBirth(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return format(d, 'd MMMM yyyy', { locale: fr });
}

export default function CertificatesAdminModule() {
  const { branding } = useAppBranding();
  const { activeSchool } = useSchool();
  const contact = resolveSchoolContactInfo(branding);
  const [kind, setKind] = useState<SchoolCertificateKind>('SCOLARITE');
  const [studentId, setStudentId] = useState('');
  const [q, setQ] = useState('');
  const year = getCurrentAcademicYear();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin-certificate-students'],
    queryFn: () => adminApi.getStudents(),
  });

  const list = students as StudentRow[];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((s) => {
      const hay = `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''} ${s.studentId ?? ''} ${s.class?.name ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [list, q]);

  const selected = list.find((s) => s.id === studentId);

  const printSelected = () => {
    if (!selected) {
      toast.error('Sélectionnez un élève');
      return;
    }
    printSchoolCertificate({
      kind,
      schoolName: activeSchool?.name || contact.name,
      schoolAddress: contact.address,
      schoolCode: branding.schoolCode,
      principal: contact.principal,
      academicYear: year,
      studentName: `${selected.user?.firstName ?? ''} ${selected.user?.lastName ?? ''}`.trim(),
      studentId: selected.studentId || selected.id,
      className: selected.class?.name,
      classLevel: selected.class?.level,
      dateOfBirth: formatBirth(selected.dateOfBirth),
      gender: selected.gender,
    });
  };

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>
          <span className="inline-flex items-center gap-2">
            <FiFileText className="h-5 w-5 text-cptb-gold" />
            Certificats & attestations
          </span>
        </h2>
        <p className={ADM.intro}>
          Attestations de scolarité, de fréquentation, de radiation ou de réussite — à imprimer
          ou enregistrer en PDF depuis le navigateur.
        </p>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold tracking-wide text-stone-800">
              Type de document
            </label>
            <select
              aria-label="Type de certificat"
              className={selectClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as SchoolCertificateKind)}
            >
              {KINDS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Rechercher un élève"
            placeholder="Nom, matricule, classe"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold tracking-wide text-stone-800">Élève</label>
          <select
            aria-label="Élève du certificat"
            className={selectClass}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {filtered.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user?.lastName} {s.user?.firstName}
                {s.studentId ? ` · ${s.studentId}` : ''}
                {s.class?.name ? ` · ${s.class.name}` : ''}
              </option>
            ))}
          </select>
          {isLoading && <p className="mt-1.5 text-xs text-stone-500">Chargement des élèves…</p>}
        </div>

        {selected && (
          <div className="rounded-2xl bg-stone-50/80 p-4 text-sm ring-1 ring-stone-200/70">
            <p className="font-semibold text-stone-900">
              {selected.user?.firstName} {selected.user?.lastName}
            </p>
            <p className="mt-1 text-stone-600">
              Matricule {selected.studentId ?? '—'} · {selected.class?.name ?? 'Sans classe'}
              {selected.enrollmentStatus && selected.enrollmentStatus !== 'ACTIVE'
                ? ` · ${selected.enrollmentStatus}`
                : ''}
            </p>
          </div>
        )}

        <Button type="button" size="sm" onClick={printSelected} disabled={!selected}>
          <span className="inline-flex items-center gap-2">
            <FiPrinter className="h-4 w-4" />
            Imprimer {SCHOOL_CERTIFICATE_KIND_LABELS[kind].toLowerCase()}
          </span>
        </Button>
      </Card>
    </div>
  );
}
