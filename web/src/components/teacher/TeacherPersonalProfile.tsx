'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi, authApi } from '../../services/api';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import ImageUpload from '../ui/ImageUpload';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { getTeacherEngagementKindLabel } from '@/lib/teacherEngagementKind';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiHash,
  FiCalendar,
  FiBriefcase,
  FiBook,
  FiSave,
  FiInfo,
  FiShield,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import GdprUserRightsPanel from '../gdpr/GdprUserRightsPanel';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TeacherPersonalProfile = () => {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: teacherApi.getProfile,
  });

  const [identity, setIdentity] = useState({ firstName: '', lastName: '', phone: '' });

  useEffect(() => {
    if (!profile?.user) return;
    setIdentity({
      firstName: profile.user.firstName ?? '',
      lastName: profile.user.lastName ?? '',
      phone: profile.user.phone ?? '',
    });
  }, [profile]);

  const isDirty = useMemo(() => {
    if (!profile?.user) return false;
    return (
      identity.firstName.trim() !== (profile.user.firstName ?? '').trim() ||
      identity.lastName.trim() !== (profile.user.lastName ?? '').trim() ||
      identity.phone.trim() !== (profile.user.phone ?? '').trim()
    );
  }, [profile, identity]);

  const saveMutation = useMutation({
    mutationFn: () =>
      authApi.updateMe({
        firstName: identity.firstName.trim(),
        lastName: identity.lastName.trim(),
        phone: identity.phone.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      toast.success('Informations enregistrées');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Enregistrement impossible'),
  });

  const avatarMutation = useMutation({
    mutationFn: (avatar: string) => authApi.updateMe({ avatar }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      toast.success('Photo mise à jour');
    },
    onError: () => toast.error('Erreur photo'),
  });

  if (isLoading || !profile) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
          <p className="mt-4 text-gray-600">Chargement du profil...</p>
        </div>
      </Card>
    );
  }

  const hire = profile.hireDate ? format(new Date(profile.hireDate), 'd MMMM yyyy', { locale: fr }) : '—';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 px-5 py-6 sm:px-8 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profil et informations personnelles</h1>
        <p className="mt-2 text-sm text-gray-600 max-w-3xl">
          Modifiez votre nom et vos coordonnées. Les données RH (matricule, contrat, spécialité) sont gérées par
          l&apos;administration.
        </p>
      </div>

      <Card className="border border-gray-200/80 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiUser className="w-5 h-5 text-emerald-600" />
            Identité & photo
          </h2>
        </div>
        <div className="p-5 sm:p-8 flex flex-col lg:flex-row gap-8">
          <div className="flex flex-col items-center lg:items-start">
            <Avatar
              src={profile.user.avatar}
              name={`${profile.user.firstName} ${profile.user.lastName}`}
              size="xl"
            />
            {authUser?.id === profile.user.id && (
              <div className="mt-4 w-full max-w-[220px]">
                <ImageUpload
                  currentImage={profile.user.avatar}
                  onUpload={(url) => avatarMutation.mutate(url)}
                  type="avatar"
                />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="t-firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  id="t-firstName"
                  value={identity.firstName}
                  onChange={(e) => setIdentity((s) => ({ ...s, firstName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="t-lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="t-lastName"
                  value={identity.lastName}
                  onChange={(e) => setIdentity((s) => ({ ...s, lastName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-2 max-w-md">
                <label htmlFor="t-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  id="t-phone"
                  type="tel"
                  value={identity.phone}
                  onChange={(e) => setIdentity((s) => ({ ...s, phone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
              {isDirty && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Modifications non enregistrées
                </p>
              )}
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !isDirty}
                isLoading={saveMutation.isPending}
                className="inline-flex items-center gap-2"
              >
                <FiSave className="w-4 h-4" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border border-gray-200/80">
        <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiShield className="w-5 h-5 text-gray-600" />
            Informations administratives (lecture seule)
          </h2>
        </div>
        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="flex gap-3">
            <FiMail className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">E-mail</p>
              <p className="font-medium text-gray-900 break-all">{profile.user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FiHash className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Matricule</p>
              <p className="font-mono font-semibold text-gray-900">{profile.employeeId}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FiBriefcase className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Spécialité / discipline</p>
              <p className="font-medium text-gray-900">{profile.specialization}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FiCalendar className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Date d&apos;embauche</p>
              <p className="font-medium text-gray-900">{hire}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FiBriefcase className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Statut</p>
              <p className="font-medium text-gray-900">
                {getTeacherEngagementKindLabel(profile.engagementKind)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <FiBook className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Contrat</p>
              <p className="font-medium text-gray-900">{profile.contractType}</p>
            </div>
          </div>
        </div>
        <div className="px-5 sm:px-6 pb-6">
          <p className="text-xs text-gray-500 flex items-start gap-2">
            <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
            Pour modifier le matricule, le contrat ou l&apos;affectation, contactez la direction ou les RH.
          </p>
        </div>
      </Card>

      {profile.classes && profile.classes.length > 0 && (
        <Card>
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FiBook className="w-5 h-5 text-emerald-600" />
            Classes dont vous êtes professeur principal
          </h3>
          <ul className="flex flex-wrap gap-2">
            {profile.classes.map((c: { id: string; name: string; level: string }) => (
              <li
                key={c.id}
                className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 text-sm font-medium border border-emerald-100"
              >
                {c.name} <span className="text-emerald-700">({c.level})</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <GdprUserRightsPanel />
    </div>
  );
};

export default TeacherPersonalProfile;
