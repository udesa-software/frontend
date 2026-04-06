import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { colors, spacing, fontSizes, radii } from '../theme';

export function HomeScreen() {
  const { user, logout, deleteAccount } = useAuth();
  
  // Estados para el Modal de eliminación
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (!confirmPassword) {
      setDeleteError('Por favor, ingresa tu contraseña.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      await deleteAccount(confirmPassword);
      // El contexto se encargará de redirigir al Login al poner user = null
      setIsDeleteModalVisible(false);
    } catch (err) {
      console.warn('Error al eliminar cuenta:', err);
      // El mensaje de error viene del backend (ej: "Contraseña incorrecta")
      setDeleteError(err.message || 'Error al eliminar la cuenta.');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setConfirmPassword('');
    setDeleteError('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Hola, {user.username}!</Text>
      <Text style={styles.subtitle}>{user.email}</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardInfo}>Tu ID es: {user.id || 'N/A'}</Text>
        <Text style={styles.cardInfo}>Tu rol es: {user.role || 'Usuario'}</Text>
      </View>

      <AppButton
        title="Cerrar Sesión"
        variant="secondary"
        onPress={logout}
        style={styles.logoutBtn}
      />

      <AppButton
        title="Eliminar Cuenta"
        variant="text"
        onPress={() => setIsDeleteModalVisible(true)}
        style={styles.deleteBtn}
      />

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>¿Eliminar cuenta permanentemente?</Text>
              <Text style={styles.modalSubtitle}>
                Esta acción borrará todo tu perfil, amistades e historial. No podrás deshacerlo.
              </Text>

              <AppInput
                label="Confirma tu contraseña actual"
                placeholder="Ingresa tu contraseña"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={deleteError}
                autoFocus
              />

              <View style={styles.modalActions}>
                <AppButton
                  title="Cancelar"
                  variant="secondary"
                  onPress={closeDeleteModal}
                  style={styles.actionBtn}
                  disabled={isDeleting}
                />
                <AppButton
                  title="Eliminar"
                  onPress={handleDeleteAccount}
                  isLoading={isDeleting}
                  style={[styles.actionBtn, styles.confirmDeleteBtn]}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xxxl,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    color: colors.text,
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
  },
  logoutBtn: {
    marginTop: spacing.xl,
  },
  deleteBtn: {
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalScroll: {
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  confirmDeleteBtn: {
    backgroundColor: colors.error,
  },
});
