import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import Login3D from '../components/illustrations/Login3DLazy';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setEmailSent(true);
      toast.success('Email de réinitialisation envoyé !');
    } catch (error: any) {
      const code = error.response?.data?.code;
      const errorMessage =
        error.response?.data?.error || "Erreur lors de l'envoi de l'email";
      if (code === 'ADMIN_PASSWORD_RESET_REQUIRED') {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen premium-body flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <Login3D />

      <div className="w-full max-w-md relative z-10">
        <div className="relative">
          <div
            className="absolute -inset-3 bg-gradient-to-r from-amber-600/35 via-stone-700/30 to-amber-500/35 rounded-[2rem] blur-3xl opacity-40"
            aria-hidden
          />

          <div className="relative premium-card-surface rounded-[1.5rem] sm:rounded-[1.75rem] p-5 sm:p-8 lg:p-10 border border-white/80 shadow-premium ring-1 ring-amber-900/10">
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
                  <FiMail className="w-10 h-10" aria-hidden />
                </div>
              </div>
            </div>

            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl sm:text-4xl font-black text-stone-900 mb-2 tracking-tight">
                Mot de passe oublié ?
              </h2>
              <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
                {emailSent
                  ? 'Vérifiez votre boîte mail'
                  : 'Entrez votre adresse e-mail pour recevoir un lien de réinitialisation'}
              </p>
              {!emailSent ? (
                <p className="mt-3 text-sm text-stone-500 leading-relaxed">
                  Élèves sans e-mail (connexion par n° élève / matricule) : contactez
                  l&apos;administration pour réinitialiser le mot de passe.
                </p>
              ) : null}
            </div>

            {emailSent ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-5 ring-1 ring-emerald-900/5">
                  <div className="flex items-start gap-4">
                    <FiCheckCircle className="w-7 h-7 shrink-0 text-emerald-700 mt-0.5" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-emerald-950 mb-2">E-mail envoyé</h3>
                      <p className="text-sm text-emerald-900/90 leading-relaxed">
                        Si un compte existe pour{' '}
                        <span className="font-semibold break-all">{email}</span>, vous recevrez un message avec un
                        lien pour réinitialiser votre mot de passe.
                      </p>
                      <p className="text-xs text-emerald-800/85 mt-3 leading-relaxed">
                        Astuce : vérifiez aussi les courriers indésirables. Le lien est valable environ une heure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Envoyer un autre e-mail
                  </Button>
                  <Link href="/login" className="block">
                    <Button className="w-full" size="lg">
                      Retour à la connexion
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="forgot-email" className="block text-sm font-semibold text-stone-800">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className={`w-5 h-5 ${email ? 'text-amber-700' : 'text-stone-400'}`} aria-hidden />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="votre.email@exemple.com"
                      className="w-full pl-12 pr-4 py-4 bg-white/95 border-2 border-stone-200 rounded-xl shadow-sm text-stone-900 placeholder:text-stone-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/55 hover:border-stone-300"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} isLoading={loading} className="w-full" size="lg">
                  {!loading && (
                    <span className="flex items-center justify-center gap-2">
                      Envoyer le lien
                      <FiMail className="w-5 h-5 shrink-0" aria-hidden />
                    </span>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-stone-200/90 text-center">
              <p className="text-sm text-stone-600">
                Vous vous souvenez de votre mot de passe ?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-amber-900/90 hover:text-stone-900 underline-offset-2 hover:underline"
                >
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

export default ForgotPassword;
