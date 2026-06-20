import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { colors, spacing, fontSizes, radii } from '../theme';
import * as ImagePicker from 'expo-image-picker';
import { getImageUrl } from '../api/client';

export function ProfileScreen() {
  const { user, logout, deleteAccount, updateProfile, uploadProfilePhoto, deleteProfilePhoto } = useAuth();
  const navigation = useNavigation();

  const handleSelectProfilePhoto = async () => {
    console.log('handleSelectProfilePhoto CALLED');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('STATUS:', status);
    if (status !== 'granted') {
      console.log('NOT GRANTED, SHOWING ALERT');
      Alert.alert('Permiso Denegado', 'Se necesita acceso a la galería para poder subir una foto de perfil.');
      return;
    }

    const options = [
      { text: 'Elegir de la galería', onPress: pickImage },
      { text: 'Tomar foto (Cámara)', onPress: takePhoto }
    ];

    if (user.profile_photo_url) {
      options.push({
        text: 'Eliminar foto actual',
        style: 'destructive',
        onPress: handleDeleteProfilePhoto
      });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert('Foto de Perfil', '¿Qué te gustaría hacer?', options);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Se necesita acceso a la cámara para tomar fotos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo tomar la foto');
    }
  };

  const uploadImage = async (uri) => {
    try {
      setIsSaving(true);

      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : '';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
        Alert.alert('Formato Inválido', 'El sistema solo acepta formatos válidos de imagen (JPG, PNG).');
        return;
      }

      // FormData con fetch nativo (ver users.js) — evita el problema de
      // boundary que tenía axios al setear Content-Type manualmente.
      const formData = new FormData();
      formData.append('profilePhoto', { uri, name: filename, type: mimeType });

      await uploadProfilePhoto(formData);
      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
    } catch (err) {
      const errMsg = err?.message || 'Error al subir foto.';
      Alert.alert('Error al subir foto', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfilePhoto = async () => {
    try {
      setIsSaving(true);
      await deleteProfilePhoto();
      Alert.alert('Éxito', 'Foto de perfil eliminada correctamente.');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al eliminar foto.';
      Alert.alert('Error', errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  
  // Estados para el Modal de Edición
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBiography, setEditBiography] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const openEditModal = () => {
    setEditUsername(user.username || '');
    setEditBiography(user.biography || '');
    setEditError('');
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedUsername = editUsername.trim();
    if (!trimmedUsername) {
      setEditError('El nombre de usuario es obligatorio.');
      return;
    }

    try {
      setIsSaving(true);
      setEditError('');
      await updateProfile({ username: trimmedUsername, biography: editBiography });
      setIsEditModalVisible(false);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al actualizar perfil.';
      setEditError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

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
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al eliminar la cuenta.';
      setDeleteError(errMsg);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.settingsIcon}
            onPress={() => navigation.navigate('Preferences')}
          >
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="profile-photo-container" style={styles.profilePhotoContainer} onPress={handleSelectProfilePhoto} disabled={isSaving}>
            {user.profile_photo_url ? (
              <Image
                source={{ uri: getImageUrl(user.profile_photo_url) }}
                style={styles.profilePhotoImage}
                testID="profile-photo"
              />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={styles.profilePhotoText}>{user.username?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.profilePhotoEditOverlay}>
              <Text style={styles.profilePhotoEditOverlayText}>Editar</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.biography ? <Text style={styles.bio}>{user.biography}</Text> : null}

          <View style={styles.actionRow}>
            <AppButton
              title="Editar Perfil"
              variant="secondary"
              onPress={openEditModal}
              style={styles.editBtn}
            />
            {user.profile_photo_url ? (
              <AppButton
                title="Eliminar Foto"
                variant="secondary"
                onPress={handleDeleteProfilePhoto}
                style={[styles.editBtn, styles.deleteProfilePhotoBtn]}
                textStyle={{ color: colors.error }}
              />
            ) : null}
          </View>
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
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <AppButton
            title="Cambiar Contraseña"
            variant="secondary"
            onPress={() => navigation.navigate('ChangePassword')}
            style={styles.securityBtn}
          />
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
      </ScrollView>

      {/* Modal de Edición de Perfil */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>

              {editError ? <Text style={styles.errorText}>{editError}</Text> : null}

              <AppInput
                label="Nombre de Usuario"
                placeholder="Ingresa tu nombre de usuario"
                value={editUsername}
                onChangeText={setEditUsername}
                editable={!isSaving}
              />
              <AppInput
                label="Biografía"
                placeholder="Cuéntanos algo sobre ti..."
                value={editBiography}
                onChangeText={setEditBiography}
                maxLength={150}
                multiline
                numberOfLines={3}
                editable={!isSaving}
              />
              <AppInput
                label="Correo Electrónico (No modificable)"
                value={user.email}
                editable={false}
              />
              
              <View style={styles.modalActions}>
                <AppButton
                  title="Cancelar"
                  variant="secondary"
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.actionBtn}
                  disabled={isSaving}
                />
                <AppButton
                  title="Guardar Cambios"
                  onPress={handleSaveProfile}
                  isLoading={isSaving}
                  style={styles.actionBtn}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  profilePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profilePhotoText: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    fontWeight: 'bold',
  },
  profilePhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.md,
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profilePhotoEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoEditOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  deleteProfilePhotoBtn: {
    marginLeft: spacing.sm,
    borderColor: colors.error,
    borderWidth: 1,
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
  bio: {
    fontSize: fontSizes.md,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  editBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
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
  securityBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
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
    marginTop: spacing.sm,
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
