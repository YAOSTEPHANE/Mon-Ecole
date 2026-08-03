'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiKey, FiMail } from 'react-icons/fi';
import { isSyntheticStudentEmail } from '@/lib/studentLoginIdentifier';

type AdminUserPasswordSectionProps = {
  userId: string;
  userEmail?: string | null;
  userLabel?: string | null;
  /** Identifiant de connexion affiché (n° élève / matricule) si pas d’e-mail réel. */
  loginIdentifier?: string | null;
  compact?: boolean;
};

export default function AdminUserPasswordSection({
  userId,
  userEmail,
  userLabel,
  loginIdentifier,
  compact = false,
}: AdminUserPasswordSectionProps) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const noRealEmail = isSyntheticStudentEmail(userEmail) || !userEmail?.includes('@');

  const changePasswordMutation = useMutation({
    mutationFn: () => adminApi.changeUserPassword(userId, newPassword.trim()),
    onSuccess: () => {
      toast.success('Mot de passe mis à jour.');
      setNewPassword('');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Impossible de modifier le mot de passe.');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => adminApi.sendUserPasswordInvite(userId),
    onSuccess: () => {
      toast.success('Un lien pour définir un nouveau mot de passe a été envoyé par e-mail (48 h).');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Impossible d'envoyer l'e-mail.");
    },
  });

  const canApply = newPassword.trim().length >= 6 && !changePasswordMutation.isPending;

  return (
    <div
      className={`rounded-lg border border-amber-200/70 bg-amber-50/40 ${
        compact ? 'p-2.5 space-y-2' : 'p-3 space-y-3'
      }`}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
          Accès au compte
        </p>
        {userLabel ? <p className="text-xs text-stone-700 mt-0.5">{userLabel}</p> : null}
        {noRealEmail ? (
          <p className="text-[11px] text-stone-600 mt-0.5">
            Identifiant de connexion :{' '}
            <span className="font-mono font-semibold">
              {loginIdentifier || 'n° élève / matricule'}
            </span>
            {' — '}réinitialisation du mot de passe par l&apos;administration uniquement.
          </p>
        ) : userEmail ? (
          <p className="text-[11px] text-stone-500">{userEmail}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`admin-password-${userId}`} className="block text-xs font-semibold text-stone-700 mb-1">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <input
            id={`admin-password-${userId}`}
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Min. 6 caractères"
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 pr-10 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-700"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-stone-500">
          L&apos;administrateur peut réinitialiser le mot de passe à tout moment, sans attendre l&apos;utilisateur.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => changePasswordMutation.mutate()}
          disabled={!canApply}
          isLoading={changePasswordMutation.isPending}
        >
          <FiKey className="w-4 h-4 mr-1 inline" />
          Appliquer le mot de passe
        </Button>
        {!noRealEmail ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            isLoading={inviteMutation.isPending}
          >
            <FiMail className="w-4 h-4 mr-1 inline" />
            Envoyer un lien par e-mail
          </Button>
        ) : null}
      </div>
    </div>
  );
}
