'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FiCopy,
  FiGlobe,
  FiMail,
  FiMessageCircle,
  FiRadio,
  FiRefreshCw,
  FiSave,
  FiCreditCard,
} from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { adminApi } from '../../services/api';
import { ADM } from './adminModuleLayout';

const CLEAR = '__CLEAR__';

type IntegrationSettings = Awaited<ReturnType<typeof adminApi.getIntegrationSettings>>;

type SecretFieldProps = {
  label: string;
  configured: boolean;
  fromDb: boolean;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder?: string;
  help?: string;
};

function StatusPill({ configured, fromDb }: { configured: boolean; fromDb: boolean }) {
  if (!configured) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
        Non configuré
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
      Configuré{fromDb ? ' (admin)' : ' (serveur)'}
    </span>
  );
}

function SecretField({
  label,
  configured,
  fromDb,
  value,
  onChange,
  onClear,
  placeholder = 'Laisser vide pour ne pas modifier',
  help,
}: SecretFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <StatusPill configured={configured} fromDb={fromDb} />
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        {fromDb ? (
          <Button type="button" variant="outline" size="sm" onClick={onClear} title="Effacer la valeur admin">
            Effacer
          </Button>
        ) : null}
      </div>
      {help ? <p className="text-[11px] text-gray-500">{help}</p> : null}
    </div>
  );
}

function copyText(text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success('URL copiée'),
    () => toast.error('Impossible de copier')
  );
}

