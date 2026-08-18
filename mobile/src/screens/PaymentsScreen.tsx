import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { normalizeRole } from '../lib/roles';
import { studentApi, type StudentPayment } from '../api/student';
import { parentApi, type ParentPayment, type ParentTuitionFee } from '../api/parent';
import ParentChildPicker from './ParentChildPicker';
import { useParentChild } from '../context/ParentChildContext';
import {
  PremiumButton,
  PremiumCard,
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumInput,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';
import { apiError } from '../lib/format';

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Payé',
  PAID: 'Payé',
  SUCCESS: 'Payé',
  PENDING: 'En attente',
  FAILED: 'Échec',
};

const METHODS: Array<{ id: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD'; label: string }> = [
  { id: 'CASH', label: 'Espèces' },
  { id: 'MOBILE_MONEY', label: 'Mobile money' },
  { id: 'BANK_TRANSFER', label: 'Virement' },
  { id: 'CARD', label: 'Carte' },
];

const OPERATORS: Array<{ id: string; label: string }> = [
  { id: 'WAVE', label: 'Wave' },
  { id: 'ORANGE_MONEY', label: 'Orange' },
  { id: 'MTN_MOBILE_MONEY', label: 'MTN' },
  { id: 'MOOV_MONEY', label: 'Moov' },
];

