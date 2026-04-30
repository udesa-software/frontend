import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { colors, spacing, fontSizes } from '../theme';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';

export function LoginScreen({ navigation, route }) {
  const { login } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [showResend, setShowResend] = useState(false);

  // Efecto para detectar si venimos del Registro
  React.useEffect(() => {
    if (route.params?.showResendPrompt) {
      setShowResend(true);
    }
  }, [route.params]);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setFieldErrors({});
      setGeneralError(null);
      await login(identifier, password);
    } catch (err) {
      console.error('[LoginScreen] Error de login:', err);
      if (err.details) {
        setFieldErrors(err.details);
      } else {
        const errorMsg = err.message || 'Error al iniciar sesión';
        setGeneralError(errorMsg);
        
        const isVerificationError = 
          err.status === 403 || 
          errorMsg.toLowerCase().includes('verific') || 
          errorMsg.toLowerCase().includes('cuenta sin verificar');

        if (isVerificationError) {
          setShowResend(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!identifier) {
      Alert.alert('Atención', 'Por favor ingresa tu email o usuario en el campo de arriba para reenviar el código.');
      return;
    }

    try {
      setIsLoading(true);
      await authApi.resendVerification(identifier);
      Alert.alert('¡Enviado!', 'Si tu correo está asociado a una cuenta, pronto recibirás el código.');
    } catch (err) {
      // Si el error es 404 (no encontrado), mostramos el mismo mensaje de éxito por seguridad (evitar enumeración)
      if (err.status === 404) {
        Alert.alert('¡Enviado!', 'Si tu correo está asociado a una cuenta, pronto recibirás el código.');
      } else {
        setGeneralError(err.message || 'No se pudo reenviar el código.');
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
          <Image 
            source={require('../../assets/logo-udesamigos.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
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
            style={styles.textButton}
          />

          {showResend && (
            <AppButton
              title="¿No recibiste el código? Reenviar"
              variant="text"
              onPress={handleResendCode}
              style={styles.resendSmallButton}
            />
          )}

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
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
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
  textButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xs,
  },
  resendSmallButton: {
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
