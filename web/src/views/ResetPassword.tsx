import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import Login3D from '../components/illustrations/Login3DLazy';

const ResetPassword = () => {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Token de réinitialisation manquant');
      router.replace('/forgot-password');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Token de réinitialisation manquant');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      toast.success('Mot de passe réinitialisé avec succès !');

      setTimeout(() => {
        router.replace('/login');
      }, 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la réinitialisation';
      toast.error(errorMessage);

      if (errorMessage.includes('invalide') || errorMessage.includes('expiré')) {
        setTimeout(() => {
          router.replace('/forgot-password');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  const inputClass =
    'w-full pl-12 pr-12 py-4 bg-white/95 border-2 border-stone-200 rounded-xl shadow-sm text-stone-900 placeholder:text-stone-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/55 hover:border-stone-300';

  if (success) {
    return (
      <div className="min-h-screen premium-body premium-body-v2 premium-body-v3 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <Login3D />

        <div className="w-full max-w-md relative z-10">
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-emerald-600/25 to-teal-600/20 rounded-[2rem] blur-3xl opacity-50" aria-hidden />

            <div className="premium-surface relative p-8 lg:p-10">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-2xl ring-2 ring-emerald-500/20">
                  <FiCheckCircle className="w-10 h-10 text-emerald-700" aria-hidden />
                </div>

                <div>
                  <h2 className="font-display text-3xl font-black text-stone-900 mb-2 tracking-tight">C’est fait</h2>
                  <p className="text-stone-600 leading-relaxed">Votre mot de passe a été réinitialisé avec succès.</p>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                  Redirection vers la connexion dans quelques secondes…
                </div>

                <Link href="/login" className="block">
                  <Button className="w-full" size="lg">
                    Se connecter maintenant
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen premium-body premium-body-v2 premium-body-v3 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <Login3D />

      <div className="w-full max-w-md relative z-10">
        <div className="relative">
          <div
            className="absolute -inset-3 bg-gradient-to-r from-amber-600/35 via-stone-700/30 to-amber-500/35 rounded-[2rem] blur-3xl opacity-40"
            aria-hidden
          />

          <div className="premium-surface relative p-5 shadow-premium sm:rounded-[1.75rem] sm:p-8 lg:p-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-900/90 hover:text-stone-900 mb-6 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 px-1 -ml-1"
            >
              <FiArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
              Retour à la connexion
            </Link>

            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-stone-800/40 rounded-2xl blur-xl" aria-hidden />
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl ring-2 ring-amber-500/35 text-amber-100 shadow-lg">
                  <FiLock className="w-10 h-10" aria-hidden />
                </div>
              </div>
            </div>

            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl sm:text-4xl font-black text-stone-900 mb-2 tracking-tight">
                Nouveau mot de passe
              </h2>
              <p className="text-stone-600 text-base sm:text-lg">Choisissez un mot de passe sécurisé</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="reset-password" className="block text-sm font-semibold text-stone-800">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className={`w-5 h-5 ${password ? 'text-amber-700' : 'text-stone-400'}`} aria-hidden />
                  </div>
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-amber-800 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <FiEyeOff className="w-5 h-5" aria-hidden /> : <FiEye className="w-5 h-5" aria-hidden />}
                  </button>
                </div>
                <p className="text-xs text-stone-500">Au minimum 6 caractères</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-password-confirm" className="block text-sm font-semibold text-stone-800">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className={`w-5 h-5 ${confirmPassword ? 'text-amber-700' : 'text-stone-400'}`} aria-hidden />
                  </div>
                  <input
                    id="reset-password-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400 hover:text-amber-800 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                    aria-label={showConfirmPassword ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-5 h-5" aria-hidden /> : <FiEye className="w-5 h-5" aria-hidden />}
                  </button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-700 font-medium">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || password !== confirmPassword || password.length < 6}
                isLoading={loading}
                className="w-full"
                size="lg"
              >
                {!loading && (
                  <span className="flex items-center justify-center gap-2">
                    Enregistrer le mot de passe
                    <FiLock className="w-5 h-5 shrink-0" aria-hidden />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-stone-200/90 text-center">
              <p className="text-sm text-stone-600">
                <Link href="/login" className="font-semibold text-amber-900/90 hover:text-stone-900 underline-offset-2 hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
