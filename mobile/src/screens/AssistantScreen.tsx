import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { assistantStatus, chatAssistant } from '../api/assistant';
import { colors } from '../theme';
import { PremiumPageHeader, screenPad } from '../components/premium/PremiumUi';

type Turn = { role: 'user' | 'assistant'; content: string };

export default function AssistantScreen() {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>('…');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    void (async () => {
      try {
        const s = await assistantStatus();
        setMode(s.llmConfigured ? `Assistant IA · ${s.model}` : 'Mode local (sans clé API)');
      } catch {
        setMode('Indisponible');
      }
    })();
  }, []);

  const send = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setPrompt('');
    const next = [...history, { role: 'user' as const, content: text }];
    setHistory(next);
    try {
      const res = await chatAssistant({ prompt: text, history: next.slice(-10) });
      setMode(res.mode === 'llm' ? `Assistant IA · ${res.model || 'modèle'}` : 'Mode local');
      setHistory((h) => [...h, { role: 'assistant', content: res.reply }]);
    } catch {
      setHistory((h) => h.slice(0, -1));
      setPrompt(text);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={screenPad.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={12}
    >
      <PremiumPageHeader eyebrow="Pédagogie" title="Assistant" subtitle={mode} />
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        {history.length === 0 ? (
          <Text style={styles.hint}>
            Ex. : « Rédige un avis de conseil pour un élève assidu mais en baisse en maths. »
          </Text>
        ) : (
          history.map((m, i) => (
            <View
              key={`${m.role}-${i}`}
              style={[styles.bubble, m.role === 'user' ? styles.user : styles.bot]}
            >
              <Text style={[styles.bubbleText, m.role === 'user' && styles.userText]}>{m.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          multiline
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Votre question…"
          placeholderTextColor={colors.muted}
        />
        <Pressable
          style={[styles.send, (!prompt.trim() || loading) && styles.sendDisabled]}
          onPress={() => void send()}
          disabled={!prompt.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.gold} />
          ) : (
            <Text style={styles.sendText}>Envoyer</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollInner: { padding: 16, gap: 10, paddingBottom: 24 },
  hint: { color: colors.muted, lineHeight: 20, fontSize: 14 },
  bubble: { borderRadius: 16, padding: 12, maxWidth: '92%' },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.dock,
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.28)',
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  userText: { color: '#fffdf9' },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  send: {
    width: 48,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.dock,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.35)',
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.gold, fontWeight: '800' },
});

