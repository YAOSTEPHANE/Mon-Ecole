import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { getApiUrl, OAUTH_REDIRECT } from '../config';
import { colors } from '../theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, acceptSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauth, setOauth] = useState({ google: false, microsoft: false });

  useEffect(() => {
    void (async () => {
      try {
        setOauth(await authApi.oauthProviders());
      } catch {
        setOauth({ google: false, microsoft: false });
      }
    })();
  }, []);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password, twoFactorRequired ? twoFactorCode : undefined);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { code?: string; error?: string }; status?: number };
        message?: string;
      };
      if (err.response?.data?.code === 'TWO_FACTOR_REQUIRED') {
        setTwoFactorRequired(true);
        Alert.alert('2FA', 'Entrez le code de votre application d’authentification.');
        return;
      }
      Alert.alert(
        'Connexion',
        err.response?.data?.error || err.message || 'Identifiants incorrects',
      );
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = async (provider: 'google' | 'microsoft') => {
    try {
      const startUrl = `${getApiUrl()}/auth/oauth/${provider}/start?client=mobile`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, OAUTH_REDIRECT);
      if (result.type !== 'success' || !result.url) return;
      const url = new URL(result.url);
      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      if (error) {
        Alert.alert('SSO', error);
        return;
      }
      if (!code) {
        Alert.alert('SSO', 'Code manquant');
        return;
      }
      const { token } = await authApi.exchangeOAuthCode(code);
      await acceptSession(token);
    } catch (e: unknown) {
      Alert.alert('SSO', e instanceof Error ? e.message : 'Échec SSO');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.brand}>École à jour</Text>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.sub}>Espace mobile enseignants, parents et élèves</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          placeholder="e-mail ou n° élève / matricule"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
        />

        {twoFactorRequired ? (
          <>
            <Text style={styles.label}>Code 2FA</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              value={twoFactorCode}
              onChangeText={(t) => setTwoFactorCode(t.replace(/\D/g, ''))}
              placeholder="123456"
              placeholderTextColor={colors.muted}
            />
          </>
        ) : null}

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={() => void onSubmit()}
          disabled={loading || !email || !password}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Se connecter</Text>
          )}
        </Pressable>

        {(oauth.google || oauth.microsoft) && (
          <View style={styles.oauthBlock}>
            <Text style={styles.or}>ou continuer avec</Text>
            {oauth.google ? (
              <Pressable style={styles.oauthBtn} onPress={() => void startOAuth('google')}>
                <Text style={styles.oauthText}>Google</Text>
              </Pressable>
            ) : null}
            {oauth.microsoft ? (
              <Pressable style={styles.oauthBtn} onPress={() => void startOAuth('microsoft')}>
                <Text style={styles.oauthText}>Microsoft</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <Text style={styles.hint}>API : {getApiUrl()}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  sub: {
    marginTop: 6,
    marginBottom: 20,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 22,
    backgroundColor: colors.dark,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fef3c7', fontWeight: '700', fontSize: 16 },
  oauthBlock: { marginTop: 18, gap: 8 },
  or: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  oauthBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  oauthText: { fontWeight: '600', color: colors.ink },
  hint: {
    marginTop: 16,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
});
