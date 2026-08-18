type MobileMoneyLiveHintProps = {
  operator?: string;
  amountLabel: string;
};

export default function MobileMoneyLiveHint({ operator, amountLabel }: MobileMoneyLiveHintProps) {
  const op = (operator || '').toUpperCase();
  const title =
    op === 'WAVE'
      ? 'Wave'
      : op.includes('ORANGE')
        ? 'Orange Money'
        : op.includes('MTN')
          ? 'MTN MoMo'
          : op.includes('MOOV')
            ? 'Moov Money'
            : 'Mobile Money';

  return (
    <div className="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
      <p className="mb-2 text-sm font-semibold text-gray-900">
        Paiement {title} — {amountLabel}
      </p>
      <ol className="list-inside list-decimal space-y-1 text-xs text-gray-700">
        <li>Validez le montant puis continuez : une page sécurisée ou une demande sur votre téléphone s’ouvre.</li>
        <li>Confirmez dans l’application opérateur (PIN). Aucun code USSD à composer, aucun code SMS à recopier.</li>
        <li>Le reçu s’affiche automatiquement dès confirmation. En sandbox, l’économat confirme manuellement.</li>
      </ol>
    </div>
  );
}
