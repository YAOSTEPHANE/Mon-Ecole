import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import {
  createMobileMoneyPaymentForParent,
  createMobileMoneyPaymentForStudent,
  getPaymentForParent,
  getPaymentForStudent,
  getPaymentSettings,
  type MobileMoneyOperator,
  listChildren,
  listTuitionFeesForChild,
  listTuitionFeesForStudent,
  type ParentChildRow,
  type PaymentRow,
  type TuitionFeeRow,
} from '../api/payments';
import type { AppRole } from '../lib/roles';

const PAYMENT_OPERATORS: Array<{ key: MobileMoneyOperator; label: string }> = [
  { key: 'WAVE', label: 'Wave' },
  { key: 'ORANGE', label: 'Orange Money' },
  { key: 'MTN', label: 'MTN MoMo' },
];

function formatMoneyFcfa(amount: number): string {
  try {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  } catch {
    return `${Math.round(amount)} FCFA`;
  }
}

function isPaymentSettled(status: string): status is 'COMPLETED' | 'FAILED' {
  return status === 'COMPLETED' || status === 'FAILED';
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const [paymentSettings, setPaymentSettings] = useState<{ defaultCountryCode: string } | null>(null);
  const [children, setChildren] = useState<ParentChildRow[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [tuitionFees, setTuitionFees] = useState<TuitionFeeRow[]>([]);

  const [selectedTuitionFeeId, setSelectedTuitionFeeId] = useState<string | null>(null);
  const selectedFee = useMemo(() => tuitionFees.find((f) => f.id === selectedTuitionFeeId) ?? null, [
    tuitionFees,
    selectedTuitionFeeId,
  ]);

  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [operator, setOperator] = useState<MobileMoneyOperator>('WAVE');

  const [starting, setStarting] = useState(false);
  const [pollPaymentId, setPollPaymentId] = useState<string | null>(null);
  const [pollPayment, setPollPayment] = useState<PaymentRow | null>(null);
  const [polling, setPolling] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRole = role.toUpperCase();
  const isParent = activeRole === 'PARENT';
  const isStudent = activeRole === 'STUDENT';
  const supportedRole: AppRole | null = isParent ? 'PARENT' : isStudent ? 'STUDENT' : null;

  useEffect(() => {
    void (async () => {
      if (!user) return;
      if (!supportedRole) return;

      try {
        const settings = await getPaymentSettings(supportedRole);
        setPaymentSettings(settings);
      } catch {
        setPaymentSettings({ defaultCountryCode: '225' });
      }
    })();
  }, [user, supportedRole]);

  useEffect(() => {
    if (!user || !isParent) return;
    void (async () => {
      const rows = await listChildren();
      setChildren(rows);
      const first = rows[0]?.studentId ?? null;
      setSelectedChildId(first);
    })();
  }, [user, isParent]);

  useEffect(() => {
    if (!user) return;
    if (isParent) {
      if (!selectedChildId) return;
      void (async () => {
        const rows = await listTuitionFeesForChild(selectedChildId);
        setTuitionFees(rows);
      })();
      return;
    }

    if (isStudent) {
      void (async () => {
        const rows = await listTuitionFeesForStudent();
        setTuitionFees(rows);
      })();
    }
  }, [user, isParent, isStudent, selectedChildId]);

  useEffect(() => {
    if (!selectedFee) return;
    if (!phoneNumber) {
      const fallbackPhone = typeof user?.phone === 'string' ? user.phone : '';
      setPhoneNumber(fallbackPhone);
    }
    if (!amountInput) {
      const defaultAmount = Number(selectedFee.remainingAmount ?? 0);
      setAmountInput(defaultAmount > 0 ? String(defaultAmount) : '');
    }
  }, [selectedFee, user, phoneNumber, amountInput]);

  useEffect(() => {
    // Choix automatique du premier frais restant (quand on charge / change enfant)
    const unpaid = tuitionFees.find((f) => Number(f.remainingAmount) > 0);
    if (!unpaid) return;
    setSelectedTuitionFeeId((prev) => prev ?? unpaid.id);
  }, [tuitionFees]);

  useEffect(() => {
    if (!pollPaymentId || !user) return;

    setPolling(true);
    const startedAt = Date.now();
    const timeoutMs = 180_000;

    void (async () => {
      const tick = async () => {
        try {
          if (!pollPaymentId) return;
          const statusPayment = isParent
            ? selectedChildId
              ? await getPaymentForParent({ studentId: selectedChildId, paymentId: pollPaymentId })
              : null
            : await getPaymentForStudent({ paymentId: pollPaymentId });

          if (!statusPayment) {
            throw new Error('Enfant manquant pendant le polling');
          }
          setPollPayment(statusPayment);

          const status = String(statusPayment.status);
          if (isPaymentSettled(status)) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setPolling(false);
            setPollPaymentId(null);

            if (status === 'COMPLETED') {
              const receiptUrl = statusPayment.receiptUrl ?? null;
              const receiptNumber = statusPayment.receiptNumber ?? null;
              Alert.alert(
                'Paiement confirmé',
                receiptNumber
                  ? `Reçu ${receiptNumber} disponible.`
                  : receiptUrl
                    ? 'Reçu disponible.'
                    : 'Paiement confirmé.',
              );
              if (receiptUrl) void Linking.openURL(receiptUrl);
            } else {
              Alert.alert('Paiement échoué', 'Le paiement n’a pas abouti. Vous pouvez réessayer.');
            }
          } else {
            // Toujours en attente : on garde.
            const elapsed = Date.now() - startedAt;
            if (elapsed > timeoutMs) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
              setPolling(false);
              setPollPaymentId(null);
              Alert.alert(
                'Temps de confirmation dépassé',
                'Le reçu arrivera dès confirmation de l’opérateur. Vous pouvez relancer plus tard.',
              );
            }
          }
        } catch (e) {
          // On ne bloque pas : on laisse poll retry.
          const elapsed = Date.now() - startedAt;
          if (elapsed > timeoutMs) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setPolling(false);
            setPollPaymentId(null);
            Alert.alert('Impossible de suivre le paiement', 'Réessayez ultérieurement.');
          }
        }
      };

      // Premier tick immédiat
      await tick();
      pollIntervalRef.current = setInterval(() => {
        void tick();
      }, 2500);
    })();

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setPolling(false);
    };
  }, [pollPaymentId, user, isParent, isStudent, selectedChildId]);

  const submitDisabled = useMemo(() => {
    if (!user) return true;
    if (!selectedFee) return true;
    if (starting || polling) return true;
    if (!phoneNumber.trim()) return true;
    const n = Number(amountInput);
    return !Number.isFinite(n) || n <= 0;
  }, [user, selectedFee, starting, polling, phoneNumber, amountInput]);

  const currentFeeRemaining = Number(selectedFee?.remainingAmount ?? 0);

  const onCreatePayment = async () => {
    if (!user || !selectedFee) return;
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant valide.');
      return;
    }

    setStarting(true);
    try {
      const operatorValue = operator;
      const phone = phoneNumber.trim();

      if (isParent) {
        if (!selectedChildId) throw new Error('Enfant non sélectionné');
        const data = await createMobileMoneyPaymentForParent({
          studentId: selectedChildId,
          tuitionFeeId: selectedFee.id,
          amount,
          phoneNumber: phone,
          operator: operatorValue,
        });

        setPollPaymentId(data.payment.id);
        setPollPayment(data.payment);
        if (data.checkoutUrl) {
          // En sandbox / mobile money, on peut ne pas avoir d’URL exploitable — on ignore si absent.
          void Linking.openURL(data.checkoutUrl);
        } else if (data.ussdHint) {
          Alert.alert('Action à effectuer', data.ussdHint);
        }
      } else if (isStudent) {
        const data = await createMobileMoneyPaymentForStudent({
          tuitionFeeId: selectedFee.id,
          amount,
          phoneNumber: phone,
          operator: operatorValue,
        });

        setPollPaymentId(data.payment.id);
        setPollPayment(data.payment);
        if (data.checkoutUrl) {
          void Linking.openURL(data.checkoutUrl);
        } else if (data.ussdHint) {
          Alert.alert('Action à effectuer', data.ussdHint);
        }
      } else {
        Alert.alert('Paiements indisponibles', 'Votre rôle ne permet pas ce parcours.');
      }
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message ?? 'Erreur')
          : 'Erreur lors de l’initiation du paiement';
      Alert.alert('Paiement', msg);
    } finally {
      setStarting(false);
    }
  };

  const title = isParent ? 'Paiements (Parent)' : isStudent ? 'Paiements (Élève)' : 'Paiements';

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>{title}</Text>

      {!isParent && !isStudent ? (
        <Text style={styles.muted}>Connectez-vous en tant que parent ou élève pour utiliser Paiements.</Text>
      ) : null}

      {paymentSettings ? (
        <Text style={styles.muted}>Indicatif par défaut : +{paymentSettings.defaultCountryCode}</Text>
      ) : null}

      {isParent ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisir un enfant</Text>
          {children.length === 0 ? (
            <Text style={styles.muted}>Chargement…</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.childrenRow}>
                {children.map((c) => {
                  const label = `${c.student?.user?.firstName ?? ''} ${c.student?.user?.lastName ?? ''}`.trim();
                  const active = c.studentId === selectedChildId;
                  return (
                    <Pressable
                      key={c.studentId}
                      onPress={() => setSelectedChildId(c.studentId)}
                      style={[styles.childChip, active ? styles.childChipActive : null]}
                    >
                      <Text style={[styles.childChipText, active ? styles.childChipTextActive : null]}>
                        {label || 'Enfant'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frais à payer</Text>
        {tuitionFees.length === 0 ? (
          <Text style={styles.muted}>Chargement…</Text>
        ) : (
          tuitionFees
            .slice()
            .sort((a, b) => {
              const ra = Number(a.remainingAmount ?? 0);
              const rb = Number(b.remainingAmount ?? 0);
              return rb - ra;
            })
            .map((fee) => {
              const active = fee.id === selectedTuitionFeeId;
              const remaining = Number(fee.remainingAmount ?? 0);
              const canPay = remaining > 0;
              const dueDateLabel =
                typeof fee.dueDate === 'string'
                  ? fee.dueDate
                  : fee.dueDate instanceof Date
                    ? fee.dueDate.toISOString()
                    : '';
              return (
                <Pressable
                  key={fee.id}
                  onPress={() => canPay && setSelectedTuitionFeeId(fee.id)}
                  style={[styles.feeRow, active ? styles.feeRowActive : null, !canPay ? styles.feeRowDisabled : null]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feeTitle}>
                      {fee.period ? `${fee.period} — ` : ''}
                      {fee.academicYear ? String(fee.academicYear) : 'Frais'}
                    </Text>
                    <Text style={styles.feeMeta}>
                      Reste : {formatMoneyFcfa(remaining)}
                      {dueDateLabel ? ` · Échéance : ${dueDateLabel}` : ''}
                    </Text>
                  </View>
                  <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                    <Text style={styles.feeAmount}>{active ? 'Sélectionné' : canPay ? 'Disponible' : 'Payé'}</Text>
                  </View>
                </Pressable>
              );
            })
        )}
      </View>

      {selectedFee ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paiement Mobile Money</Text>

          <Text style={styles.label}>Opérateur</Text>
          <View style={styles.operatorRow}>
            {PAYMENT_OPERATORS.map((op) => {
              const active = op.key === operator;
              return (
                <Pressable
                  key={op.key}
                  onPress={() => setOperator(op.key)}
                  style={[styles.opChip, active ? styles.opChipActive : null]}
                >
                  <Text style={[styles.opChipText, active ? styles.opChipTextActive : null]}>{op.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Ex. 0700000000 ou +2250700000000"
            keyboardType="phone-pad"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>Montant</Text>
          <TextInput
            value={amountInput}
            onChangeText={setAmountInput}
            placeholder={`Montant (reste: ${formatMoneyFcfa(currentFeeRemaining)})`}
            keyboardType="numeric"
            style={styles.input}
          />

          {paymentSettings ? (
            <Text style={styles.muted}>
              {`Conseil : utilisez le numéro au format ${paymentSettings.defaultCountryCode} + 8 à 10 chiffres.`}
            </Text>
          ) : null}

          <Pressable disabled={submitDisabled} onPress={onCreatePayment} style={[styles.payBtn, submitDisabled ? styles.payBtnDisabled : null]}>
            {starting ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.payBtnText}>Payer {formatMoneyFcfa(Number(amountInput) || 0)}</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Text style={styles.muted}>Sélectionnez un frais disponible pour continuer.</Text>
      )}

      {polling && pollPayment ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmation en cours</Text>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Statut : {String(pollPayment.status)}</Text>
          {pollPayment.receiptNumber ? <Text style={styles.muted}>Reçu : {pollPayment.receiptNumber}</Text> : null}
          {pollPayment.ussdHint ? <Text style={styles.muted}>{pollPayment.ussdHint}</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 18 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  muted: { color: colors.muted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  section: { backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', color: colors.ink, fontSize: 14 },
  payBtn: { marginTop: 14, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.55 },
  payBtnText: { color: colors.card, fontWeight: '900', fontSize: 16 },
  childrenRow: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
  childChip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginRight: 10 },
  childChipActive: { borderColor: colors.accent, backgroundColor: '#fff7ed' },
  childChipText: { color: colors.ink, fontWeight: '800' },
  childChipTextActive: { color: colors.accent },
  feeRow: { flexDirection: 'row', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  feeRowActive: { borderColor: colors.accent, backgroundColor: '#fff7ed' },
  feeRowDisabled: { opacity: 0.55 },
  feeTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
  feeMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  feeAmount: { fontSize: 12, fontWeight: '900', color: colors.accent, textAlign: 'right', maxWidth: 110 },
  operatorRow: { flexDirection: 'row', marginBottom: 2, gap: 10 },
  opChip: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, marginRight: 10 },
  opChipActive: { borderColor: colors.accent, backgroundColor: '#fff7ed' },
  opChipText: { color: colors.ink, fontWeight: '800' },
  opChipTextActive: { color: colors.accent },
});