export default function IntegrationsSettingsPanel() {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-integrations-settings'],
    queryFn: () => adminApi.getIntegrationSettings(),
  });

  const [menaSecret, setMenaSecret] = useState('');
  const [menaWatchDir, setMenaWatchDir] = useState('');
  const [menaCron, setMenaCron] = useState('');
  const [menaImportEnabled, setMenaImportEnabled] = useState(false);
  const [menaDbUrl, setMenaDbUrl] = useState('');
  const [menaDbQuery, setMenaDbQuery] = useState('');
  const [nfcKey, setNfcKey] = useState('');
  const [paymentWebhookSecret, setPaymentWebhookSecret] = useState('');
  const [waveKey, setWaveKey] = useState('');
  const [orangeKey, setOrangeKey] = useState('');
  const [mtnKey, setMtnKey] = useState('');
  const [mtnSub, setMtnSub] = useState('');
  const [cinetpayKey, setCinetpayKey] = useState('');
  const [cinetpaySiteId, setCinetpaySiteId] = useState('');
  const [paystackKey, setPaystackKey] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waCountry, setWaCountry] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [emailFrom, setEmailFrom] = useState('');

  const [clearFlags, setClearFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data) return;
    setMenaWatchDir(data.mena.watchDir ?? '');
    setMenaCron(data.mena.cron ?? '');
    setMenaImportEnabled(Boolean(data.mena.importEnabled));
    setMenaDbQuery(data.mena.dbQuery ?? '');
    setCinetpaySiteId(data.payments.cinetpaySiteId ?? '');
    setWaPhoneId(data.whatsapp.phoneNumberId ?? '');
    setWaCountry(data.whatsapp.defaultCountryCode ?? '225');
    setSmtpHost(data.smtp.host ?? '');
    setSmtpPort(data.smtp.port != null ? String(data.smtp.port) : '587');
    setSmtpSecure(Boolean(data.smtp.secure));
    setSmtpUser(data.smtp.user ?? '');
    setEmailFrom(data.smtp.emailFrom ?? '');
    setMenaSecret('');
    setMenaDbUrl('');
    setNfcKey('');
    setPaymentWebhookSecret('');
    setWaveKey('');
    setOrangeKey('');
    setMtnKey('');
    setMtnSub('');
    setCinetpayKey('');
    setPaystackKey('');
    setWaToken('');
    setSmtpPass('');
    setClearFlags({});
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        menaPresenceImportEnabled: menaImportEnabled,
        menaPresenceWatchDir: clearFlags.menaWatchDir ? CLEAR : menaWatchDir,
        menaPresenceCron: clearFlags.menaCron ? CLEAR : menaCron,
        menaPresenceDbQuery: clearFlags.menaDbQuery ? CLEAR : menaDbQuery,
        cinetpaySiteId: clearFlags.cinetpaySiteId ? CLEAR : cinetpaySiteId,
        whatsappPhoneNumberId: clearFlags.waPhoneId ? CLEAR : waPhoneId,
        whatsappDefaultCountryCode: clearFlags.waCountry ? CLEAR : waCountry,
        smtpHost: clearFlags.smtpHost ? CLEAR : smtpHost,
        smtpPort: clearFlags.smtpPort ? CLEAR : smtpPort ? Number(smtpPort) : null,
        smtpSecure,
        smtpUser: clearFlags.smtpUser ? CLEAR : smtpUser,
        emailFrom: clearFlags.emailFrom ? CLEAR : emailFrom,
      };

      const secretOrClear = (flag: string, value: string) => {
        if (clearFlags[flag]) return CLEAR;
        if (value.trim()) return value.trim();
        return undefined;
      };

      payload.menaPresenceWebhookSecret = secretOrClear('menaSecret', menaSecret);
      payload.menaPresenceDbUrl = secretOrClear('menaDbUrl', menaDbUrl);
      payload.nfcApiKey = secretOrClear('nfcKey', nfcKey);
      payload.paymentWebhookSecret = secretOrClear('paymentWebhook', paymentWebhookSecret);
      payload.waveApiKey = secretOrClear('wave', waveKey);
      payload.orangeMoneyApiKey = secretOrClear('orange', orangeKey);
      payload.mtnMomoApiKey = secretOrClear('mtn', mtnKey);
      payload.mtnMomoSubscriptionKey = secretOrClear('mtnSub', mtnSub);
      payload.cinetpayApiKey = secretOrClear('cinetpay', cinetpayKey);
      payload.paystackSecretKey = secretOrClear('paystack', paystackKey);
      payload.whatsappToken = secretOrClear('waToken', waToken);
      payload.smtpPass = secretOrClear('smtpPass', smtpPass);

      return adminApi.updateIntegrationSettings(payload);
    },
    onSuccess: () => {
      toast.success('Intégrations enregistrées');
      qc.invalidateQueries({ queryKey: ['admin-integrations-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-integrations-payments'] });
      qc.invalidateQueries({ queryKey: ['admin-integrations-whatsapp'] });
      qc.invalidateQueries({ queryKey: ['admin-mena-presence-status'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Échec de l’enregistrement'),
  });

  const markClear = (key: string) => {
    setClearFlags((prev) => ({ ...prev, [key]: true }));
    toast('Valeur effacée au prochain enregistrement (repli sur le serveur)', { icon: 'ℹ️' });
  };

  if (isLoading && !data) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );
  }

  const settings = data as IntegrationSettings | undefined;

  return (
    <div className={ADM.root}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={ADM.h2}>Intégrations</h2>
          <p className={ADM.intro}>
            Connectez les logiciels externes (présence MENA, bornes, paiements, WhatsApp, e-mail) sans modifier
            les fichiers techniques. Les secrets ne sont jamais réaffichés après enregistrement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <FiRefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            <FiSave className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </div>

      {settings?.webhooks ? (
        <Card className="border border-teal-100 bg-teal-50/40 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-teal-950">
            <FiGlobe className="h-4 w-4" /> URLs à coller dans les logiciels tiers
          </h3>
          <ul className="space-y-2 text-sm">
            {(
              [
                ['Présence MENA (webhook)', settings.webhooks.menaPresence],
                ['Paiement Mobile Money', settings.webhooks.paymentMobileMoney],
                ['Wave', settings.webhooks.paymentWave],
                ['CinetPay (Moov + repli)', settings.webhooks.paymentCinetpay],
                ['MTN MoMo', settings.webhooks.paymentMtn],
                ['Orange Money', settings.webhooks.paymentOrange],
                ['Paystack', settings.webhooks.paymentPaystack],
              ] as const
            ).map(([label, url]) => (
              <li
                key={label}
                className="flex flex-col gap-1 rounded-lg border border-teal-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-800">{label}</p>
                  <code className="break-all text-[11px] text-stone-600">{url}</code>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => copyText(url)}>
                  <FiCopy className="mr-1 h-3.5 w-3.5" /> Copier
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-4 border border-gray-200 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <FiRadio className="h-4 w-4 text-teal-700" /> Présence journalière MENA
        </h3>
        <p className="text-xs text-gray-500">
          Le logiciel de pointeurs envoie le résultat du jour (matricule / n° élève). Header secret :{' '}
          <code>X-Mena-Presence-Secret</code>.
        </p>
        <SecretField
          label="Secret webhook"
          configured={Boolean(settings?.mena.webhookSecretConfigured)}
          fromDb={Boolean(settings?.mena.webhookSecretFromDb)}
          value={menaSecret}
          onChange={setMenaSecret}
          onClear={() => {
            setMenaSecret('');
            markClear('menaSecret');
          }}
        />
        <Input
          label="Dossier partagé (CSV)"
          value={menaWatchDir}
          onChange={(e) => {
            setClearFlags((p) => ({ ...p, menaWatchDir: false }));
            setMenaWatchDir(e.target.value);
          }}
          placeholder="C:/partage/mena-presence"
        />
        <Input
          label="Horloge d’import (cron)"
          value={menaCron}
          onChange={(e) => {
            setClearFlags((p) => ({ ...p, menaCron: false }));
            setMenaCron(e.target.value);
          }}
          placeholder="15 18 * * *"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={menaImportEnabled}
            onChange={(e) => setMenaImportEnabled(e.target.checked)}
            className="rounded border-gray-300"
          />
          Activer l’import planifié (dossier / base)
        </label>
        <SecretField
          label="URL base SQL externe (optionnel)"
          configured={Boolean(settings?.mena.dbUrlConfigured)}
          fromDb={Boolean(settings?.mena.dbUrlFromDb)}
          value={menaDbUrl}
          onChange={setMenaDbUrl}
          onClear={() => {
            setMenaDbUrl('');
            markClear('menaDbUrl');
          }}
        />
        <Input
          label="Requête SQL"
          value={menaDbQuery}
          onChange={(e) => {
            setClearFlags((p) => ({ ...p, menaDbQuery: false }));
            setMenaDbQuery(e.target.value);
          }}
          placeholder="SELECT matricule, date, statut, check_in_at FROM ..."
        />
      </Card>

      <Card className="space-y-4 border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900">Bornes NFC / biométrie</h3>
        <SecretField
          label="Clé API matériel (X-NFC-API-Key)"
          configured={Boolean(settings?.nfc.apiKeyConfigured)}
          fromDb={Boolean(settings?.nfc.apiKeyFromDb)}
          value={nfcKey}
          onChange={setNfcKey}
          onClear={() => {
            setNfcKey('');
            markClear('nfcKey');
          }}
          help="En production : au moins 32 caractères, unique."
        />
      </Card>

      <Card className="space-y-4 border border-gray-200 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <FiCreditCard className="h-4 w-4 text-emerald-700" /> Paiements en ligne
        </h3>
        <SecretField
          label="Secret webhook paiements"
          configured={Boolean(settings?.payments.webhookSecretConfigured)}
          fromDb={Boolean(settings?.payments.webhookSecretFromDb)}
          value={paymentWebhookSecret}
          onChange={setPaymentWebhookSecret}
          onClear={() => {
            setPaymentWebhookSecret('');
            markClear('paymentWebhook');
          }}
          help="Header x-payment-webhook-secret"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SecretField
            label="Wave API key"
            configured={Boolean(settings?.payments.waveConfigured)}
            fromDb={Boolean(settings?.payments.waveFromDb)}
            value={waveKey}
            onChange={setWaveKey}
            onClear={() => {
              setWaveKey('');
              markClear('wave');
            }}
          />
          <SecretField
            label="Orange Money API key"
            configured={Boolean(settings?.payments.orangeConfigured)}
            fromDb={Boolean(settings?.payments.orangeFromDb)}
            value={orangeKey}
            onChange={setOrangeKey}
            onClear={() => {
              setOrangeKey('');
              markClear('orange');
            }}
          />
          <SecretField
            label="MTN MoMo API key"
            configured={Boolean(settings?.payments.mtnConfigured)}
            fromDb={Boolean(settings?.payments.mtnFromDb)}
            value={mtnKey}
            onChange={setMtnKey}
            onClear={() => {
              setMtnKey('');
              markClear('mtn');
            }}
          />
          <SecretField
            label="MTN MoMo subscription key"
            configured={Boolean(settings?.payments.mtnConfigured)}
            fromDb={Boolean(settings?.payments.mtnFromDb)}
            value={mtnSub}
            onChange={setMtnSub}
            onClear={() => {
              setMtnSub('');
              markClear('mtnSub');
            }}
          />
          <SecretField
            label="CinetPay API key"
            configured={Boolean(settings?.payments.cinetpayConfigured)}
            fromDb={Boolean(settings?.payments.cinetpayFromDb)}
            value={cinetpayKey}
            onChange={setCinetpayKey}
            onClear={() => {
              setCinetpayKey('');
              markClear('cinetpay');
            }}
          />
          <Input
            label="CinetPay Site ID"
            value={cinetpaySiteId}
            onChange={(e) => {
              setClearFlags((p) => ({ ...p, cinetpaySiteId: false }));
              setCinetpaySiteId(e.target.value);
            }}
          />
          <SecretField
            label="Paystack secret key"
            configured={Boolean(settings?.payments.paystackConfigured)}
            fromDb={Boolean(settings?.payments.paystackFromDb)}
            value={paystackKey}
            onChange={setPaystackKey}
            onClear={() => {
              setPaystackKey('');
              markClear('paystack');
            }}
          />
        </div>
        <p className="text-xs text-stone-500">
          CinetPay couvre Moov Money et sert de repli pour Orange / MTN si les APIs natives ne sont pas configurées.
          Collez l’URL webhook CinetPay ci-dessus dans le tableau de bord CinetPay (notify_url).
        </p>
      </Card>

      <Card className="space-y-4 border border-gray-200 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <FiMessageCircle className="h-4 w-4 text-green-700" /> WhatsApp Business
        </h3>
        <SecretField
          label="Token Cloud API"
          configured={Boolean(settings?.whatsapp.configured)}
          fromDb={Boolean(settings?.whatsapp.tokenFromDb)}
          value={waToken}
          onChange={setWaToken}
          onClear={() => {
            setWaToken('');
            markClear('waToken');
          }}
        />
        <Input
          label="Identifiant du numéro WhatsApp"
          value={waPhoneId}
          onChange={(e) => {
            setClearFlags((p) => ({ ...p, waPhoneId: false }));
            setWaPhoneId(e.target.value);
          }}
        />
        <Input
          label="Indicatif pays par défaut (WhatsApp & Mobile Money)"
          value={waCountry}
          onChange={(e) => {
            setClearFlags((p) => ({ ...p, waCountry: false }));
            setWaCountry(e.target.value);
          }}
          placeholder="225"
        />
        <p className="text-xs text-stone-500">
          Ex. 225 (Côte d’Ivoire) — utilisé pour les numéros Mobile Money et WhatsApp.
        </p>
      </Card>

      <Card className="space-y-4 border border-gray-200 p-4">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <FiMail className="h-4 w-4 text-indigo-700" /> E-mail (SMTP)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Serveur SMTP"
            value={smtpHost}
            onChange={(e) => {
              setClearFlags((p) => ({ ...p, smtpHost: false }));
              setSmtpHost(e.target.value);
            }}
            placeholder="smtp.example.com"
          />
          <Input
            label="Port"
            value={smtpPort}
            onChange={(e) => {
              setClearFlags((p) => ({ ...p, smtpPort: false }));
              setSmtpPort(e.target.value);
            }}
            placeholder="587"
          />
          <Input
            label="Utilisateur"
            value={smtpUser}
            onChange={(e) => {
              setClearFlags((p) => ({ ...p, smtpUser: false }));
              setSmtpUser(e.target.value);
            }}
          />
          <SecretField
            label="Mot de passe"
            configured={Boolean(settings?.smtp.passConfigured)}
            fromDb={Boolean(settings?.smtp.passFromDb)}
            value={smtpPass}
            onChange={setSmtpPass}
            onClear={() => {
              setSmtpPass('');
              markClear('smtpPass');
            }}
          />
          <Input
            label="Adresse d’expédition (From)"
            value={emailFrom}
            onChange={(e) => {
              setClearFlags((p) => ({ ...p, emailFrom: false }));
              setEmailFrom(e.target.value);
            }}
            placeholder="noreply@ecole.ci"
          />
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              className="rounded border-gray-300"
            />
            Connexion sécurisée (TLS / port 465)
          </label>
        </div>
        <StatusPill
          configured={Boolean(settings?.smtp.configured)}
          fromDb={Boolean(settings?.smtp.hostFromDb || settings?.smtp.passFromDb)}
        />
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
          <FiSave className="mr-2 h-4 w-4" />
          Enregistrer toutes les sections
        </Button>
      </div>
    </div>
  );
}
