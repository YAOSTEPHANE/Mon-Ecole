import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { parentApi, type MessageThread, type SchoolMessage } from '../../api/parent';
import { colors } from '../../theme';
import {
  PremiumButton,
  PremiumChipRow,
  PremiumEmpty,
  PremiumFilterChip,
  PremiumFormStack,
  PremiumInput,
  PremiumListItem,
  PremiumPageHeader,
  screenPad,
} from '../../components/premium/PremiumUi';
import { useParentChild } from '../../context/ParentChildContext';
import { apiError, fmtDateTime } from '../../lib/format';

type Contact = { id: string; name: string; role: string };

function flattenContacts(raw: unknown): Contact[] {
  const out: Contact[] = [];
  const seen = new Set<string>();
  const add = (item: Record<string, unknown>) => {
    const id = String(item.id ?? '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      name: `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || String(item.label ?? item.email ?? 'Contact'),
      role: String(item.role ?? ''),
    });
  };
  if (Array.isArray(raw)) {
    for (const item of raw) if (item && typeof item === 'object') add(item as Record<string, unknown>);
    return out;
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    for (const key of ['admins', 'teachers', 'educators', 'staff', 'contacts']) {
      const list = rec[key];
      if (Array.isArray(list)) {
        for (const item of list) if (item && typeof item === 'object') add(item as Record<string, unknown>);
      }
    }
  }
  return out;
}

export default function ParentMessagesScreen() {
  const { selectedId } = useParentChild();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [openThread, setOpenThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<SchoolMessage[]>([]);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    try {
      setThreads(await parentApi.getMessageThreads());
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCompose = async () => {
    try {
      setContacts(flattenContacts(await parentApi.getMessageContacts()));
    } catch {
      setContacts([]);
    }
    setCompose(true);
  };

  const send = async () => {
    if (!receiverId || !content.trim()) {
      Alert.alert('Message', 'Destinataire et contenu requis.');
      return;
    }
    try {
      setSending(true);
      await parentApi.sendSchoolMessage({
        receiverId,
        subject: subject.trim() || undefined,
        content: content.trim(),
        category: 'GENERAL',
        studentId: selectedId ?? undefined,
      });
      setCompose(false);
      setSubject('');
      setContent('');
      await load();
      Alert.alert('Envoyé', 'Votre message a été transmis.');
    } catch (err) {
      Alert.alert('Erreur', apiError(err, 'Impossible d’envoyer le message.'));
    } finally {
      setSending(false);
    }
  };

  const open = async (thread: MessageThread) => {
    setOpenThread(thread);
    try {
      const list = await parentApi.getMessageThread(thread.threadKey);
      setMessages(list);
      const unread = list.filter((m) => !m.read);
      await Promise.all(unread.slice(0, 8).map((m) => parentApi.markMessageAsRead(m.id).catch(() => undefined)));
    } catch {
      setMessages([]);
    }
  };

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader eyebrow="Communication" title="Messages école" subtitle={`${threads.length} conversation(s)`} />
      <View style={screenPad.fill}>
        <PremiumButton label="Nouveau message" onPress={() => void openCompose()} />
        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />
        ) : threads.length === 0 ? (
          <PremiumEmpty icon="chatbubbles-outline" title="Aucun message" body="Écrivez à l’école depuis ce module." />
        ) : (
          <FlatList
            data={threads}
            keyExtractor={(t) => t.threadKey}
            contentContainerStyle={{ paddingTop: 12 }}
            renderItem={({ item }) => (
              <PremiumListItem
                title={item.peerName}
                subtitle={item.lastPreview}
                value={item.unread > 0 ? `${item.unread}` : fmtDateTime(item.lastAt)}
                accent={item.unread > 0}
                onPress={() => void open(item)}
              />
            )}
          />
        )}
      </View>

      <Modal visible={compose} animationType="slide" onRequestClose={() => setCompose(false)}>
        <View style={screenPad.root}>
          <PremiumPageHeader eyebrow="Nouveau" title="Écrire" />
          <View style={screenPad.body}>
            <Pressable onPress={() => setCompose(false)}><Text style={{ color: colors.navy, fontWeight: '800', marginBottom: 12 }}>Fermer</Text></Pressable>
            <PremiumChipRow>
              {contacts.map((c) => (
                <PremiumFilterChip
                  key={c.id}
                  label={`${c.name}${c.role ? ` · ${c.role}` : ''}`}
                  active={receiverId === c.id}
                  onPress={() => setReceiverId(c.id)}
                />
              ))}
            </PremiumChipRow>
            <PremiumFormStack>
              <PremiumInput placeholder="Sujet" value={subject} onChangeText={setSubject} />
              <PremiumInput placeholder="Votre message" value={content} onChangeText={setContent} multiline style={{ minHeight: 120, textAlignVertical: 'top' }} />
              <PremiumButton label="Envoyer" onPress={() => void send()} loading={sending} />
            </PremiumFormStack>
          </View>
        </View>
      </Modal>

      <Modal visible={openThread != null} animationType="slide" onRequestClose={() => setOpenThread(null)}>
        <View style={screenPad.root}>
          <PremiumPageHeader eyebrow="Conversation" title={openThread?.peerName ?? 'Fil'} />
          <View style={screenPad.body}>
            <Pressable onPress={() => setOpenThread(null)}><Text style={{ color: colors.navy, fontWeight: '800', marginBottom: 12 }}>Fermer</Text></Pressable>
            <FlatList
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <PremiumListItem
                  title={item.subject || item.sender?.firstName || 'Message'}
                  subtitle={item.content}
                  value={fmtDateTime(item.createdAt)}
                />
              )}
            />
            <PremiumInput
              placeholder="Répondre…"
              value={reply}
              onChangeText={setReply}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top', marginVertical: 12 }}
            />
            <PremiumButton
              label="Envoyer la réponse"
              loading={sending}
              onPress={() => {
                if (!openThread || !reply.trim()) return;
                void (async () => {
                  try {
                    setSending(true);
                    await parentApi.sendSchoolMessage({
                      threadKey: openThread.threadKey,
                      receiverId: openThread.peerId,
                      content: reply.trim(),
                      studentId: selectedId ?? undefined,
                    });
                    setReply('');
                    await open(openThread);
                    await load();
                  } catch (err) {
                    Alert.alert('Erreur', apiError(err, 'Réponse impossible.'));
                  } finally {
                    setSending(false);
                  }
                })();
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
