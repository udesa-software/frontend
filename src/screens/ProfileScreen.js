import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { colors, spacing, fontSizes, radii } from '../theme';

export function ProfileScreen() {
  const { user, logout, deleteAccount } = useAuth();
  const navigation = useNavigation();
  
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.settingsIcon} 
          onPress={() => navigation.navigate('Preferences')}
        >
          <Text style={{ fontSize: 24 }}>⚙️</Text>
        </TouchableOpacity>

        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{user.username?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID de Usuario</Text>
            <Text style={styles.infoValue}>{user.id?.slice(0, 8)}...</Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <Text style={styles.infoLabel}>Rol</Text>
            <Text style={styles.infoValue}>{user.role || 'Usuario'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Zona de Peligro</Text>
        <AppButton
          title="Eliminar Cuenta"
          variant="secondary"
          onPress={() => setIsDeleteModalVisible(true)}
          style={styles.deleteBtn}
          // Idealmente tendríamos un variant 'danger' pero usaremos estilos manuales por ahora
          textStyle={{ color: colors.error }}
        />
        <Text style={styles.dangerNote}>
          Esta acción es permanente y borrará todos tus datos.
        </Text>
      </View>

      <AppButton
        title="Cerrar Sesión"
        variant="text"
        onPress={logout}
        style={styles.logoutBtn}
      />

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.warningIconContainer}>
                <Text style={styles.warningIcon}>⚠️</Text>
              </View>
              <Text style={styles.modalTitle}>¿Estás absolutamente seguro?</Text>
              <Text style={styles.modalSubtitle}>
                Esta acción borrará permanentemente tu perfil, amistades e historial de ubicaciones. No hay marcha atrás.
              </Text>

              <AppInput
                label="Confirma con tu contraseña"
                placeholder="Contraseña actual"
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
                  title="Eliminar permanentemente"
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
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    position: 'relative',
  },
  settingsIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    fontWeight: 'bold',
  },
  username: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: 'bold',
  },
  email: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  dangerTitle: {
    color: colors.error,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  infoValue: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  deleteBtn: {
    borderColor: colors.error,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  dangerNote: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  logoutBtn: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  modalScroll: {
    paddingHorizontal: spacing.xl,
  },
  warningIconContainer: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningIcon: {
    fontSize: 32,
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
    flexDirection: 'column',
    marginTop: spacing.lg,
  },
  actionBtn: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  confirmDeleteBtn: {
    backgroundColor: colors.error,
  },
});
