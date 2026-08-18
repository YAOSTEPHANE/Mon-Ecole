import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Switch } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import {
  PremiumButton,
  PremiumCard,
  PremiumInput,
  PremiumListItem,
  PremiumRow,
} from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import ParentChildPicker from '../ParentChildPicker';
import { childDisplayName, useParentChild } from '../../context/ParentChildContext';
import { apiError, str } from '../../lib/format';

const CONSENTS = [
  { type: 'IMAGE_PUBLICATION', label: 'Publication d’images' },
  { type: 'SCHOOL_TRIP', label: 'Sorties / voyages' },
  { type: 'MEDICAL_EMERGENCY', label: 'Urgences médicales' },
  { type: 'DATA_PROCESSING', label: 'Traitement des données' },
  { type: 'COMMUNICATION_CHANNELS', label: 'Canaux de communication' },
  { type: 'AUTHORIZED_PICKUP_POLICY', label: 'Politique de récupération' },
];

export default function ParentFamilyScreen() {
  const { selectedId, childrenList, setSelectedId } = useParentChild();
  const [loading, setLoading] = useState(true);
  const [profession, setProfession] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; label?: string; phone?: string; email?: string }>>([]);
  const [consents, setConsents] = useState<Array<{ consentType: string; granted: boolean }>>([]);
  const [pickups, setPickups] = useState<Array<{ id: string; authorizedName?: string; phone?: string }>>([]);
  const [contactLabel, setContactLabel] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await parentApi.getMyProfile();
      setProfession(str(profile.profession, ''));
      setNotifyEmail(Boolean(profile.notifyEmail ?? true));
      setNotifySms(Boolean(profile.notifySms));
      const c = profile.contacts ?? profile.emergencyContacts;
      setContacts(Array.isArray(c) ? (c as Array<{ id: string; label?: string; phone?: string; email?: string }>) : []);
      const cons = profile.consents;
      setConsents(Array.isArray(cons) ? (cons as Array<{ consentType: string; granted: boolean }>) : []);
      const students = profile.students as Array<{ id?: string; pickupAuthorizations?: unknown[] }> | undefined;
      const mine = students?.find((s) => s.id === selectedId);
      setPickups(
        Array.isArray(mine?.pickupAuthorizations)
          ? (mine?.pickupAuthorizations as Array<{ id: string; authorizedName?: string; phone?: string }>)
          : [],
      );
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const granted = (type: string) => consents.find((c) => c.consentType === type)?.granted ?? false;

  return (
    <ParentModuleShell eyebrow="Famille" title="Compte & famille" requireChild={false} scroll>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      <PremiumCard eyebrow="Famille" title="Mes enfants">
        <ParentChildPicker />
        {childrenList.map((child) => (
          <PremiumListItem
            key={child.id}
            title={childDisplayName(child)}
            subtitle={[child.class?.name, child.studentNumber, child.relation]
              .filter(Boolean)
              .join(' · ')}
            value={selectedId === child.id ? 'Actif' : 'Choisir'}
            accent={selectedId === child.id}
            onPress={() => setSelectedId(child.id)}
          />
        ))}
      </PremiumCard>
      <PremiumCard eyebrow="Profil" title="Préférences">
        <PremiumInput placeholder="Profession" value={profession} onChangeText={setProfession} style={{ marginBottom: 10 }} />
        <PremiumRow
          title="Notifications e-mail"
          trailing={
            <Switch value={notifyEmail} onValueChange={setNotifyEmail} trackColor={{ true: colors.navy }} />
          }
        />
        <PremiumRow
          title="Notifications SMS"
          last
          trailing={
            <Switch value={notifySms} onValueChange={setNotifySms} trackColor={{ true: colors.navy }} />
          }
        />
        <PremiumButton
          label="Enregistrer le profil"
          loading={saving}
          onPress={() => {
            void (async () => {
              try {
                setSaving(true);
                await parentApi.updateMyProfile({
                  profession: profession.trim() || null,
                  notifyEmail,
                  notifySms,
                });
                Alert.alert('Profil', 'Préférences enregistrées.');
              } catch (err) {
                Alert.alert('Erreur', apiError(err, 'Enregistrement impossible.'));
              } finally {
                setSaving(false);
              }
            })();
          }}
        />
      </PremiumCard>

      <PremiumCard eyebrow="Urgence" title="Contacts">
        {contacts.map((c) => (
          <PremiumListItem
            key={c.id}
            title={c.label || 'Contact'}
            subtitle={[c.phone, c.email].filter(Boolean).join(' · ')}
            value="Retirer"
            onPress={() => {
              void (async () => {
                try {
                  await parentApi.deleteMyContact(c.id);
                  await load();
                } catch (err) {
                  Alert.alert('Erreur', apiError(err, 'Suppression impossible.'));
                }
              })();
            }}
          />
        ))}
        <PremiumInput placeholder="Libellé" value={contactLabel} onChangeText={setContactLabel} style={{ marginBottom: 8 }} />
        <PremiumInput placeholder="Téléphone" value={contactPhone} onChangeText={setContactPhone} style={{ marginBottom: 8 }} />
        <PremiumButton
          label="Ajouter un contact"
          variant="ghost"
          onPress={() => {
            if (!contactLabel.trim()) return;
            void (async () => {
              try {
                await parentApi.addMyContact({ label: contactLabel.trim(), phone: contactPhone.trim() || null });
                setContactLabel('');
                setContactPhone('');
                await load();
              } catch (err) {
                Alert.alert('Erreur', apiError(err, 'Ajout impossible.'));
              }
            })();
          }}
        />
      </PremiumCard>

      <PremiumCard eyebrow="Consentements" title="Autorisations">
        {CONSENTS.map((c) => (
          <PremiumListItem
            key={c.type}
            title={c.label}
            value={granted(c.type) ? 'Oui' : 'Non'}
            accent={granted(c.type)}
            onPress={() => {
              void (async () => {
                try {
                  await parentApi.upsertMyConsent({
                    consentType: c.type,
                    granted: !granted(c.type),
                    studentId: selectedId,
                  });
                  await load();
                } catch (err) {
                  Alert.alert('Erreur', apiError(err, 'Mise à jour impossible.'));
                }
              })();
            }}
          />
        ))}
      </PremiumCard>

      {selectedId ? (
        <PremiumCard eyebrow="Récupération" title="Personnes autorisées">
          {pickups.map((p) => (
            <PremiumListItem
              key={p.id}
              title={p.authorizedName || 'Personne'}
              subtitle={p.phone}
              value="Retirer"
              onPress={() => {
                void (async () => {
                  try {
                    await parentApi.deleteChildPickupAuthorization(selectedId, p.id);
                    await load();
                  } catch (err) {
                    Alert.alert('Erreur', apiError(err, 'Suppression impossible.'));
                  }
                })();
              }}
            />
          ))}
          <PremiumInput placeholder="Nom" value={pickupName} onChangeText={setPickupName} style={{ marginBottom: 8 }} />
          <PremiumInput placeholder="Téléphone" value={pickupPhone} onChangeText={setPickupPhone} style={{ marginBottom: 8 }} />
          <PremiumButton
            label="Autoriser une personne"
            variant="ghost"
            onPress={() => {
              if (!pickupName.trim()) return;
              void (async () => {
                try {
                  await parentApi.addChildPickupAuthorization(selectedId, {
                    authorizedName: pickupName.trim(),
                    phone: pickupPhone.trim() || null,
                  });
                  setPickupName('');
                  setPickupPhone('');
                  await load();
                } catch (err) {
                  Alert.alert('Erreur', apiError(err, 'Ajout impossible.'));
                }
              })();
            }}
          />
        </PremiumCard>
      ) : null}
    </ParentModuleShell>
  );
}
