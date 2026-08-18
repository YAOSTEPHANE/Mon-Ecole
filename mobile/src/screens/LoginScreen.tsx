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
import { Ionicons } from '@expo/vector-icons';
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
  const [showPassword, setShowPassword] = useState(false);
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
        Alert.alert('Connexion unique', error);
        return;
      }
      if (!code) {
        Alert.alert('Connexion unique', 'Code manquant');
        return;
      }
      const { token } = await authApi.exchangeOAuthCode(code);
      await acceptSession(token);
    } catch (e: unknown) {
      Alert.alert('Connexion unique', e instanceof Error ? e.message : 'Échec de la connexion unique');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={styles.goldLine} />
        <Text style={styles.brand}>École à jour</Text>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.sub}>Espace mobile enseignants, parents et élèves</Text>
      </View>

      <View style={styles.card}>
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
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPassword((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.gold}
            />
          </Pressable>
        </View>

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
            <ActivityIndicator color={colors.gold} />
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
    backgroundColor: colors.dock,
    justifyContent: 'center',
    padding: 20,
  },
  hero: {
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  goldLine: {
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.28)',
  },
  brand: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fffdf9',
  },
  sub: {
    marginTop: 8,
    color: colors.dockMuted,
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
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 44,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn: {
    marginTop: 22,
    backgroundColor: colors.dock,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.35)',
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
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
