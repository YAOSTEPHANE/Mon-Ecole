import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { staffApi, type CounterStudent, type CounterTuitionFee } from '../api/staff';
import { colors } from '../theme';
import {
  PremiumButton,
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumInput,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../components/premium/PremiumUi';

function fmtMoney(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

export default function StaffCounterScreen() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CounterStudent[]>([]);
  const [selected, setSelected] = useState<CounterStudent | null>(null);
  const [fees, setFees] = useState<CounterTuitionFee[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feeId, setFeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return;
    }
    void (async () => {
      setSearching(true);
      try {
        setResults(await staffApi.searchStudentsForCounter(debounced));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    })();
  }, [debounced]);

  useEffect(() => {
    if (!selected) {
      setFees([]);
      setFeeId('');
      setAmount('');
      return;
    }
    void (async () => {
      setFeesLoading(true);
      try {
        const list = await staffApi.getStudentTuitionFeesForCounter(selected.id);
        setFees(list);
        const first = list.find((f) => f.remainingAmount > 0);
        if (first) {
          setFeeId(first.id);
          setAmount(String(Math.round(first.remainingAmount)));
        }
      } catch {
        setFees([]);
      } finally {
        setFeesLoading(false);
      }
    })();
  }, [selected]);

  const payableFees = useMemo(() => fees.filter((f) => f.remainingAmount > 0), [fees]);
  const selectedFee = fees.find((f) => f.id === feeId);

  const onPay = () => {
    if (!selected || !feeId) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant positif.');
      return;
    }
    void (async () => {
      try {
        setSaving(true);
        await staffApi.recordCounterTuitionPayment(selected.id, {
          tuitionFeeId: feeId,
          amount: amt,
          paymentMethod: method,
          notes: notes.trim() || undefined,
        });
        Alert.alert('Succès', 'Paiement enregistré.');
        setNotes('');
        const list = await staffApi.getStudentTuitionFeesForCounter(selected.id);
        setFees(list);
        const first = list.find((f) => f.remainingAmount > 0);
        if (first) {
          setFeeId(first.id);
          setAmount(String(Math.round(first.remainingAmount)));
        } else {
          setFeeId('');
          setAmount('');
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Échec de l’enregistrement.';
        Alert.alert('Erreur', msg);
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader eyebrow="Caisse" title="Guichet" subtitle="Encaissement des frais de scolarité" />
      <View style={screenPad.fill}>
        <Text style={styles.label}>Rechercher un élève (min. 2 caractères)</Text>
        <PremiumInput
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, prénom ou n° élève"
        />
        {searching ? <ActivityIndicator color={colors.gold} style={{ marginTop: 8 }} /> : null}
        {selected ? (
          <View style={styles.selected}>
            <Text style={styles.selectedTitle}>
              {selected.user?.firstName} {selected.user?.lastName}
            </Text>
            <Text style={styles.selectedSub}>
              {[selected.class?.name, selected.studentId].filter(Boolean).join(' · ')}
            </Text>
            <Pressable onPress={() => setSelected(null)}>
              <Text style={styles.change}>Changer d’élève</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(s) => s.id}
            style={styles.results}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              debounced.length >= 2 && !searching ? (
                <PremiumEmpty icon="search-outline" title="Aucun élève trouvé." />
              ) : null
            }
            renderItem={({ item }) => (
              <PremiumListItem
                title={`${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''}`.trim()}
                subtitle={[item.class?.name, item.studentId].filter(Boolean).join(' · ')}
                onPress={() => setSelected(item)}
              />
            )}
          />
        )}

      {selected ? (
        <View style={styles.panel}>
          <Text style={styles.label}>Frais à régler</Text>
          {feesLoading ? (
            <ActivityIndicator color={colors.gold} />
          ) : payableFees.length === 0 ? (
            <PremiumEmpty icon="card-outline" title="Aucun solde restant pour cet élève." />
          ) : (
            <>
              {payableFees.map((f) => (
                <PremiumListItem
                  key={f.id}
                  title={`${f.period} · ${f.academicYear}`}
                  subtitle={`Reste : ${fmtMoney(f.remainingAmount)} / ${fmtMoney(f.amount)}`}
                  accent={f.id === feeId}
                  onPress={() => {
                    setFeeId(f.id);
                    setAmount(String(Math.round(f.remainingAmount)));
                  }}
                />
              ))}

              <Text style={styles.label}>Montant</Text>
              <PremiumInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <PremiumChipRow>
                {(['CASH', 'BANK_TRANSFER'] as const).map((m) => (
                  <PremiumFilterChip
                    key={m}
                    label={m === 'CASH' ? 'Espèces' : 'Virement'}
                    active={method === m}
                    onPress={() => setMethod(m)}
                  />
                ))}
              </PremiumChipRow>

              <Text style={styles.label}>Notes (optionnel)</Text>
              <PremiumInput value={notes} onChangeText={setNotes} />

              <View style={{ marginTop: 14 }}>
                <PremiumButton
                  label={`Encaisser ${amount ? fmtMoney(Number(amount) || 0) : ''}`}
                  onPress={onPay}
                  loading={saving}
                  disabled={!selectedFee}
                />
              </View>
            </>
          )}
        </View>
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 16 },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 6, marginTop: 10 },
  results: { maxHeight: 220, marginTop: 8 },
  selected: {
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  selectedSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  change: { fontSize: 13, fontWeight: '800', color: colors.navy, marginTop: 8 },
});
