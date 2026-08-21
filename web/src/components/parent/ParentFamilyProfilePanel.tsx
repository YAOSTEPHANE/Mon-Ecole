'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parentFamilyPortalApi } from '../../services/api/parent-family-portal.api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { FiSave, FiPlus, FiTrash2, FiHeart } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CHANNEL_LABEL: Record<string, string> = {
  PHONE: 'Téléphone',
  EMAIL: 'E-mail',
  SMS: 'SMS',
  MEETING: 'Entretien',
  PORTAL_MESSAGE: 'Message portail',
  WHATSAPP: 'WhatsApp',
  OTHER: 'Autre',
};

const CONSENT_TYPES = [
  'IMAGE_PUBLICATION',
  'SCHOOL_TRIP',
  'MEDICAL_EMERGENCY',
  'DATA_PROCESSING',
  'COMMUNICATION_CHANNELS',
  'AUTHORIZED_PICKUP_POLICY',
] as const;

const CONSENT_LABEL: Record<string, string> = {
  IMAGE_PUBLICATION: 'Publication d’images',
  SCHOOL_TRIP: 'Sorties / voyages',
  MEDICAL_EMERGENCY: 'Urgences médicales',
  DATA_PROCESSING: 'Traitement des données',
  COMMUNICATION_CHANNELS: 'Canaux de communication',
  AUTHORIZED_PICKUP_POLICY: 'Politique de récupération',
};

type PickupDraft = {
  authorizedName: string;
  relationship: string;
  phone: string;
  identityNote: string;
  validFrom: string;
  validUntil: string;
};

const PICKUP_EMPTY: PickupDraft = {
  authorizedName: '',
  relationship: '',
  phone: '',
  identityNote: '',
  validFrom: '',
  validUntil: '',
};

