'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { adminApi } from '../../services/api';

/**
 * Connecteurs plateforme : paiements, WhatsApp, LTI, prévision encaissements.
 */
export default function PlatformIntegrationsPanel({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Test WhatsApp — École à jour');

  const { data: payments } = useQuery({
    queryKey: ['admin-integrations-payments'],
    queryFn: () => adminApi.getPaymentIntegrations(),
  });
  const { data: wa } = useQuery({
    queryKey: ['admin-integrations-whatsapp'],
    queryFn: () => adminApi.getWhatsAppStatus(),
  });
  const { data: lti } = useQuery({
    queryKey: ['admin-integrations-lti'],
    queryFn: () => adminApi.getLtiConfig(),
  });
  const { data: forecast } = useQuery({
    queryKey: ['admin-payments-forecast'],
    queryFn: () => adminApi.getPaymentsForecast({ months: 6 }),
  });

  const sendWa = useMutation({
    mutationFn: () => adminApi.sendWhatsAppTest({ phone: waPhone, message: waMessage }),
    onSuccess: (r: { mode?: string }) => {
      toast.success(r.mode === 'live' ? 'Message WhatsApp envoyé' : 'Sandbox WhatsApp (log serveur)');
      qc.invalidateQueries({ queryKey: ['admin-integrations-whatsapp'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Échec WhatsApp'),
  });

  const providers = (payments?.providers || []) as Array<{
    id: string;
    configured: boolean;
    channels: string[];
  }>;

  return (
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      <Card className="p-4 space-y-3 border border-emerald-100 bg-emerald-50/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">Connecteurs paiements</h3>
            <p className="text-xs text-emerald-900/80">
              Webhook : <code className="text-[11px]">{payments?.webhookPath || '/api/payments/webhooks/…'}</code>
              {' — '}aussi Paystack / CinetPay / Wave.
            </p>
          </div>
          <a
            href="/admin?tab=integrations"
            className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            Configurer →
          </a>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <li
              key={p.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                p.configured ? 'border-emerald-300 bg-white' : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <div className="font-semibold">{p.id}</div>
              <div>{p.configured ? 'Configuré' : 'Clés manquantes → sandbox'}</div>
              <div className="text-[10px] mt-0.5">{p.channels?.join(' · ')}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">WhatsApp Business</h3>
        <p className="text-xs text-gray-600">
          Statut :{' '}
          <span className={wa?.configured ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
            {wa?.configured ? 'API configurée' : 'Mode journal (dev) — configurer dans Intégrations'}
          </span>
          {' · '}
          <a href="/admin?tab=integrations" className="font-semibold text-teal-800 underline-offset-2 hover:underline">
            Ouvrir Intégrations
          </a>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input label="Téléphone" value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="+2376…" />
          <Input label="Message" value={waMessage} onChange={(e) => setWaMessage(e.target.value)} />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => sendWa.mutate()}
          disabled={!waPhone || !waMessage || sendWa.isPending}
        >
          Envoyer un test
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Prévision encaissements</h3>
        <p className="text-xs text-gray-500">
          Croissance estimée :{' '}
          <strong>
            {forecast?.growthRatePct != null ? `${Number(forecast.growthRatePct).toFixed(1)} %` : '—'}
          </strong>
          {forecast?.method ? ` (${forecast.method})` : ''}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {(forecast?.history || []).slice(-6).map((h: { label: string; amount: number }) => (
            <span key={h.label} className="rounded border bg-gray-50 px-2 py-1">
              {h.label}: {h.amount.toLocaleString('fr-FR')}
            </span>
          ))}
        </div>
        {(forecast?.forecast || []).length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-violet-800">
            {(forecast.forecast as Array<{ label: string; amount: number }>).map((f) => (
              <span key={f.label} className="rounded border border-violet-200 bg-violet-50 px-2 py-1">
                Prévision {f.label}: {Math.round(f.amount).toLocaleString('fr-FR')}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-1 text-xs text-gray-600">
        <h3 className="text-sm font-semibold text-gray-900">LTI 1.3 (stub LMS)</h3>
        <p>Issuer : {lti?.issuer || '—'}</p>
        <p>Client ID : {lti?.clientId || 'non défini'}</p>
        <p className="text-gray-500">{lti?.note}</p>
      </Card>
    </div>
  );
}
