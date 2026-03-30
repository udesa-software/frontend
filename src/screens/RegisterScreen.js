import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { colors, spacing, fontSizes } from '../theme';
import { usersApi } from '../api/users';

export function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      setFieldErrors({});
      setGeneralError(null);
      // 'acceptedTerms' como true en este MVP
      await usersApi.register(username, email, password, true);
      
      Alert.alert(
        '¡Registro Exitoso!',
        'Tu cuenta ha sido creada. Por favor verifica tu email e inicia sesión.',
        [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login', { showResendPrompt: true }) }]
      );
    } catch (err) {
      if (err.details) {
        setFieldErrors(err.details);
      } else {
        setGeneralError(err.message || 'Error al intentar crear la cuenta');
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
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete para disfrutar de la experiencia</Text>
        </View>

        <View style={styles.form}>
          {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

          <AppInput
            label="Nombre de Usuario"
            placeholder="Mínimo 4 caracteres"
            value={username}
            onChangeText={setUsername}
            error={Array.isArray(fieldErrors.username) ? fieldErrors.username.join('. ') : fieldErrors.username}
          />

          <AppInput
            label="Email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={Array.isArray(fieldErrors.email) ? fieldErrors.email.join('. ') : fieldErrors.email}
          />

          <AppInput
            label="Contraseña"
            placeholder="Al menos 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            showToggle
            onToggleSecure={() => setShowPassword(!showPassword)}
            error={Array.isArray(fieldErrors.password) ? fieldErrors.password.join('. ') : fieldErrors.password}
          />

          <AppButton
            title="Crear Cuenta"
            onPress={handleRegister}
            isLoading={isLoading}
            style={styles.registerBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <AppButton
            title="Iniciar Sesión"
            variant="text"
            onPress={() => navigation.navigate('Login')}
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
  registerBtn: {
    marginTop: spacing.md,
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
