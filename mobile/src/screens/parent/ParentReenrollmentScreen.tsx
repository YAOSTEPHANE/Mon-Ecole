import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import {
  PremiumButton,
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumFormStack,
  PremiumInput,
  PremiumListItem,
} from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { apiError, str } from '../../lib/format';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
};

export default function ParentReenrollmentScreen() {
  const { selectedId } = useParentChild();
  const [year, setYear] = useState('');
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const [opts, list] = await Promise.all([
        parentApi.getChildReenrollmentOptions(selectedId),
        parentApi.getChildReenrollmentRequests(selectedId),
      ]);
      setYear(opts.targetAcademicYear ?? '');
      setClasses(opts.classes ?? []);
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!selectedId || !year.trim()) {
      Alert.alert('Réinscription', 'Année cible requise.');
      return;
    }
    try {
      setSaving(true);
      await parentApi.createChildReenrollmentRequest(selectedId, {
        targetAcademicYear: year.trim(),
        preferredClassId: classId || undefined,
        message: message.trim() || undefined,
      });
      setMessage('');
      await load();
      Alert.alert('Envoyée', 'Demande de réinscription enregistrée.');
    } catch (err) {
      Alert.alert('Erreur', apiError(err, 'Demande impossible.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ParentModuleShell eyebrow="Inscription" title="Réinscription" scroll>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      <PremiumFormStack>
        <PremiumInput placeholder="Année cible" value={year} onChangeText={setYear} />
        <PremiumChipRow style={{ marginBottom: 0 }}>
          {classes.map((c) => (
            <PremiumFilterChip
              key={c.id}
              label={c.name}
              active={classId === c.id}
              onPress={() => setClassId(classId === c.id ? '' : c.id)}
            />
          ))}
        </PremiumChipRow>
        <PremiumInput placeholder="Message (optionnel)" value={message} onChangeText={setMessage} />
        <PremiumButton label="Déposer une demande" onPress={() => void submit()} loading={saving} />
      </PremiumFormStack>
      {requests.length === 0 ? (
        <PremiumEmpty icon="refresh-outline" title="Aucune demande" />
      ) : (
        requests.map((r, i) => (
          <PremiumListItem
            key={str(r.id, String(i))}
            title={str(r.targetAcademicYear, 'Demande')}
            subtitle={STATUS_LABELS[str(r.status)] ?? str(r.status)}
            value={r.status === 'PENDING' ? 'Annuler' : STATUS_LABELS[str(r.status)] ?? str(r.status)}
            onPress={
              r.status === 'PENDING' && selectedId
                ? () => {
                    void (async () => {
                      try {
                        await parentApi.cancelChildReenrollmentRequest(selectedId, String(r.id));
                        await load();
                      } catch (err) {
                        Alert.alert('Erreur', apiError(err, 'Annulation impossible.'));
                      }
                    })();
                  }
                : undefined
            }
          />
        ))
      )}
    </ParentModuleShell>
  );
}
