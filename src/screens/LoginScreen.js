import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { colors, spacing, fontSizes } from '../theme';
import { useAuth } from '../context/AuthContext';

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setFieldErrors({});
      setGeneralError(null);
      await login(identifier, password);
    } catch (err) {
      if (err.details) {
        setFieldErrors(err.details);
      } else {
        setGeneralError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>

        <View style={styles.form}>
          {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

          <AppInput
            label="Email o Usuario"
            placeholder="ejemplo@correo.com o mi_usuario"
            value={identifier}
            onChangeText={setIdentifier}
            error={Array.isArray(fieldErrors.identifier) ? fieldErrors.identifier.join('. ') : fieldErrors.identifier}
          />

          <AppInput
            label="Contraseña"
            placeholder="Tu contraseña secreta"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            showToggle
            onToggleSecure={() => setShowPassword(!showPassword)}
            error={Array.isArray(fieldErrors.password) ? fieldErrors.password.join('. ') : fieldErrors.password}
          />

          <AppButton
            title="Olvidé mi contraseña"
            variant="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}
          />

          <AppButton
            title="Iniciar Sesión"
            onPress={handleLogin}
            isLoading={isLoading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <AppButton
            title="Regístrate"
            variant="text"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSizes.xxxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
  },
  form: {
    marginBottom: spacing.xl,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.textMuted,
  },
});