const ParentFamilyProfilePanel: React.FC = () => {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['parent-my-profile'],
    queryFn: parentFamilyPortalApi.getMyProfile,
  });

  const [draft, setDraft] = useState({
    profession: '',
    preferredLocale: '',
    notifyEmail: true,
    notifySms: false,
    notifyWhatsApp: true,
    portalShowFees: true,
    portalShowGrades: true,
    portalShowAttendance: true,
  });

  useEffect(() => {
    if (!profile) return;
    const p = profile as Record<string, unknown>;
    setDraft({
      profession: (p.profession as string) ?? '',
      preferredLocale: (p.preferredLocale as string) ?? '',
      notifyEmail: Boolean(p.notifyEmail),
      notifySms: Boolean(p.notifySms),
      notifyWhatsApp: p.notifyWhatsApp === undefined ? true : Boolean(p.notifyWhatsApp),
      portalShowFees: Boolean(p.portalShowFees),
      portalShowGrades: Boolean(p.portalShowGrades),
      portalShowAttendance: Boolean(p.portalShowAttendance),
    });
  }, [profile]);

  const [newContact, setNewContact] = useState({ label: '', phone: '', email: '' });
  const [consentForm, setConsentForm] = useState({
    consentType: 'DATA_PROCESSING' as string,
    studentId: '' as string,
    granted: true,
    policyVersion: '',
    notes: '',
  });
  const [pickupByStudent, setPickupByStudent] = useState<Record<string, PickupDraft>>({});

  const studentOptions = useMemo(() => {
    const links = ((profile as any)?.students as any[]) ?? [];
    return links
      .map((sp: any) => ({
        id: sp.student?.id as string,
        label: `${sp.student?.user?.firstName ?? ''} ${sp.student?.user?.lastName ?? ''}`.trim(),
      }))
      .filter((s: { id: string }) => Boolean(s.id));
  }, [profile]);

  useEffect(() => {
    setPickupByStudent((prev) => {
      const next: Record<string, PickupDraft> = { ...prev };
      for (const s of studentOptions) {
        if (!next[s.id]) next[s.id] = { ...PICKUP_EMPTY };
      }
      return next;
    });
  }, [studentOptions]);

  const saveProfileMut = useMutation({
    mutationFn: () =>
      parentFamilyPortalApi.updateMyProfile({
        profession: draft.profession || null,
        preferredLocale: draft.preferredLocale || null,
        notifyEmail: draft.notifyEmail,
        notifySms: draft.notifySms,
        notifyWhatsApp: draft.notifyWhatsApp,
        portalShowFees: draft.portalShowFees,
        portalShowGrades: draft.portalShowGrades,
        portalShowAttendance: draft.portalShowAttendance,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-my-profile'] });
      toast.success('Préférences enregistrées');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const addContactMut = useMutation({
    mutationFn: () =>
      parentFamilyPortalApi.addMyContact({
        label: newContact.label.trim(),
        phone: newContact.phone || null,
        email: newContact.email || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-my-profile'] });
      setNewContact({ label: '', phone: '', email: '' });
      toast.success('Contact ajouté');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const delContactMut = useMutation({
    mutationFn: (id: string) => parentFamilyPortalApi.deleteMyContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-my-profile'] });
      toast.success('Contact supprimé');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const upsertConsentMut = useMutation({
    mutationFn: () =>
      parentFamilyPortalApi.upsertMyConsent({
        consentType: consentForm.consentType,
        granted: consentForm.granted,
        policyVersion: consentForm.policyVersion || null,
        notes: consentForm.notes || null,
        studentId: consentForm.studentId ? consentForm.studentId : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-my-profile'] });
      toast.success('Consentement enregistré');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const addPickupMut = useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: PickupDraft }) =>
      parentFamilyPortalApi.addChildPickupAuthorization(studentId, {
        authorizedName: data.authorizedName.trim(),
        relationship: data.relationship || null,
        phone: data.phone || null,
        identityNote: data.identityNote || null,
        validFrom: data.validFrom || null,
        validUntil: data.validUntil || null,
      }),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['parent-my-profile'] });
      setPickupByStudent((p) => ({
        ...p,
        [studentId]: { ...PICKUP_EMPTY },
      }));
      toast.success('Personne ajoutée');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const delPickupMut = useMutation({
    mutationFn: ({ studentId, pickupId }: { studentId: string; pickupId: string }) =>
      parentFamilyPortalApi.deleteChildPickupAuthorization(studentId, pickupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-my-profile'] });
      toast.success('Autorisation retirée');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  if (isLoading || !profile) {
    return (
      <Card>
        <p className="text-sm text-stone-500 py-8 text-center">Chargement de votre profil…</p>
      </Card>
    );
  }

  const user = (profile as any).user;
  const contacts = ((profile as any).contacts as any[]) ?? [];
  const logs = ((profile as any).interactionLogs as any[]) ?? [];
  const consents = ((profile as any).consents as any[]) ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-rose-700">
          <FiHeart className="w-4 h-4" aria-hidden />
          <h3 className="text-sm font-bold text-stone-900">Identité du compte</h3>
        </div>
        <p className="text-xs text-stone-600">
          {user?.firstName} {user?.lastName} · {user?.email}
        </p>
        <p className="text-[11px] text-stone-500">
          Pour modifier nom ou e-mail, contactez l’administration de l’établissement.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Préférences &amp; portail</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Profession (optionnel)"
            value={draft.profession}
            onChange={(e) => setDraft((d) => ({ ...d, profession: e.target.value }))}
          />
          <Input
            label="Langue préférée (ex. français)"
            value={draft.preferredLocale}
            onChange={(e) => setDraft((d) => ({ ...d, preferredLocale: e.target.value }))}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {(
            [
              ['notifyEmail', 'Recevoir des e-mails de l’école'],
              ['notifySms', 'Recevoir des SMS'],
              ['notifyWhatsApp', 'Recevoir des messages WhatsApp'],
              ['portalShowFees', 'Afficher les frais sur le portail'],
              ['portalShowGrades', 'Afficher les notes'],
              ['portalShowAttendance', 'Afficher les présences / absences'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                className="rounded border-stone-300"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <Button type="button" size="sm" onClick={() => saveProfileMut.mutate()} disabled={saveProfileMut.isPending}>
          <FiSave className="w-4 h-4 mr-1 inline" />
          Enregistrer
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Coordonnées complémentaires</h3>
        <p className="text-xs text-stone-600">
          Autres personnes à joindre en complément de votre compte (second parent, gardien, etc.).
        </p>
        <ul className="space-y-2 text-sm">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 bg-stone-50/80"
            >
              <div>
                <p className="font-medium text-stone-900">{c.label}</p>
                <p className="text-xs text-stone-600">
                  {c.phone || '—'} · {c.email || '—'}
                </p>
              </div>
              <button
                type="button"
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                title="Supprimer"
                onClick={() => {
                  if (window.confirm('Supprimer ce contact ?')) delContactMut.mutate(c.id);
                }}
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-stone-100">
          <Input
            label="Libellé"
            value={newContact.label}
            onChange={(e) => setNewContact((n) => ({ ...n, label: e.target.value }))}
          />
          <Input
            label="Téléphone"
            value={newContact.phone}
            onChange={(e) => setNewContact((n) => ({ ...n, phone: e.target.value }))}
          />
          <Input
            className="sm:col-span-2"
            label="E-mail"
            value={newContact.email}
            onChange={(e) => setNewContact((n) => ({ ...n, email: e.target.value }))}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            if (!newContact.label.trim()) {
              toast.error('Libellé requis');
              return;
            }
            addContactMut.mutate();
          }}
          disabled={addContactMut.isPending}
        >
          <FiPlus className="w-4 h-4 mr-1 inline" />
          Ajouter
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-bold text-stone-900">Historique avec l’école</h3>
        <p className="text-xs text-stone-600">Dernières traces enregistrées par l’administration.</p>
        <ul className="max-h-56 overflow-y-auto space-y-2 text-xs">
          {logs.length === 0 && <li className="text-stone-500">Aucune entrée pour le moment.</li>}
          {logs.map((ix: any) => (
            <li key={ix.id} className="rounded-lg border border-stone-100 px-2 py-2">
              <span className="font-semibold text-stone-800">{CHANNEL_LABEL[ix.channel] ?? ix.channel}</span>
              {ix.subject && <span className="text-stone-600"> — {ix.subject}</span>}
              {ix.body && <p className="text-stone-500 mt-1 whitespace-pre-wrap">{ix.body}</p>}
              <p className="text-[10px] text-stone-400 mt-1">
                {format(new Date(ix.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Consentements &amp; autorisations</h3>
        <ul className="space-y-1 text-xs">
          {consents.map((c: any) => (
            <li key={c.id} className="rounded bg-stone-50/90 px-2 py-1.5">
              {CONSENT_LABEL[c.consentType] ?? c.consentType}
              {c.studentId ? ' (lié à un enfant)' : ' (général)'} —{' '}
              <Badge className={c.granted ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700'}>
                {c.granted ? 'Accord' : 'Refus'}
              </Badge>
            </li>
          ))}
        </ul>
        <div className="grid sm:grid-cols-2 gap-2 border-t border-stone-100 pt-3">
          <div>
            <label className="text-xs font-medium text-stone-700">Thématique</label>
            <select
              aria-label="Thématique du consentement"
              value={consentForm.consentType}
              onChange={(e) => setConsentForm((f) => ({ ...f, consentType: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border-2 rounded-xl border-stone-200/90 text-sm"
            >
              {CONSENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONSENT_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-700">Enfant concerné (optionnel)</label>
            <select
              aria-label="Enfant concerné par le consentement (optionnel)"
              value={consentForm.studentId}
              onChange={(e) => setConsentForm((f) => ({ ...f, studentId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border-2 rounded-xl border-stone-200/90 text-sm"
            >
              <option value="">Non spécifique</option>
              {studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={consentForm.granted}
              onChange={(e) => setConsentForm((f) => ({ ...f, granted: e.target.checked }))}
              className="rounded border-stone-300"
            />
            Je consens
          </label>
          <Input
            label="Référence politique (optionnel)"
            value={consentForm.policyVersion}
            onChange={(e) => setConsentForm((f) => ({ ...f, policyVersion: e.target.value }))}
          />
          <Input
            label="Commentaire"
            value={consentForm.notes}
            onChange={(e) => setConsentForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => upsertConsentMut.mutate()}
          disabled={upsertConsentMut.isPending}
        >
          Mettre à jour ce consentement
        </Button>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="text-sm font-bold text-stone-900">Personnes autorisées à récupérer vos enfants</h3>
        {studentOptions.length === 0 && (
          <p className="text-sm text-stone-500">Aucun enfant lié à votre compte pour le moment.</p>
        )}
        {studentOptions.map((s) => {
          const link = (((profile as any).students as any[]) ?? []).find((sp: any) => sp.student?.id === s.id);
          const pickups = (link?.student?.pickupAuthorizations as any[]) ?? [];
          const form = pickupByStudent[s.id] ?? { ...PICKUP_EMPTY };
          return (
            <div key={s.id} className="rounded-xl border border-stone-200/90 p-3 space-y-2 bg-stone-50/40">
              <p className="font-semibold text-stone-900">{s.label}</p>
              <ul className="space-y-1 text-xs">
                {pickups.map((pu: any) => (
                  <li
                    key={pu.id}
                    className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg px-2 py-1.5 border border-stone-100"
                  >
                    <span>
                      {pu.authorizedName}
                      <span className="text-stone-500 block">
                        {pu.phone || '—'} {pu.relationship ? `· ${pu.relationship}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="text-red-600 p-1"
                      title="Retirer"
                      onClick={() => {
                        if (window.confirm('Retirer cette autorisation ?')) delPickupMut.mutate({ studentId: s.id, pickupId: pu.id });
                      }}
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-stone-200/60">
                <Input
                  label="Nom complet"
                  value={form.authorizedName}
                  onChange={(e) =>
                    setPickupByStudent((p) => ({
                      ...p,
                      [s.id]: { ...form, authorizedName: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Lien de parenté"
                  value={form.relationship}
                  onChange={(e) =>
                    setPickupByStudent((p) => ({
                      ...p,
                      [s.id]: { ...form, relationship: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Téléphone"
                  value={form.phone}
                  onChange={(e) =>
                    setPickupByStudent((p) => ({
                      ...p,
                      [s.id]: { ...form, phone: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Valide du (AAAA-MM-JJ)"
                  value={form.validFrom}
                  onChange={(e) =>
                    setPickupByStudent((p) => ({
                      ...p,
                      [s.id]: { ...form, validFrom: e.target.value },
                    }))
                  }
                />
                <Input
                  label="Jusqu’au (optionnel)"
                  value={form.validUntil}
                  onChange={(e) =>
                    setPickupByStudent((p) => ({
                      ...p,
                      [s.id]: { ...form, validUntil: e.target.value },
                    }))
                  }
                />
                <div className="sm:col-span-2">
                  <label htmlFor={`parent-pickup-note-${s.id}`} className="text-xs font-medium text-stone-700">
                    Remarque (pièce d’identité, etc.)
                  </label>
                  <textarea
                    id={`parent-pickup-note-${s.id}`}
                    aria-label={`Remarque identité pour ${s.label}`}
                    value={form.identityNote}
                    onChange={(e) =>
                      setPickupByStudent((p) => ({
                        ...p,
                        [s.id]: { ...form, identityNote: e.target.value },
                      }))
                    }
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border-2 rounded-xl border-stone-200/90 text-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!form.authorizedName.trim()) {
                    toast.error('Indiquez le nom de la personne autorisée');
                    return;
                  }
                  addPickupMut.mutate({ studentId: s.id, data: form });
                }}
                disabled={addPickupMut.isPending}
              >
                <FiPlus className="w-4 h-4 mr-1 inline" />
                Ajouter pour {s.label}
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

export default ParentFamilyProfilePanel;