function money(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} F`;
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role ?? '');
  const { selectedId: parentChildId } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<StudentPayment | ParentPayment>>([]);
  const [fees, setFees] = useState<ParentTuitionFee[]>([]);
  const [feeId, setFeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD'>('CASH');
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState('WAVE');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (role === 'STUDENT') {
      setItems(await studentApi.getPayments());
      return;
    }
    if (role === 'PARENT' && parentChildId) {
      const [pays, tuition] = await Promise.all([
        parentApi.getChildPayments(parentChildId),
        parentApi.getChildTuitionFees(parentChildId),
      ]);
      setItems(pays);
      setFees(tuition);
      const first = tuition.find((f) => (f.remainingAmount ?? 0) > 0);
      if (first) {
        setFeeId(first.id);
        setAmount(String(Math.round(first.remainingAmount ?? 0)));
      }
    }
  }, [role, parentChildId]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setItems([]);
        setFees([]);
        await reload();
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  const rows = useMemo(
    () =>
      items.map((p, idx) => {
        const status = (p.status ?? '').toUpperCase();
        const amt = typeof p.amount === 'number' ? money(p.amount) : 'Paiement';
        return {
          id: p.id ?? String(idx),
          title: amt,
          subtitle: [STATUS_LABELS[status] ?? p.status, p.paymentMethod, p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : null]
            .filter(Boolean)
            .join(' · '),
          value: STATUS_LABELS[status] ?? status ?? '—',
        };
      }),
    [items],
  );

  const pay = async () => {
    if (!parentChildId || !feeId) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Montant', 'Saisissez un montant positif.');
      return;
    }
    if (method === 'MOBILE_MONEY' && !phone.trim()) {
      Alert.alert('Téléphone', 'Saisissez le numéro Mobile Money.');
      return;
    }
    try {
      setSaving(true);
      const data = await parentApi.createPayment(parentChildId, {
        tuitionFeeId: feeId,
        paymentMethod: method,
        amount: amt,
        phoneNumber: method === 'MOBILE_MONEY' ? phone.trim() || undefined : undefined,
        operator: method === 'MOBILE_MONEY' ? operator : undefined,
      });
      const checkoutUrl = data.checkoutUrl?.trim();
      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
      }
      const paymentId = data.payment?.id;
      if (method === 'CASH' || method === 'BANK_TRANSFER') {
        Alert.alert('Paiement', 'Déclaration enregistrée. L’économe validera après réception.');
      } else if (data.mode === 'live' && paymentId) {
        Alert.alert(
          'Paiement',
          data.ussdHint || 'Validez sur votre téléphone. Le reçu arrivera automatiquement.',
        );
        const deadline = Date.now() + 120_000;
        while (Date.now() < deadline) {
          const snap = await parentApi.getChildPayment(parentChildId, paymentId);
          const st = (snap.status ?? '').toUpperCase();
          if (st === 'COMPLETED' || st === 'PAID' || st === 'SUCCESS') {
            Alert.alert('Paiement', 'Confirmé. Le reçu est disponible.');
            break;
          }
          if (st === 'FAILED' || st === 'CANCELLED' || st === 'CANCELED' || st === 'EXPIRED') {
            Alert.alert('Paiement', 'Non abouti. Vous pouvez réessayer.');
            break;
          }
          await new Promise((r) => setTimeout(r, 3000));
        }
      } else if (!checkoutUrl) {
        Alert.alert('Paiement', data.message || 'Paiement enregistré. Confirmation automatique dès validation opérateur.');
      }
      await reload();
    } catch (err) {
      Alert.alert('Erreur', apiError(err, 'Paiement impossible.'));
    } finally {
      setSaving(false);
    }
  };

  const unpaid = fees.filter((f) => (f.remainingAmount ?? 0) > 0);

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader eyebrow="Finances" title="Paiements" subtitle={`${rows.length} opération(s)`} />
      <View style={screenPad.fill}>
        {role === 'PARENT' ? <ParentChildPicker /> : null}
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(r) => r.id}
            ListHeaderComponent={
              role === 'PARENT' ? (
                <PremiumCard eyebrow="Frais" title="Scolarité à régler">
                  {unpaid.length === 0 ? (
                    <PremiumEmpty icon="card-outline" title="Aucun solde restant" />
                  ) : (
                    unpaid.map((f) => (
                      <PremiumListItem
                        key={f.id}
                        title={`${f.period ?? 'Période'} · ${f.academicYear ?? ''}`}
                        subtitle={`Reste ${money(f.remainingAmount ?? 0)} / ${money(f.amount)}`}
                        value={feeId === f.id ? 'Sélectionné' : 'Payer'}
                        accent={feeId === f.id}
                        onPress={() => {
                          setFeeId(f.id);
                          setAmount(String(Math.round(f.remainingAmount ?? 0)));
                        }}
                      />
                    ))
                  )}
                  {unpaid.length > 0 ? (
                    <>
                      <PremiumChipRow>
                        {METHODS.map((m) => (
                          <PremiumFilterChip
                            key={m.id}
                            label={m.label}
                            active={method === m.id}
                            onPress={() => setMethod(m.id)}
                          />
                        ))}
                      </PremiumChipRow>
                      <PremiumInput
                        placeholder="Montant"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        style={{ marginBottom: 8 }}
                      />
                      {method === 'MOBILE_MONEY' ? (
                        <>
                          <PremiumChipRow>
                            {OPERATORS.map((op) => (
                              <PremiumFilterChip
                                key={op.id}
                                label={op.label}
                                active={operator === op.id}
                                onPress={() => setOperator(op.id)}
                              />
                            ))}
                          </PremiumChipRow>
                          <PremiumInput
                            placeholder="Téléphone mobile money (+225 …)"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            style={{ marginBottom: 8 }}
                          />
                        </>
                      ) : null}
                      <PremiumButton
                        label={method === 'CASH' || method === 'BANK_TRANSFER' ? 'Déclarer le paiement' : 'Payer'}
                        onPress={() => void pay()}
                        loading={saving}
                      />
                    </>
                  ) : null}
                </PremiumCard>
              ) : null
            }
            ListEmptyComponent={
              <PremiumEmpty icon="card-outline" title="Aucun paiement" body="Les encaissements apparaîtront ici." />
            }
            renderItem={({ item }) => (
              <PremiumListItem title={item.title} subtitle={item.subtitle} value={item.value} />
            )}
          />
        )}
      </View>
    </View>
  );
}
