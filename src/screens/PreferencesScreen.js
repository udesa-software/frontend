import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, Switch } from 'react-native';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { spacing, fontSizes, radii, useTheme } from '../theme/index';
import { usersApi } from '../api/users';
import { getPrivacyStatus, setPrivacyStatus } from '../api/location';
import { useNavigation } from '@react-navigation/native';

const ALLOWED_FREQUENCIES = [5, 15, 30];

export function PreferencesScreen() {
  const navigation = useNavigation();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [radiusKm, setRadiusKm] = useState('25');
  const [frequency, setFrequency] = useState(5);
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const [prefsRes, privacyRes] = await Promise.allSettled([
          usersApi.getPreferences(),
          getPrivacyStatus()
        ]);

        if (prefsRes.status === 'fulfilled') {
          const data = prefsRes.value.data;
          if (data) {
            if (data.search_radius_km) setRadiusKm(data.search_radius_km.toString());
            if (data.location_update_frequency) setFrequency(data.location_update_frequency);
          }
        } else {
          console.error('Error fetching general preferences:', prefsRes.reason);
          setErrorMsg('Error al cargar preferencias.');
        }

        if (privacyRes.status === 'fulfilled') {
          const privacyData = privacyRes.value;
          if (privacyData) {
            setIsPrivate(!!privacyData.isPrivate);
          }
        } else {
          console.error('Error fetching privacy status:', privacyRes.reason);
        }
      } catch (err) {
        setErrorMsg('Error al cargar preferencias.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const togglePrivacy = async (value) => {
    const previousValue = isPrivate;
    setIsPrivate(value);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      await setPrivacyStatus(value);
      setSuccessMsg(`Modo ${value ? 'Privado' : 'Público'} activado.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setIsPrivate(previousValue);
      const apiError = err.response?.data?.message || err.message || 'Error al cambiar modo de privacidad.';
      setErrorMsg(apiError);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Parse the input manually before sending, fallback to input text to let backend reject it if totally invalid
    const radiusParsed = parseInt(radiusKm, 10);
    const radiusToSend = isNaN(radiusParsed) ? radiusKm : radiusParsed;

    try {
      setIsSaving(true);
      await usersApi.updatePreferences({
        search_radius_km: radiusToSend,
        location_update_frequency: frequency,
      });
      setSuccessMsg('Preferencias guardadas exitosamente.');
    } catch (err) {
      const apiError = err.response?.data?.message || err.message || 'Error al guardar.';
      setErrorMsg(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Preferencias</Text>
        <Text style={styles.subtitle}>Configura cómo interactúas con la aplicación.</Text>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Búsqueda de Amistades</Text>
          <AppInput
            label="Radio de búsqueda (km)"
            placeholder="Ej: 25"
            keyboardType="numeric"
            value={radiusKm}
            onChangeText={setRadiusKm}
            editable={!isSaving}
          />
          <Text style={styles.helperText}>Se aceptan valores entre 1 y 50 km.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <Text style={styles.label}>Frecuencia de actualización</Text>
          
          <View style={styles.pillsContainer}>
            {ALLOWED_FREQUENCIES.map((freqValue) => {
              const isSelected = frequency === freqValue;
              return (
                <TouchableOpacity
                  key={freqValue}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => setFrequency(freqValue)}
                  disabled={isSaving}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {freqValue} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helperText}>Frecuencia con la que la app actualizará y compartirá tu ubicación.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.sectionTitle}>Modo Privado ⚡</Text>
              <Text style={styles.helperText}>
                {isPrivate 
                  ? 'Tu perfil es privado. Solo tus amigos pueden ver tu ubicación y no aparecerás en búsquedas globales.' 
                  : 'Tu perfil es público. Otros usuarios pueden encontrarte y ver tu ubicación en el radar.'}
              </Text>
            </View>
            <Switch
              testID="privacy-switch"
              value={isPrivate}
              onValueChange={togglePrivacy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : (isPrivate ? colors.primaryLight || '#fff' : '#f4f3f4')}
              disabled={isSaving}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.sectionTitle}>Apariencia</Text>
              <Text style={styles.helperText}>
                {isDarkMode 
                  ? 'Modo Oscuro activado. Ideal para entornos con poca luz.' 
                  : 'Modo Claro activado. Ideal para usar al aire libre.'}
              </Text>
            </View>
            <Switch
              testID="theme-switch"
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : (isDarkMode ? colors.primaryLight || '#fff' : '#f4f3f4')}
            />
          </View>
        </View>

        <AppButton
          title="Guardar Cambios"
          onPress={handleSave}
          isLoading={isSaving}
          style={styles.saveBtn}
        />
        <AppButton
          title="Volver"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          disabled={isSaving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
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
    marginBottom: spacing.xl,
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
  successText: {
    color: 'green',
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(0, 128, 0, 0.1)',
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  pillsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#fff',
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  backBtn: {
    marginTop: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
