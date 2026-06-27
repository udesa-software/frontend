import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert
} from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { updateLocation, getFriendsLocations, updateLabel, deleteLabel } from '../api/location';
import { spacing, fontSizes, radii, useTheme } from '../theme/index';
import { Ionicons } from '@expo/vector-icons';
import { CoordsCard, StatusView, SyncBadge } from '../components/MapComponents';

const UPDATE_INTERVAL_MS = 30_000;
const INITIAL_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };
const MAP_CONTROL_PADDING = { top: 50, right: 10, bottom: 160, left: 20 };



// ── Pantalla Principal ─────────────────────────────────────────────────────

export function MapScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const historyLocation = route.params?.historyLocation ?? null;
  const isHistoryPreview = Boolean(historyLocation);

  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle');
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [lastSent, setLastSent] = useState(null);
  const [friends, setFriends] = useState([]);
  
  const [myLabel, setMyLabel] = useState('');
  const [tempLabel, setTempLabel] = useState('');
  const [isUpdatingLabel, setIsUpdatingLabel] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);

  const mapRef = useRef(null);
  const coordsRef = useRef(null);
  coordsRef.current = coords;

  const sendLocationToBackend = useCallback(async (latitude, longitude) => {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      if (batteryLevel > 0 && batteryLevel < 0.20) {
        setSyncStatus('idle');
        return;
      }
      setSyncStatus('syncing');
      await updateLocation({ latitude, longitude });
      setSyncStatus('synced');
      setLastSent(new Date());
    } catch (err) {
      if (err?.status !== 429) {
        setSyncStatus('error');
        console.warn(`[Sync Error] ${err?.status}: ${err?.message}`);
      }
    }
  }, []);

  const fetchFriends = useCallback(async () => {
    if (!coordsRef.current) return;
    try {
      const data = await getFriendsLocations({
        latitude: coordsRef.current.latitude,
        longitude: coordsRef.current.longitude
      });
      setFriends(data.friends || []);
    } catch (err) {
      console.warn(`[Friends Error] ${err?.status}: ${err?.message}`);
    }
  }, []);

  const onUpdateLabel = async () => {
    if (isUpdatingLabel) return;
    const text = tempLabel.trim();
    setIsUpdatingLabel(true);
    try {
      if (text === '') {
        await deleteLabel();
        setMyLabel('');
      } else {
        const truncated = text.substring(0, 30);
        await updateLabel(truncated);
        setMyLabel(truncated);
      }
      setTempLabel('');
      Alert.alert("Éxito", "¡Tu tag ha sido actualizado!");
    } catch (err) {
      console.warn(`[Label Error] ${err?.status}: ${err?.message}`);
      Alert.alert("Error", `No se pudo guardar: ${err?.message}`);
    } finally {
      setIsUpdatingLabel(false);
    }
  };

  const centerOnMe = () => {
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        ...coords,
        ...INITIAL_DELTA,
      }, 1000);
    }
  };

  const centerOnHistoryLocation = useCallback(() => {
    if (!historyLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: historyLocation.latitude,
      longitude: historyLocation.longitude,
      ...INITIAL_DELTA,
    }, 1000);
  }, [historyLocation]);

  useEffect(() => {
    if (isHistoryPreview) {
      setCoords({
        latitude: historyLocation.latitude,
        longitude: historyLocation.longitude,
      });
      setIsLoadingLocation(false);
      setLocationError(null);
      setFriends([]);
      return;
    }

    let isMounted = true;
    async function initLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setLocationError('Permiso denegado.');
            setIsLoadingLocation(false);
          }
          return;
        }
        let position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => 
          Location.getLastKnownPositionAsync()
        );

        if (position && isMounted) {
          const { latitude, longitude } = position.coords;
          setCoords({ latitude, longitude });
          setIsLoadingLocation(false);
          sendLocationToBackend(latitude, longitude);
        } else if (isMounted) {
          setLocationError('Buscando GPS...');
          setIsLoadingLocation(false);
        }
      } catch {
        if (isMounted) {
          setLocationError('Error de GPS.');
          setIsLoadingLocation(false);
        }
      }
    }
    initLocation();
    return () => { isMounted = false; };
  }, [historyLocation, isHistoryPreview, sendLocationToBackend]);

  useEffect(() => {
    if (isHistoryPreview) return;
    if (!coords) return;
    fetchFriends();
    const interval = setInterval(() => {
      if (coordsRef.current) {
        sendLocationToBackend(coordsRef.current.latitude, coordsRef.current.longitude);
        fetchFriends();
      }
    }, UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [coords, isHistoryPreview, sendLocationToBackend, fetchFriends]);

  useEffect(() => {
    if (isHistoryPreview) {
      centerOnHistoryLocation();
      return;
    }

    if (route.params?.focusUserId && friends.length > 0) {
      const friend = friends.find(f => f.userId === route.params.focusUserId);
      if (friend && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: friend.latitude,
          longitude: friend.longitude,
          ...INITIAL_DELTA,
        }, 1000);
      }
    }
  }, [centerOnHistoryLocation, friends, isHistoryPreview, route.params?.focusUserId]);

  function renderMap() {
    if (!coords) return null;

    const JITTER_THRESHOLD = 0.0001; // ~11 meters
    const getJitteredCoords = (friend, index) => {
      let isColliding = false;
      let collisionIndex = 0;

      // Check collision with user
      if (
        Math.abs(friend.latitude - coords.latitude) < JITTER_THRESHOLD &&
        Math.abs(friend.longitude - coords.longitude) < JITTER_THRESHOLD
      ) {
        isColliding = true;
        collisionIndex = index + 1;
      }

      // Check collision with previous friends
      if (!isColliding) {
        for (let i = 0; i < index; i++) {
          const other = friends[i];
          if (
            Math.abs(friend.latitude - other.latitude) < JITTER_THRESHOLD &&
            Math.abs(friend.longitude - other.longitude) < JITTER_THRESHOLD
          ) {
            isColliding = true;
            collisionIndex = i + index + 1;
            break;
          }
        }
      }

      if (isColliding) {
        // Apply circular jitter
        const angle = collisionIndex * (Math.PI / 4); // 45 degrees step
        const radius = 0.00015; // ~15 meters
        return {
          latitude: friend.latitude + Math.sin(angle) * radius,
          longitude: friend.longitude + Math.cos(angle) * radius,
        };
      }
      return { latitude: friend.latitude, longitude: friend.longitude };
    };

    return (
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={{ ...coords, ...INITIAL_DELTA }}
          mapPadding={MAP_CONTROL_PADDING}
          showsCompass
        >
          {isHistoryPreview ? (
            <Marker
              coordinate={{
                latitude: historyLocation.latitude,
                longitude: historyLocation.longitude,
              }}
              zIndex={10}
            >
              <View style={[styles.miniMarker, { backgroundColor: colors.primary }]} />
              <Callout>
                <View style={styles.userCallout}>
                  <Text style={styles.calloutName}>{historyLocation.username}</Text>
                  <Text style={styles.calloutLabel}>
                    {historyLocation.label || 'Ubicación registrada'}
                  </Text>
                </View>
              </Callout>
            </Marker>
          ) : (
            <Marker
              coordinate={coords}
              zIndex={5}
            >
              <View style={[styles.miniMarker, { backgroundColor: colors.primary }]} />
              <Callout>
                <View style={styles.userCallout}>
                  <Text style={styles.calloutName}>Tú</Text>
                  <Text style={styles.calloutLabel}>{myLabel || "Sin tag"}</Text>
                </View>
              </Callout>
            </Marker>
          )}

          {!isHistoryPreview && friends.map((friend, index) => {
            const { latitude: jitterLat, longitude: jitterLon } = getJitteredCoords(friend, index);

            return (
              <Marker 
                key={friend.userId} 
                coordinate={{ latitude: jitterLat, longitude: jitterLon }} 
                zIndex={10 + index}
              >
                <View style={[styles.miniMarker, { backgroundColor: friend.pinColor || '#FF6B6B' }]} />
                <Callout style={styles.callout}>
                  <View>
                    <Text style={styles.calloutName}>{friend.username}</Text>
                    {friend.label && <Text style={styles.calloutLabel}>✨ {friend.label}</Text>}
                    <Text style={styles.calloutDistance}>📍 A {friend.distance}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {isEditingLabel && !isHistoryPreview && (
          <Pressable
            style={styles.keyboardDismissOverlay}
            onPress={Keyboard.dismiss}
            testID="map-keyboard-dismiss-overlay"
          />
        )}

        {isHistoryPreview ? (
          <>
            <View style={styles.previewHeader}>
              <Pressable
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                testID="history-map-back-button"
              >
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.previewInfo}>
                <Text style={styles.greeting}>{historyLocation.username}</Text>
                <Text style={styles.previewSubtitle}>
                  {historyLocation.label || 'Ubicación registrada'}
                </Text>
              </View>
            </View>

            <Pressable style={styles.centerButton} onPress={centerOnHistoryLocation}>
              <Ionicons name="locate" size={24} color={colors.primary} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.floatingHeader}>
                <View style={styles.userHeaderInfo}>
                    <Text style={styles.greeting}>@{user?.username}</Text>
                    <CoordsCard lastSent={lastSent} />
                </View>
                <SyncBadge status={syncStatus} />
            </View>

            <KeyboardAvoidingView
              behavior="position"
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
              pointerEvents="box-none"
              style={styles.keyboardAvoidingFooter}
              testID="map-keyboard-avoiding-footer"
            >
              <View style={styles.floatingFooter}>
                <View style={styles.tagCapsule}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.textMuted} />
                    <TextInput
                        testID="map-label-input"
                        style={styles.labelTextInput}
                        value={tempLabel}
                        onChangeText={setTempLabel}
                        placeholder={myLabel || "Contale a tus amigos dónde estás..."}
                        placeholderTextColor={colors.textMuted}
                        maxLength={30}
                        returnKeyType="done"
                        onSubmitEditing={onUpdateLabel}
                        onFocus={() => setIsEditingLabel(true)}
                        onBlur={() => setIsEditingLabel(false)}
                    />
                    
                    {isUpdatingLabel ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <View style={{flexDirection: 'row', gap: 10}}>
                            {tempLabel !== '' && (
                                <Pressable onPress={onUpdateLabel}>
                                    <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                                </Pressable>
                            )}
                            {myLabel !== '' && (
                                <Pressable onPress={async () => {
                                    try {
                                        await deleteLabel();
                                        setMyLabel('');
                                        setTempLabel('');
                                    } catch (err) {
                                        Alert.alert("Error", "No se pudo borrar.");
                                    }
                                }}>
                                    <Ionicons name="close-circle-outline" size={28} color={colors.error} />
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
              </View>
            </KeyboardAvoidingView>

            <Pressable style={styles.centerButton} onPress={centerOnMe}>
              <Ionicons name="locate" size={24} color={colors.primary} />
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoadingLocation ? (
        <StatusView loading title="Localizando..." />
      ) : locationError && !coords ? (
        <StatusView emoji="📍" title="GPS" message={locationError} action={{ label: 'Configuración', onPress: () => Linking.openSettings() }} />
      ) : (
        renderMap()
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapWrapper: { flex: 1 },
  map: { flex: 1 },
  keyboardDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  miniMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  userCallout: {
    padding: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  callout: {
    width: 160,
    padding: 5,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  calloutLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutDistance: {
    fontSize: 11,
    color: '#666',
  },
  floatingHeader: {
    position: 'absolute', top: 50, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.9)', 
    padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  userHeaderInfo: { flex: 1 },
  greeting: { fontSize: fontSizes.md, fontWeight: '700', color: '#FFFFFE' },
  previewHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },

  keyboardAvoidingFooter: {
    position: 'absolute', bottom: 30, left: 20, right: 20,
    zIndex: 20,
  },
  floatingFooter: {
    alignItems: 'center', zIndex: 20,
  },
  tagCapsule: {
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 35,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
    elevation: 8,
    width: '100%',
  },
  labelTextInput: { 
    flex: 1, color: colors.text, fontSize: fontSizes.sm, 
    fontWeight: '600', marginLeft: 10, padding: 5,
  },

  centerButton: {
    position: 'absolute', right: 20, bottom: 120,
    zIndex: 10,
    backgroundColor: colors.surface, width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  
  callout: { width: 140, padding: 5 },
  calloutName: { fontWeight: 'bold', fontSize: fontSizes.md, color: '#000' },
  calloutLabel: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '600', marginTop: 2 },
  calloutDistance: { fontSize: fontSizes.xs, color: '#444', marginTop: 4 },
});
