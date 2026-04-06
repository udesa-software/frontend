import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { colors, spacing, fontSizes } from '../theme';
import { authApi } from '../api/auth';

export function ResetPasswordScreen({ navigation, route }) {
  const { token } = route.params || {};
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  // CA.1/CA.2: Verificar validez del token al cargar la pantalla
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError('Token no encontrado en el link. Por favor, solicita uno nuevo.');
        setIsVerifyingToken(false);
        return;
      }

      try {
        await authApi.verifyResetToken(token);
        // Si no lanza error, el token es válido
      } catch (err) {
        setTokenError(err.message || 'El enlace ha expirado o no es válido.');
      } finally {
        setIsVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleResetPassword = async () => {
    // CA.3: Confirmación doble manual en frontend
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Las contraseñas no coinciden.' });
      return;
    }

    // Validación básica coincidente con H1
    if (password.length < 8) {
      setFieldErrors({ password: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    try {
      setIsLoading(true);
      setFieldErrors({});
      setGeneralError(null);
      
      await authApi.resetPassword(token, password, confirmPassword);
      
      setIsSuccess(true);
      Alert.alert(
        '¡Éxito!',
        'Tu contraseña ha sido actualizada. Ahora puedes iniciar sesión.',
        [{ text: 'Ir al Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      if (err.details) {
        setFieldErrors(err.details);
      } else {
        setGeneralError(err.message || 'No se pudo restablecer la contraseña.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifyingToken) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verificando enlace...</Text>
        </View>
      </View>
    );
  }

  if (tokenError) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorTitle}>Enlace no válido</Text>
          <Text style={styles.errorSubtitle}>{tokenError}</Text>
          <AppButton
            title="Solicitar nuevo enlace"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.backBtn}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Nueva Contraseña</Text>
          <Text style={styles.subtitle}>Elige una contraseña segura que no hayas usado antes.</Text>
        </View>

        <View style={styles.form}>
          {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}

          <AppInput
            label="Nueva Contraseña"
            placeholder="Al menos 8 caracteres"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            showToggle
            onToggleSecure={() => setShowPassword(!showPassword)}
            error={Array.isArray(fieldErrors.password) ? fieldErrors.password.join('. ') : fieldErrors.password}
          />

          <AppInput
            label="Confirmar Contraseña"
            placeholder="Repite tu nueva contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            error={fieldErrors.confirmPassword}
          />

          <AppButton
            title="Cambiar Contraseña"
            onPress={handleResetPassword}
            isLoading={isLoading}
            style={styles.actionBtn}
          />

          <AppButton
            title="Cancelar"
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  scroll: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    alignItems: 'center',
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
    lineHeight: 24,
  },
  form: {
    marginBottom: spacing.xl,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 26,
  },
  actionBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: '100%',
  },
});
