import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { spacing, fontSizes, useTheme } from '../theme/index';
import { usersApi } from '../api/users';

export function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const showTerms = () => {
    Alert.alert(
      'Términos y Condiciones',
      'Al usar UdeSA-migos, aceptás que recolectamos y almacenamos tu ubicación geográfica únicamente con el fin de conectarte con otros usuarios cercanos. No compartiremos tu información con terceros sin tu consentimiento. Podés eliminar tu cuenta y todos tus datos en cualquier momento desde la sección de Perfil.',
      [{ text: 'Entendido' }]
    );
  };

  const showPrivacy = () => {
    Alert.alert(
      'Política de Privacidad',
      'Tus datos de ubicación se actualizan con la frecuencia configurada por vos y solo son visibles por otros usuarios registrados. Los datos se almacenan de forma segura y se aplican medidas técnicas para proteger tu información personal. Regido por las leyes de protección de datos de Argentina.',
      [{ text: 'Entendido' }]
    );
  };

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      setFieldErrors({});
      setGeneralError(null);
      await usersApi.register(username, email, password, acceptedTerms);
      
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
          <Image 
            source={require('../../assets/logo-udesamigos.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.title} testID="register-title">Crear Cuenta</Text>
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
            testID="register-button"
            title="Crear Cuenta"
            onPress={handleRegister}
            isLoading={isLoading}
            disabled={!acceptedTerms}
            style={styles.registerBtn}
          />

          <View style={styles.checkboxRow}>
            <TouchableOpacity
              testID="terms-checkbox"
              style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              He leído y acepto los{' '}
              <Text style={styles.link} onPress={showTerms}>Términos y Condiciones</Text>
              {' '}y la{' '}
              <Text style={styles.link} onPress={showPrivacy}>Política de Privacidad</Text>
            </Text>
          </View>
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

const getStyles = (colors) => StyleSheet.create({
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
    width: 100,
    height: 100,
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
  registerBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
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
