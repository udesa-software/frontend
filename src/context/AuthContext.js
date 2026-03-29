import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';

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
        }
      } catch (err) {
        console.error('Error cargando sesión:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredSession();
  }, []);

  const login = async (identifier, password) => {
    const response = await authApi.login(identifier, password);
    const { token, ...rest } = response.data;

    // Guarda el token y los datos del usuario en el dispositivo
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(rest));

    setUser(rest);
    return response.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Si el servidor falla, igual limpiamos localmente
      console.warn('Error al hacer logout en servidor:', err.message);
    } finally {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
