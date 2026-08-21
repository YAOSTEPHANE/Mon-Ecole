'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiAward, FiCalendar, FiGift, FiRotateCcw, FiUsers } from 'react-icons/fi';
import { adminApi } from '@/services/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { ADM } from './adminModuleLayout';

type MainTab = 'profiles' | 'events' | 'donations' | 'reintegrate';
type StatusFilter = 'ARCHIVED' | 'GRADUATED';

type StudentRow = {
  id: string;
  studentId?: string;
  enrollmentStatus?: string;
  archivedAt?: string | null;
  user?: { firstName?: string; lastName?: string; email?: string };
  class?: { name?: string; level?: string } | null;
};

type AlumniProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  graduationYear?: number | null;
  currentJob?: string | null;
  company?: string | null;
};

const STATUS_LABEL: Record<StatusFilter, string> = {
  ARCHIVED: 'Archivés',
  GRADUATED: 'Diplômés',
};

export default function AlumniAdminModule() {
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState<MainTab>('profiles');
  const [reTab, setReTab] = useState<StatusFilter>('ARCHIVED');
  const [q, setQ] = useState('');
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    graduationYear: String(new Date().getFullYear()),
    currentJob: '',
    company: '',
  });
  const [eventForm, setEventForm] = useState({ title: '', eventDate: '', location: '' });
  const [donationForm, setDonationForm] = useState({ amount: '', note: '', alumniProfileId: '' });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin-alumni-profiles'],
    queryFn: () => adminApi.getAlumniProfiles(),
    enabled: mainTab === 'profiles' || mainTab === 'donations',
  });

  const { data: events = [] } = useQuery({
    queryKey: ['admin-alumni-events'],
    queryFn: () => adminApi.getAlumniEvents(),
    enabled: mainTab === 'events',
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['admin-alumni-donations'],
    queryFn: () => adminApi.getAlumniDonations(),
    enabled: mainTab === 'donations',
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin-alumni-students', reTab],
    queryFn: () => adminApi.getStudents({ enrollmentStatus: reTab }),
    enabled: mainTab === 'reintegrate',
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

  const syncMut = useMutation({
    mutationFn: () => adminApi.syncAlumniFromGraduated(),
    onSuccess: (r: { created?: number }) => {
      toast.success(`${r.created ?? 0} profil(s) alumni créé(s)`);
      qc.invalidateQueries({ queryKey: ['admin-alumni-profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createProfileMut = useMutation({
    mutationFn: () =>
      adminApi.createAlumniProfile({
        ...profileForm,
        graduationYear: Number(profileForm.graduationYear) || undefined,
      }),
    onSuccess: () => {
      toast.success('Profil créé');
      setProfileForm({
        firstName: '',
        lastName: '',
        email: '',
        graduationYear: String(new Date().getFullYear()),
        currentJob: '',
        company: '',
      });
      qc.invalidateQueries({ queryKey: ['admin-alumni-profiles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createEventMut = useMutation({
    mutationFn: () => adminApi.createAlumniEvent(eventForm),
    onSuccess: () => {
      toast.success('Événement créé');
      setEventForm({ title: '', eventDate: '', location: '' });
      qc.invalidateQueries({ queryKey: ['admin-alumni-events'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDonationMut = useMutation({
    mutationFn: () =>
      adminApi.createAlumniDonation({
        amount: Number(donationForm.amount),
        note: donationForm.note || undefined,
        alumniProfileId: donationForm.alumniProfileId || undefined,
      }),
    onSuccess: () => {
      toast.success('Don enregistré');
      setDonationForm({ amount: '', note: '', alumniProfileId: '' });
      qc.invalidateQueries({ queryKey: ['admin-alumni-donations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unarchiveMut = useMutation({
    mutationFn: (id: string) => adminApi.unarchiveStudent(id),
    onSuccess: () => {
      toast.success('Élève réintégré');
      qc.invalidateQueries({ queryKey: ['admin-alumni-students'] });
      qc.invalidateQueries({ queryKey: ['admin-students'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Réintégration impossible'),
  });

  const tabs: { id: MainTab; label: string; icon: typeof FiUsers }[] = [
    { id: 'profiles', label: 'Profils', icon: FiUsers },
    { id: 'events', label: 'Événements', icon: FiCalendar },
    { id: 'donations', label: 'Dons', icon: FiGift },
    { id: 'reintegrate', label: 'Réintégration', icon: FiRotateCcw },
  ];

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>
          <span className="inline-flex items-center gap-2">
            <FiAward className="h-5 w-5 text-cptb-gold" />
            Anciens élèves — CRM
          </span>
        </h2>
        <p className={ADM.intro}>
          Profils alumni, événements, dons et réintégration des dossiers archivés / diplômés.
        </p>
      </div>

      <div className={ADM.tabRow} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={mainTab === t.id}
            className={ADM.tabBtn(mainTab === t.id)}
            onClick={() => setMainTab(t.id)}
          >
            <t.icon className="mr-1 inline h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
              Synchroniser diplômés → profils
            </Button>
          </div>
          <Card className="grid gap-2 p-4 sm:grid-cols-3">
            <Input
              label="Prénom"
              value={profileForm.firstName}
              onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
            />
            <Input
              label="Nom"
              value={profileForm.lastName}
              onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
            />
            <Input
              label="E-mail"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
            <Input
              label="Année dipl."
              value={profileForm.graduationYear}
              onChange={(e) => setProfileForm({ ...profileForm, graduationYear: e.target.value })}
            />
            <Input
              label="Poste"
              value={profileForm.currentJob}
              onChange={(e) => setProfileForm({ ...profileForm, currentJob: e.target.value })}
            />
            <Input
              label="Entreprise"
              value={profileForm.company}
              onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
            />
            <Button
              size="sm"
              className="self-end"
              onClick={() => createProfileMut.mutate()}
              disabled={createProfileMut.isPending}
            >
              Ajouter
            </Button>
          </Card>
          {loadingProfiles ? (
            <Card className="p-6 text-center text-gray-500">Chargement…</Card>
          ) : (
            <div className="space-y-2">
              {(profiles as AlumniProfile[]).map((p) => (
                <Card key={p.id} className="p-3">
                  <p className="font-medium">
                    {p.firstName} {p.lastName}
                    {p.graduationYear ? (
                      <span className="ml-2 text-sm text-gray-500">promo {p.graduationYear}</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-gray-600">
                    {[p.currentJob, p.company, p.email, p.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {mainTab === 'events' && (
        <div className="space-y-4">
          <Card className="grid gap-2 p-4 sm:grid-cols-3">
            <Input
              label="Titre"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            />
            <Input
              label="Date"
              type="datetime-local"
              value={eventForm.eventDate}
              onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
            />
            <Input
              label="Lieu"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            />
            <Button size="sm" className="self-end" onClick={() => createEventMut.mutate()}>
              Créer
            </Button>
          </Card>
          {(events as Array<{ id: string; title: string; eventDate: string; location?: string; _count?: { registrations: number } }>).map(
            (ev) => (
              <Card key={ev.id} className="p-3">
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(ev.eventDate), 'dd MMM yyyy HH:mm', { locale: fr })}
                  {ev.location ? ` · ${ev.location}` : ''}
                  {ev._count ? ` · ${ev._count.registrations} inscrit(s)` : ''}
                </p>
              </Card>
            ),
          )}
        </div>
      )}

      {mainTab === 'donations' && (
        <div className="space-y-4">
          <Card className="grid gap-2 p-4 sm:grid-cols-3">
            <Input
              label="Montant"
              value={donationForm.amount}
              onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
            />
            <label className="text-sm">
              <span className="mb-1 block text-gray-600">Donateur (optionnel)</span>
              <select
                className="w-full rounded-lg border px-3 py-2"
                value={donationForm.alumniProfileId}
                onChange={(e) => setDonationForm({ ...donationForm, alumniProfileId: e.target.value })}
              >
                <option value="">—</option>
                {(profiles as AlumniProfile[]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Note"
              value={donationForm.note}
              onChange={(e) => setDonationForm({ ...donationForm, note: e.target.value })}
            />
            <Button size="sm" className="self-end" onClick={() => createDonationMut.mutate()}>
              Enregistrer
            </Button>
          </Card>
          {(donations as Array<{ id: string; amount: number; currency: string; donatedAt: string; note?: string; profile?: AlumniProfile }>).map(
            (d) => (
              <Card key={d.id} className="p-3">
                <p className="font-medium">
                  {d.amount} {d.currency}
                  {d.profile ? ` — ${d.profile.firstName} ${d.profile.lastName}` : ''}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(d.donatedAt), 'dd/MM/yyyy', { locale: fr })}
                  {d.note ? ` · ${d.note}` : ''}
                </p>
              </Card>
            ),
          )}
        </div>
      )}

      {mainTab === 'reintegrate' && (
        <div className="space-y-4">
          <div className={ADM.tabRow}>
            {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((id) => (
              <button
                key={id}
                type="button"
                className={ADM.tabBtn(reTab === id)}
                onClick={() => setReTab(id)}
              >
                {STATUS_LABEL[id]}
              </button>
            ))}
          </div>
          <Input label="Recherche" value={q} onChange={(e) => setQ(e.target.value)} />
          {isLoading ? (
            <Card className="p-6 text-center text-gray-500">Chargement…</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">Aucun dossier</Card>
          ) : (
            filtered.map((s) => (
              <Card key={s.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium">
                    {s.user?.firstName} {s.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{s.class?.name}</p>
                </div>
                {reTab === 'ARCHIVED' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => unarchiveMut.mutate(s.id)}
                    disabled={unarchiveMut.isPending}
                  >
                    <FiRotateCcw className="mr-1 inline" />
                    Réintégrer
                  </Button>
                ) : null}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
