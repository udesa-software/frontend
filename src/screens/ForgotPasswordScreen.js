import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { colors, spacing, fontSizes } from '../theme';
import { authApi } from '../api/auth';

export function ForgotPasswordScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState(null);

  const handleRequestReset = async () => {
    if (!identifier) {
      setError('Por favor, ingresa tu email o usuario.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // CA.4: El backend debería manejar el mensaje genérico, 
      // pero aquí nos aseguramos de mostrar éxito siempre al usuario.
      await authApi.forgotPassword(identifier);
      setIsSent(true);
    } catch (err) {
      // CA.4: Incluso si falla con 404 o 410, mostramos éxito por seguridad (evitar enumeración)
      if (err.status === 404 || err.status === 410) {
        setIsSent(true);
      } else {
        setError(err.message || 'No se pudo procesar la solicitud.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
          <Text style={styles.successSubtitle}>
            Si tu cuenta existe, recibirás un correo con las instrucciones para restablecer tu contraseña.
          </Text>
          <Text style={styles.note}>
            Revisa tu bandeja de entrada y la carpeta de spam. El enlace expira en 10 minutos.
          </Text>
          <AppButton
            title="Volver al Login"
            onPress={() => navigation.navigate('Login')}
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
          <Text style={styles.title}>Recuperar Clave</Text>
          <Text style={styles.subtitle}>Ingresa tu email o usuario para recibir un enlace de restablecimiento.</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <AppInput
            label="Email o Usuario"
            placeholder="ejemplo@correo.com"
            value={identifier}
            onChangeText={setIdentifier}
            autoFocus
          />

          <AppButton
            title="Enviar Instrucciones"
            onPress={handleRequestReset}
            isLoading={isLoading}
            style={styles.actionBtn}
          />

          <AppButton
            title="Volver al Login"
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
  successTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 26,
  },
  note: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    fontStyle: 'italic',
  },
  actionBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: '100%',
  },
});
