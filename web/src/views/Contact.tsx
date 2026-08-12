'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { resolveSchoolContactInfo } from '@/lib/schoolContact';
import toast from 'react-hot-toast';
import { publicApi } from '@/services/api/public';
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiSend,
  FiMessageSquare,
  FiUser,
  FiFileText,
  FiGlobe,
  FiUserCheck,
} from 'react-icons/fi';

const Contact = () => {
  const { branding } = useAppBranding();
  const contact = useMemo(() => resolveSchoolContactInfo(branding), [branding]);
  const addressLines = contact.address.split('\n').map((line) => line.trim()).filter(Boolean);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await publicApi.submitContactLead({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });
      toast.success('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string } };
      };
      toast.error(axiosErr.response?.data?.error || "Envoi impossible. Réessayez plus tard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const textareaClass =
    'w-full px-4 py-3 border-2 border-stone-200/90 rounded-xl bg-white/95 text-stone-900 placeholder:text-stone-400 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/55 hover:border-stone-300';

  return (
    <UltraPremiumPageShell
      navLabel="Contact"
      title="Contactez-nous"
      description="Une question sur la plateforme ou votre établissement ? Écrivez-nous, nous revenons vers vous rapidement."
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <Card variant="premium" className="!p-6 sm:!p-7">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-stone-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <FiMail className="h-4 w-4" aria-hidden />
                </span>
                Coordonnées
              </h2>
              <div className="space-y-6">
                {contact.email ? (
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200/60">
                      <FiMail className="h-6 w-6 text-amber-800" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="mb-1 font-semibold text-stone-900">E-mail</h3>
                      <a
                        href={`mailto:${contact.email}`}
                        className="break-all text-amber-900/90 underline-offset-2 hover:text-stone-900 hover:underline"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-200/60">
                    <FiPhone className="h-6 w-6 text-emerald-800" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-stone-900">Téléphone</h3>
                    <a
                      href={contact.phoneTel}
                      className="tabular-nums text-stone-700 transition-colors hover:text-amber-900"
                    >
                      {contact.phone}
                    </a>
                    <p className="mt-1 text-sm text-stone-500">{contact.openingHoursSummary}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-200/60">
                    <FiMapPin className="h-6 w-6 text-violet-800" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-stone-900">Adresse</h3>
                    <p className="leading-relaxed text-stone-700">
                      <a
                        href={contact.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-stone-900 underline-offset-2 hover:text-amber-800 hover:underline"
                        aria-label={`Voir ${contact.name} sur Google Maps`}
                      >
                        {contact.name}
                      </a>
                      {addressLines.length > 0 ? (
                        <>
                          <br />
                          {addressLines.map((line, index) => (
                            <span key={`${line}-${index}`}>
                              {line}
                              {index < addressLines.length - 1 ? <br /> : null}
                            </span>
                          ))}
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                {contact.website && contact.websiteHref ? (
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-200/60">
                      <FiGlobe className="h-6 w-6 text-sky-800" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="mb-1 font-semibold text-stone-900">Site web</h3>
                      <a
                        href={contact.websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-amber-900/90 underline-offset-2 hover:text-stone-900 hover:underline"
                      >
                        {contact.website}
                      </a>
                    </div>
                  </div>
                ) : null}

                {contact.principal ? (
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 ring-1 ring-stone-200/80">
                      <FiUserCheck className="h-6 w-6 text-stone-700" aria-hidden />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-stone-900">Direction</h3>
                      <p className="text-stone-700">{contact.principal}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-stone-50/50 !p-6 ring-1 ring-amber-900/5">
              <h3 className="mb-2 font-bold text-stone-900">Besoin d&apos;aide rapide ?</h3>
              <p className="mb-4 text-sm leading-relaxed text-stone-600">
                Consultez la FAQ pour des réponses aux questions fréquentes.
              </p>
              <Link href="/faq">
                <Button
                  variant="outline"
                  className="w-full border-stone-300 text-stone-900 hover:bg-amber-50/50"
                >
                  <FiMessageSquare className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                  Voir la FAQ
                </Button>
              </Link>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card variant="premium" className="!p-6 sm:!p-8">
              <h2 className="mb-6 text-2xl font-bold text-stone-900">Envoyez-nous un message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-2 block text-sm font-semibold text-stone-800">
                      Nom complet <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <FiUser
                        className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-stone-400"
                        aria-hidden
                      />
                      <Input
                        id="contact-name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="!pl-10"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-2 block text-sm font-semibold text-stone-800">
                      E-mail <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <FiMail
                        className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-stone-400"
                        aria-hidden
                      />
                      <Input
                        id="contact-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="!pl-10"
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="mb-2 block text-sm font-semibold text-stone-800">
                    Sujet <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <FiFileText
                      className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-stone-400"
                      aria-hidden
                    />
                    <Input
                      id="contact-subject"
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="!pl-10"
                      placeholder="Sujet de votre message"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold text-stone-800">
                    Message <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={8}
                    className={textareaClass}
                    placeholder="Décrivez votre demande ou votre question…"
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting} className="w-full" size="lg">
                  {!isSubmitting && (
                    <>
                      <FiSend className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                      Envoyer le message
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </UltraPremiumPageShell>
  );
};

export default Contact;
