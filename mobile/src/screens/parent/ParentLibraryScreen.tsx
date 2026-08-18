import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking } from 'react-native';
import { digitalLibraryApi, type DigitalResource } from '../../api/digitalLibrary';
import { colors } from '../../theme';
import { PremiumEmpty, PremiumInput, PremiumListItem } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { apiError, str } from '../../lib/format';

export default function ParentLibraryScreen() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<DigitalResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          setRows(await digitalLibraryApi.list({ q: q.trim() || undefined }));
        } catch {
          setRows([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <ParentModuleShell eyebrow="Ressources" title="Bibliothèque" requireChild={false}>
      <PremiumInput placeholder="Rechercher un titre…" value={q} onChangeText={setQ} style={{ marginBottom: 12 }} />
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : rows.length === 0 ? (
        <PremiumEmpty icon="library-outline" title="Aucune ressource" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PremiumListItem
              title={item.title}
              subtitle={[item.author, item.kind, item.subject].filter(Boolean).join(' · ')}
              value="Ouvrir"
              onPress={() => {
                void (async () => {
                  try {
                    const grant = await digitalLibraryApi.requestDownloadGrant(item.id);
                    if (grant.downloadUrl) await Linking.openURL(grant.downloadUrl);
                  } catch (err) {
                    Alert.alert('Bibliothèque', apiError(err, 'Téléchargement indisponible.'));
                  }
                })();
              }}
            />
          )}
        />
      )}
    </ParentModuleShell>
  );
}
