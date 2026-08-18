import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff,
  FiArrowRight
} from 'react-icons/fi';
import { getRoleDashboardPath } from '@/lib/rolePaths';
import LoginBackground from '../components/illustrations/LoginBackgroundLazy';
import api, { API_URL } from '@/services/api/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email'); // Étape actuelle
  const [oauthProviders, setOauthProviders] = useState<{ google: boolean; microsoft: boolean }>({
    google: false,
    microsoft: false,
  });
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { loginLogoAbsolute, branding } = useAppBranding();
  const displayTitle = (branding.appTitle && branding.appTitle.trim()) || 'Gestion scolaire';
  const tagline = branding.appTagline?.trim();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(getRoleDashboardPath(user.role));
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    document.title = `Connexion · ${displayTitle}`;
  }, [displayTitle]);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get<{ google: boolean; microsoft: boolean }>(
          '/auth/oauth/providers',
        );
        setOauthProviders({
          google: Boolean(data?.google),
          microsoft: Boolean(data?.microsoft),
        });
      } catch {
        setOauthProviders({ google: false, microsoft: false });
      }
    })();
  }, []);

  const startOAuth = (provider: 'google' | 'microsoft') => {
    const base = API_URL.replace(/\/+$/, '');
    window.location.href = `${base}/auth/oauth/${provider}/start`;
  };

  // Gérer la soumission de l'identifiant (e-mail ou matricule élève)
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = email.trim();
    if (identifier.length >= 2) {
      setStep('password');
    } else {
      toast.error('Veuillez entrer votre e-mail, n° élève ou matricule');
    }
  };

  // Gérer la soumission du mot de passe (connexion finale)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(
        email,
        password,
        twoFactorRequired ? twoFactorCode : undefined
      );
      if (response?.user) {
        router.replace(getRoleDashboardPath(response.user.role));
      }
    } catch (error: any) {
      if (error?.response?.data?.code === 'TWO_FACTOR_REQUIRED') {
        setTwoFactorRequired(true);
        toast('Entrez le code 2FA de votre application.');
        return;
      }
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Erreur réseau. Vérifiez que le serveur backend est démarré.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Retour à l'étape email
  const handleBackToEmail = () => {
    setStep('email');
    setPassword('');
    setShowPassword(false);
    setTwoFactorCode('');
    setTwoFactorRequired(false);
  };

  // Afficher un loader pendant la vérification de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen premium-body flex items-center justify-center relative overflow-hidden">
        <LoginBackground />
        <div className="text-center relative z-10 px-4">
          <div
            className="inline-block h-16 w-16 animate-spin rounded-full border-[3px] border-amber-200/80 border-t-amber-700"
            aria-hidden
          />
          <p className="mt-6 text-lg font-semibold text-white drop-shadow-sm">Vérification de votre session…</p>
        </div>
      </div>
    );
  }

  // Ne pas afficher le formulaire si déjà connecté
  if (user) {
    return (
      <div className="min-h-screen premium-body flex items-center justify-center relative overflow-hidden">
        <LoginBackground />
        <div className="text-center relative z-10 px-4">
          <div
            className="inline-block h-16 w-16 animate-spin rounded-full border-[3px] border-amber-200/80 border-t-amber-700"
            aria-hidden
          />
          <p className="mt-6 text-lg font-semibold text-white drop-shadow-sm">Redirection en cours…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen premium-body premium-body-v2 premium-body-v3 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Illustration 3D en arrière-plan */}
      <LoginBackground />
      
      <div className="w-full max-w-md relative z-10">
        <div className="relative">
          {/* Glow effect derrière la carte */}
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-r from-cptb-blue/20 via-cptb-gold/25 to-amber-400/20 opacity-50 blur-3xl" aria-hidden />
          
          {/* Carte principale */}
          <div className="premium-surface relative border-white/85 p-5 shadow-premium sm:rounded-[1.75rem] sm:p-8 lg:p-10 animate-dash-enter">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 to-stone-800/40 rounded-2xl blur-xl" aria-hidden />
                <div className="relative inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0f2e] via-cptb-blue-dark to-stone-900 shadow-lg ring-2 ring-cptb-gold/40 transition-transform duration-300 hover:scale-105">
                  {loginLogoAbsolute ? (
                    <img
                      src={loginLogoAbsolute}
                      alt=""
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <svg className="w-10 h-10 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="font-display text-lg sm:text-xl font-semibold text-stone-800 tracking-tight">
                {displayTitle}
              </p>
              {tagline ? (
                <p className="mt-1.5 text-sm text-stone-500 leading-snug max-w-sm mx-auto">{tagline}</p>
              ) : null}
            </div>

            {/* Form Header */}
            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl sm:text-4xl font-black mb-2 text-gradient-display tracking-tight">
                Bienvenue
              </h2>
              <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
                {step === 'email' 
                  ? 'Connectez-vous pour accéder à votre espace'
                  : `Bonjour, ${email}`}
              </p>
            </div>

            {step === 'email' ? (
              // Étape 1 : Saisie de l'identifiant
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                {/* Email / matricule Input */}
                <div className="space-y-2">
                  <label htmlFor="login-email" className="block text-sm font-semibold text-stone-800">
                    E-mail ou n° élève / matricule
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className={`w-5 h-5 transition-colors ${email ? 'text-[#0018A8]' : 'text-stone-400'}`} aria-hidden />
                    </div>
                    <input
                      id="login-email"
                      type="text"
                      name="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="email@exemple.com ou matricule"
                      autoFocus
                      autoComplete="username"
                      className="w-full pl-12 pr-4 py-4 bg-white border border-[#e4e8f2] rounded-xl shadow-[inset_0_1px_2px_rgba(28,39,76,0.04)] transition-all duration-200 text-stone-900 placeholder:text-stone-400 hover:border-[#cfd7ea] focus:outline-none focus:ring-2 focus:ring-[#0018A8]/18 focus:border-[#0018A8]/40"
                    />
                  </div>
                  <p className="text-xs text-stone-500">
                    Élèves sans e-mail : utilisez votre numéro d&apos;élève ou matricule FNE.
                  </p>
                </div>

                {/* Submit Button - Continuer */}
                <Button
                  type="submit"
                  disabled={email.trim().length < 2}
                  className="w-full"
                  size="lg"
                >
                  <span className="flex items-center justify-center gap-2">
                    Continuer
                    <FiArrowRight className="w-5 h-5 shrink-0" aria-hidden />
                  </span>
                </Button>

                {(oauthProviders.google || oauthProviders.microsoft) && (
                  <div className="pt-2">
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center" aria-hidden>
                        <div className="w-full border-t border-stone-200" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white/95 px-2 text-stone-500">ou continuer avec</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {oauthProviders.google ? (
                        <button
                          type="button"
                          onClick={() => startOAuth('google')}
                          className="w-full rounded-full border border-[#e4e8f2] bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-[#cfd7ea] hover:bg-[#f7f8fc]"
                        >
                          Google
                        </button>
                      ) : null}
                      {oauthProviders.microsoft ? (
                        <button
                          type="button"
                          onClick={() => startOAuth('microsoft')}
                          className="w-full rounded-full border border-[#e4e8f2] bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-[#cfd7ea] hover:bg-[#f7f8fc]"
                        >
                          Microsoft
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </form>
            ) : (
              // Étape 2 : Saisie du mot de passe
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                {/* Bouton retour */}
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-sm font-medium text-[#0018A8] hover:text-[#001066] transition-colors flex items-center gap-1.5 mb-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35 px-1 -ml-1"
                >
                  <FiArrowRight className="w-4 h-4 rotate-180 shrink-0" aria-hidden />
                  Changer d&apos;email
                </button>

                {/* Email affiché (non éditable) */}
                <div className="space-y-2">
                  <span className="block text-sm font-semibold text-stone-800">
                    Adresse e-mail
                  </span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiMail className="w-5 h-5 text-stone-400" aria-hidden />
                    </div>
                    <input
                      type="email"
                      name="username"
                      value={email}
                      disabled
                      readOnly
                      aria-readonly="true"
                      aria-label="Adresse e-mail utilisée pour la connexion (non modifiable)"
                      autoComplete="username"
                      className="w-full pl-12 pr-4 py-4 bg-stone-100/90 border-2 border-stone-200 rounded-xl text-stone-600 cursor-not-allowed shadow-inner"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-stone-800">
                    Mot de passe
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FiLock className={`w-5 h-5 transition-colors ${password ? 'text-[#0018A8]' : 'text-stone-400'}`} aria-hidden />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Entrez votre mot de passe"
                      autoFocus
                      autoComplete="current-password"
                      className="w-full pl-12 pr-12 py-4 bg-white border border-[#e4e8f2] rounded-xl shadow-[inset_0_1px_2px_rgba(28,39,76,0.04)] transition-all duration-200 text-stone-900 placeholder:text-stone-400 hover:border-[#cfd7ea] focus:outline-none focus:ring-2 focus:ring-[#0018A8]/18 focus:border-[#0018A8]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 pl-2 text-stone-500 hover:text-[#0018A8] hover:bg-stone-100/80 rounded-r-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? (
                        <FiEyeOff className="w-5 h-5 shrink-0" aria-hidden />
                      ) : (
                        <FiEye className="w-5 h-5 shrink-0" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                {twoFactorRequired && (
                  <div className="space-y-2">
                    <label htmlFor="login-2fa" className="block text-sm font-semibold text-stone-800">
                      Code 2FA (6 chiffres)
                    </label>
                    <input
                      id="login-2fa"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full px-4 py-4 bg-white border border-[#e4e8f2] rounded-xl shadow-[inset_0_1px_2px_rgba(28,39,76,0.04)] transition-all duration-200 text-stone-900 placeholder:text-stone-400 hover:border-[#cfd7ea] focus:outline-none focus:ring-2 focus:ring-[#0018A8]/18 focus:border-[#0018A8]/40"
                    />
                  </div>
                )}

                {/* Remember Me & Forgot Password */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center group cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 text-[#0018A8] focus:ring-[#0018A8]/40 cursor-pointer bg-white"
                    />
                    <span className="ml-3 text-sm font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                      Se souvenir de moi
                    </span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-amber-900/90 hover:text-stone-900 transition-colors hover:underline underline-offset-2"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !password || (twoFactorRequired && twoFactorCode.length !== 6)}
                  isLoading={loading}
                  className="w-full"
                  size="lg"
                >
                  {!loading && (
                    <span className="flex items-center justify-center gap-2">
                      Se connecter
                      <FiArrowRight className="w-5 h-5 shrink-0" aria-hidden />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-stone-200/90 text-center">
              <p className="text-sm text-stone-600">
                Pas encore de compte ?{' '}
                <Link href="/" className="font-semibold text-amber-900/90 hover:text-stone-900 transition-colors hover:underline underline-offset-2">
                  Retour à l&apos;accueil
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
