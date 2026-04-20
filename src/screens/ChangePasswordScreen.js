import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { colors, spacing, fontSizes, radii } from '../theme';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { clearLocalSession } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validate = () => {
    if (!currentPassword) return 'La contraseña actual es obligatoria';
    if (!newPassword) return 'La nueva contraseña es obligatoria';
    if (newPassword.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(newPassword)) return 'La nueva contraseña debe contener al menos una mayúscula';
    if (!/[0-9]/.test(newPassword)) return 'La nueva contraseña debe contener al menos un número';
    if (newPassword === currentPassword) return 'La nueva contraseña no puede ser igual a la anterior';
    if (newPassword !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const handleChangePassword = async () => {
    const error = validate();
    if (error) {
      setErrorMsg(error);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');
      
      const response = await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      
      Alert.alert(
        "Éxito",
        response.data.message || "Tu contraseña ha sido cambiada con éxito. Por seguridad, se cerrará tu sesión.",
        [
          { 
            text: "Entendido", 
            onPress: async () => {
              await clearLocalSession();
              // El cambio a user = null en AuthContext gatilla la redirección al Login
            } 
          }
        ]
      );

    } catch (err) {
      const apiError = err.response?.data?.message || err.message || 'Error al cambiar la contraseña';
      setErrorMsg(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
           <Text style={styles.title}>Cambiar Contraseña</Text>
           <Text style={styles.subtitle}>Actualiza tu clave para mantener tu cuenta segura.</Text>
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <View style={styles.card}>
          <AppInput
            label="Contraseña actual"
            placeholder="Ingresa tu clave actual"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!isSaving}
          />

          <View style={styles.divider} />

          <AppInput
            label="Nueva contraseña"
            placeholder="Mín. 8 caracteres, 1 mayús., 1 núm."
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!isSaving}
          />

          <AppInput
            label="Confirmar nueva contraseña"
            placeholder="Repite tu nueva contraseña"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isSaving}
          />
        </View>

        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Requisitos de seguridad:</Text>
          <Text style={styles.requirementItem}>• Mínimo 8 caracteres</Text>
          <Text style={styles.requirementItem}>• Al menos una letra mayúscula</Text>
          <Text style={styles.requirementItem}>• Al menos un número</Text>
          <Text style={styles.requirementItem}>• Diferente a la contraseña actual</Text>
        </View>

        <AppButton
          title="Actualizar Contraseña"
          onPress={handleChangePassword}
          isLoading={isSaving}
          style={styles.saveBtn}
        />

        <AppButton
          title="Cancelar"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
          disabled={isSaving}
        />
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
    padding: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    opacity: 0.5,
  },
  requirementsCard: {
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  requirementsTitle: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
  },
  requirementItem: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginVertical: 1,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
