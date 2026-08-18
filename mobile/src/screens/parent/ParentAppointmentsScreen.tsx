import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { parentApi, type ParentAppointment } from '../../api/parent';
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
import { apiError, fmtDateTime } from '../../lib/format';

const STATUS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  DECLINED: 'Refusé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
};

export default function ParentAppointmentsScreen() {
  const { selectedId } = useParentChild();
  const [rows, setRows] = useState<ParentAppointment[]>([]);
  const [teachers, setTeachers] = useState<Array<{ teacherId: string; label?: string; firstName?: string; lastName?: string }>>([]);
  const [teacherId, setTeacherId] = useState('');
  const [when, setWhen] = useState('');
  const [topic, setTopic] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await parentApi.getAppointments());
      if (selectedId) {
        setTeachers(await parentApi.getAppointmentTeachers(selectedId));
      }
    } catch {
      setRows([]);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!selectedId || !teacherId || !when.trim()) {
      Alert.alert('RDV', 'Enfant, enseignant et date/heure sont requis.');
      return;
    }
    try {
      setSaving(true);
      const iso = new Date(when.replace(' ', 'T')).toISOString();
      await parentApi.createAppointment({
        studentId: selectedId,
        teacherId,
        scheduledStart: iso,
        durationMinutes: 30,
        topic: topic.trim() || undefined,
      });
      setTopic('');
      setWhen('');
      await load();
      Alert.alert('Demande envoyée', 'Le rendez-vous est en attente de confirmation.');
    } catch (err) {
      Alert.alert('Erreur', apiError(err, 'Impossible de créer le rendez-vous.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ParentModuleShell eyebrow="Rencontres" title="Rendez-vous" requireChild scroll>
      <PremiumChipRow>
        {teachers.map((t) => {
          const label = t.label || `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim();
          return (
            <PremiumFilterChip
              key={t.teacherId}
              label={label}
              active={teacherId === t.teacherId}
              onPress={() => setTeacherId(t.teacherId)}
            />
          );
        })}
      </PremiumChipRow>
      <PremiumFormStack>
        <PremiumInput
          placeholder="Date et heure (AAAA-MM-JJTHH:MM)"
          value={when}
          onChangeText={setWhen}
          autoCapitalize="none"
        />
        <PremiumInput placeholder="Sujet (optionnel)" value={topic} onChangeText={setTopic} />
        <PremiumButton label="Demander un RDV" onPress={() => void create()} loading={saving} disabled={!selectedId} />
      </PremiumFormStack>

      <View style={{ marginTop: 4 }}>
        {rows.length === 0 ? (
          <PremiumEmpty icon="people-outline" title="Aucun rendez-vous" />
        ) : (
          <FlatList
            scrollEnabled={false}
            data={rows}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <PremiumListItem
                title={`${item.teacher?.user?.firstName ?? ''} ${item.teacher?.user?.lastName ?? ''}`.trim() || 'Enseignant'}
                subtitle={[item.topic, fmtDateTime(item.scheduledStart), `${item.durationMinutes} min`].filter(Boolean).join(' · ')}
                value={STATUS[item.status] ?? item.status}
                onPress={
                  item.status === 'PENDING' || item.status === 'CONFIRMED'
                    ? () => {
                        Alert.alert('Annuler ce RDV ?', '', [
                          { text: 'Non', style: 'cancel' },
                          {
                            text: 'Annuler',
                            style: 'destructive',
                            onPress: () => {
                              void (async () => {
                                try {
                                  await parentApi.cancelParentAppointment(item.id);
                                  await load();
                                } catch (err) {
                                  Alert.alert('Erreur', apiError(err, 'Annulation impossible.'));
                                }
                              })();
                            },
                          },
                        ]);
                      }
                    : undefined
                }
              />
            )}
          />
        )}
      </View>
    </ParentModuleShell>
  );
}
