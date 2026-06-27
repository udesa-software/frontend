import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { spacing, fontSizes, radii, useTheme } from '../theme/index';
import { usersApi } from '../api/users';
import { getPrivacyStatus, setPrivacyStatus, getPinColor, updatePinColor, updateLocation } from '../api/location';
import { PIN_COLORS, PIN_COLOR_KEY, DEFAULT_PIN_COLOR } from '../constants/pinColors';
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
  const [pinColor, setPinColor] = useState(DEFAULT_PIN_COLOR);
  const [isSavingPin, setIsSavingPin] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const [settledResults, storedColor] = await Promise.all([
          Promise.allSettled([usersApi.getPreferences(), getPrivacyStatus(), getPinColor()]),
          AsyncStorage.getItem(PIN_COLOR_KEY),
        ]);

        const [prefsSettle, privacySettle, pinColorSettle] = settledResults;

        if (prefsSettle.status === 'fulfilled') {
          const data = prefsSettle.value.data;
          if (data) {
            if (data.search_radius_km) setRadiusKm(data.search_radius_km.toString());
            if (data.location_update_frequency) setFrequency(data.location_update_frequency);
          }
        } else {
          console.error('Error fetching general preferences:', prefsSettle.reason);
          setErrorMsg('Error al cargar preferencias.');
        }

        if (privacySettle.status === 'fulfilled') {
          const privacyData = privacySettle.value;
          if (privacyData) {
            setIsPrivate(!!privacyData.isPrivate);
          }
        }

        // Backend es fuente de verdad; AsyncStorage como fallback si falla o no tiene ubicación
        if (pinColorSettle.status === 'fulfilled' && PIN_COLORS.includes(pinColorSettle.value?.pinColor)) {
          const backendColor = pinColorSettle.value.pinColor;
          setPinColor(backendColor);
          await AsyncStorage.setItem(PIN_COLOR_KEY, backendColor).catch(() => {});
        } else if (storedColor && PIN_COLORS.includes(storedColor)) {
          setPinColor(storedColor);
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

  // H9 CA.2: guarda el color en AsyncStorage y en el backend
  const handleSelectPinColor = async (color) => {
    const previousColor = pinColor;
    setPinColor(color);
    setIsSavingPin(true);
    try {
      await Promise.all([
        AsyncStorage.setItem(PIN_COLOR_KEY, color),
        updatePinColor(color),
      ]);

      // Mandar ubicación para que el nuevo color quede registrado en el historial
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .catch(() => Location.getLastKnownPositionAsync());
        if (position) {
          await updateLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude })
            .catch(() => {}); // ignorar 429 si actualizó hace poco
        }
      }
    } catch (err) {
      setPinColor(previousColor);
      await AsyncStorage.setItem(PIN_COLOR_KEY, previousColor).catch(() => {});
      const apiError = err.response?.data?.message || err.message || 'Error al guardar el color.';
      setErrorMsg(apiError);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsSavingPin(false);
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

        {/* H9: selección del color del pin */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Color de tu pin</Text>
          <Text style={styles.helperText}>
            Elegí el color con el que aparecés en el mapa de tus amigos.
          </Text>
          <View style={styles.colorRow}>
            {PIN_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                testID={`pin-color-${c}`}
                onPress={() => handleSelectPinColor(c)}
                disabled={isSavingPin}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  pinColor === c && styles.colorSwatchSelected,
                ]}
              />
            ))}
          </View>
          {isSavingPin && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />
          )}
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
    paddingTop: spacing.xxl,
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
    borderRadius: radii.full,
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
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: colors.text,
    transform: [{ scale: 1.15 }],
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
