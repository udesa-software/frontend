import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/auth';
import { usersApi } from '../api/users';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { token, username, email, ... }
  const [isLoading, setIsLoading] = useState(true); // true mientras carga el token guardado

  // Al iniciar la app, chequea si ya hay un token guardado
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userData = await AsyncStorage.getItem('userData');
        if (token && userData) {
          setUser(JSON.parse(userData));
          // Register push notifications token on session restoration (CA.3)
          registerForPushNotificationsAsync().catch((err) =>
            console.error('Failed to trigger auto-restored token registration:', err)
          );
        }
      } catch (err) {
        console.error('Error cargando sesión:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredSession();
  }, []);

  // Helpers para SecureStore del refreshToken
  const saveRefreshToken = (token) => {
    if (token) return SecureStore.setItemAsync('refreshToken', token);
    return Promise.resolve();
  };
  const clearRefreshToken = () => SecureStore.deleteItemAsync('refreshToken');

  const login = async (identifier, password) => {
    const response = await authApi.login(identifier, password);
    const { accessToken, refreshToken, user, ...rest } = response.data;

    // accessToken en AsyncStorage (leído por el interceptor HTTP)
    if (accessToken) {
      await AsyncStorage.setItem('authToken', accessToken);
    }
    
    // Guardar directamente el objeto 'user', no un objeto con la llave 'user'
    if (user) {
      await AsyncStorage.setItem('userData', JSON.stringify(user));
    }

    // refreshToken en SecureStore (almacén cifrado del SO)
    await saveRefreshToken(refreshToken);

    setUser(user);

    // Register push notification token asynchronously upon login (CA.3)
    registerForPushNotificationsAsync().catch((err) =>
      console.error('Failed to trigger post-login token registration:', err)
    );

    return response.data;
  };

  const clearLocalSession = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
    await clearRefreshToken();
    setUser(null);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Si el servidor falla, igual limpiamos localmente
      console.warn('Error al hacer logout en servidor:', err.message);
    } finally {
      await clearLocalSession();
    }
  };

  const deleteAccount = async (password) => {
    // CA.3: Requerimos contraseña actual y token (apiClient ya inyecta el token)
    await usersApi.deleteAccount(password);

    // Si la llamada fue exitosa (no lanzó error), limpiamos sesión
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
    await clearRefreshToken();
    setUser(null);
  };

  const updateProfile = async (data) => {
    const response = await usersApi.updateProfile(data);
    // Asumimos que response.data trae los datos actualizados
    const updatedUser = { ...user, ...response.data };
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const uploadProfilePhoto = async (formData) => {
    const response = await usersApi.uploadProfilePhoto(formData);
    const updatedUser = { ...user, profile_photo_url: response.data.profile_photo_url };
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return response.data.profile_photo_url;
  };

  const deleteProfilePhoto = async () => {
    await usersApi.deleteProfilePhoto();
    const updatedUser = { ...user, profile_photo_url: null };
    await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, clearLocalSession, deleteAccount, updateProfile, uploadProfilePhoto, deleteProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar el contexto fácilmente en cualquier pantalla
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
