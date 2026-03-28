import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth, AuthProvider } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

function Navigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // Ocultar el header por defecto para controlarlo nosotros
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {user ? (
          // El usuario está logueado: mostramos las pantallas principales
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // El usuario NO está logueado: mostramos el flujo de autenticación
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            {/* Aquí agregarías ForgotPassword después */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Envolvemos el Navigator en el AuthProvider para que tenga acceso al contexto
export function AppNavigator() {
  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}
