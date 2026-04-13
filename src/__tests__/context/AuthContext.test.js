import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('../../api/auth', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('../../api/users', () => ({
  usersApi: {
    deleteAccount: jest.fn(),
  },
}));

import { authApi } from '../../api/auth';
import { usersApi } from '../../api/users';
import { AuthProvider, useAuth } from '../../context/AuthContext';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage._reset();
    SecureStore._reset();
  });

  it('loads stored session on mount', async () => {
    const userData = { user: { id: '1', username: 'test' } };
    await AsyncStorage.setItem('authToken', 'fake-token');
    await AsyncStorage.setItem('userData', JSON.stringify(userData));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for the useEffect to finish
    await act(async () => {
      // Small delay for async storage
      await new Promise(r => setTimeout(r, 10));
    });

    expect(result.current.user).toEqual(userData);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles login correctly', async () => {
    const loginResponse = {
      data: {
        accessToken: 'at',
        refreshToken: 'rt',
        user: { id: '1', username: 'test' }
      }
    };
    authApi.login.mockResolvedValueOnce(loginResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@test.com', 'pass123');
    });

    expect(result.current.user).toEqual({ user: loginResponse.data.user });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'at');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'rt');
  });

  it('handles logout correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Simulate logged in state manually for this test if needed 
    // or just rely on the logout clearing everything
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userData');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    expect(authApi.logout).toHaveBeenCalled();
  });

  it('handles deleteAccount correctly', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.deleteAccount('secret-pass');
    });

    expect(usersApi.deleteAccount).toHaveBeenCalledWith('secret-pass');
    expect(result.current.user).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
  });

  it('throws error if useAuth is used outside Provider', () => {
    // We suppress console error for this test as it's expected
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth debe usarse dentro de <AuthProvider>');
    
    consoleSpy.mockRestore();
  });
});
