import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { UserProfileScreen } from '../../src/screens/UserProfileScreen';
import { usersApi } from '../../src/api/users';
import { friendsApi } from '../../src/api/friends';
import { getFriendProfile } from '../../src/api/location';
import { useRoute } from '@react-navigation/native';

jest.mock('../../src/api/users', () => ({
  usersApi: {
    getUserPublicProfile: jest.fn(),
  }
}));

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    getRelationshipStatus: jest.fn(),
    sendRequest: jest.fn(),
    removeFriend: jest.fn(),
    cancelRequest: jest.fn(),
    acceptRequest: jest.fn(),
    declineRequest: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    reportUser: jest.fn(),
  }
}));

jest.mock('../../src/api/location', () => ({
  getFriendProfile: jest.fn(),
}));

const mockProfile = { id: 'user-1', username: 'juan', biography: 'Hola', is_private: false };

describe('UserProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRoute.mockReturnValue({ params: { userId: 'user-1', username: 'juan' } });
    usersApi.getUserPublicProfile.mockResolvedValue({ data: mockProfile });
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'none' } });
    getFriendProfile.mockResolvedValue({ isHistoryPrivate: false, location_history: [] });
  });

  // ── Renders ────────────────────────────────────────────────────────────────

  it('renders correctly and fetches profile', async () => {
    const { findAllByText } = render(<UserProfileScreen />);
    const juanEls = await findAllByText('juan');
    expect(juanEls.length).toBeGreaterThanOrEqual(1);
    expect(usersApi.getUserPublicProfile).toHaveBeenCalledWith('user-1');
    expect(friendsApi.getRelationshipStatus).toHaveBeenCalledWith('user-1');
  });

  it('shows biography text', async () => {
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Hola')).toBeTruthy();
  });

  it('shows Sin biografía when biography is empty', async () => {
    usersApi.getUserPublicProfile.mockResolvedValue({ data: { ...mockProfile, biography: '' } });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Sin biografía')).toBeTruthy();
  });

  // ── Action button states ───────────────────────────────────────────────────

  it('shows Agregar amigo button when status is none', async () => {
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Agregar amigo')).toBeTruthy();
  });

  it('shows Eliminar amigo button when status is friends', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Eliminar amigo')).toBeTruthy();
  });

  it('shows Cancelar solicitud button when status is pending_sent', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_sent' } });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Cancelar solicitud')).toBeTruthy();
  });

  it('shows Aceptar / Rechazar when status is pending_received', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_received' } });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Aceptar')).toBeTruthy();
    expect(await findByText('Rechazar')).toBeTruthy();
  });

  it('shows no action buttons and no Bloquear when status is self', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'self' } });
    const { queryByText, findAllByText } = render(<UserProfileScreen />);
    await findAllByText('juan');
    expect(queryByText('Agregar amigo')).toBeNull();
    expect(queryByText('Bloquear usuario')).toBeNull();
  });

  it('shows Desbloquear usuario when status is blocked', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'blocked' } });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Desbloquear usuario')).toBeTruthy();
  });

  it('shows Bloquear usuario when status is none', async () => {
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Bloquear usuario')).toBeTruthy();
  });

  // ── Friend location history ───────────────────────────────────────────────

  it('shows location history when friends and not private', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    getFriendProfile.mockResolvedValue({
      isHistoryPrivate: false,
      location_history: [{ label: 'Café San Martín', createdAt: new Date(Date.now() - 60000).toISOString() }]
    });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText(/Café San Martín/)).toBeTruthy();
  });

  it('shows private message when friends but history is private', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    getFriendProfile.mockResolvedValue({ isHistoryPrivate: true, location_history: [] });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('El historial de este usuario es privado')).toBeTruthy();
  });

  it('shows Sin actividad reciente when friends and history is empty', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    getFriendProfile.mockResolvedValue({ isHistoryPrivate: false, location_history: [] });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Sin actividad reciente')).toBeTruthy();
  });

  it('shows location history fallback label when no label on item', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    getFriendProfile.mockResolvedValue({
      isHistoryPrivate: false,
      location_history: [{ label: null, createdAt: new Date().toISOString() }]
    });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('📍 Ubicación registrada')).toBeTruthy();
  });

  it('shows locked message when not friends and not self', async () => {
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Hacete amigo para ver el historial de lugares')).toBeTruthy();
  });

  // ── Action handlers ───────────────────────────────────────────────────────

  it('handleAdd: sends request and changes status to pending_sent', async () => {
    friendsApi.sendRequest.mockResolvedValue({ data: {} });
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Agregar amigo');
    fireEvent.press(getByTestId('action-add'));
    await waitFor(() => expect(friendsApi.sendRequest).toHaveBeenCalledWith('user-1'));
    expect(await findByText('Cancelar solicitud')).toBeTruthy();
  });

  it('handleAdd: shows alert on error', async () => {
    friendsApi.sendRequest.mockRejectedValueOnce({ response: { data: { error: 'Ya existe' } } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Agregar amigo');
    fireEvent.press(getByTestId('action-add'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Error', 'Ya existe'));
  });

  it('handleCancel: cancels request and changes status to none', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_sent' } });
    friendsApi.cancelRequest.mockResolvedValue({ data: {} });
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Cancelar solicitud');
    fireEvent.press(getByTestId('action-cancel'));
    await waitFor(() => expect(friendsApi.cancelRequest).toHaveBeenCalledWith('user-1'));
    expect(await findByText('Agregar amigo')).toBeTruthy();
  });

  it('handleAccept: accepts request and changes status to friends', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_received' } });
    friendsApi.acceptRequest.mockResolvedValue({ data: {} });
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Aceptar');
    fireEvent.press(getByTestId('action-accept'));
    await waitFor(() => expect(friendsApi.acceptRequest).toHaveBeenCalledWith('user-1'));
    expect(await findByText('Eliminar amigo')).toBeTruthy();
  });

  it('handleDecline: declines request and changes status to none', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_received' } });
    friendsApi.declineRequest.mockResolvedValue({ data: {} });
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Rechazar');
    fireEvent.press(getByTestId('action-decline'));
    await waitFor(() => expect(friendsApi.declineRequest).toHaveBeenCalledWith('user-1'));
    expect(await findByText('Agregar amigo')).toBeTruthy();
  });

  it('handleRemove: shows confirmation alert and removes on confirm', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    friendsApi.removeFriend.mockResolvedValue({ data: {} });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Eliminar amigo');
    fireEvent.press(getByTestId('action-remove'));

    expect(spy).toHaveBeenCalledWith('Eliminar Amigo', expect.any(String), expect.any(Array));
    const [, , buttons] = spy.mock.calls[0];
    const confirm = buttons.find(b => b.text === 'Eliminar');
    await act(async () => { await confirm.onPress(); });
    expect(friendsApi.removeFriend).toHaveBeenCalledWith('user-1');
    expect(await findByText('Agregar amigo')).toBeTruthy();
  });

  it('handleUnblock: unblocks user and changes to none', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'blocked' } });
    friendsApi.unblockUser.mockResolvedValue({ data: {} });
    const { findByText } = render(<UserProfileScreen />);
    await findByText('Desbloquear usuario');
    fireEvent.press(await findByText('Desbloquear usuario'));
    await waitFor(() => expect(friendsApi.unblockUser).toHaveBeenCalledWith('user-1'));
    expect(await findByText('Agregar amigo')).toBeTruthy();
  });

  it('back button calls navigation.goBack()', async () => {
    const { useNavigation } = require('@react-navigation/native');
    const navMock = useNavigation();
    const { findAllByText, getByTestId } = render(<UserProfileScreen />);
    await findAllByText('juan');
    fireEvent.press(getByTestId('back-button'));
    expect(navMock.goBack).toHaveBeenCalled();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('handles profile fetch error gracefully', async () => {
    usersApi.getUserPublicProfile.mockRejectedValueOnce(new Error('Not found'));
    const spy = jest.spyOn(Alert, 'alert');
    render(<UserProfileScreen />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });

  it('shows online status correctly', async () => {
    usersApi.getUserPublicProfile.mockResolvedValue({
      data: { ...mockProfile, is_online: true }
    });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('En línea')).toBeTruthy();
  });

  it('shows last seen when offline and last_seen_at is set', async () => {
    usersApi.getUserPublicProfile.mockResolvedValue({
      data: { ...mockProfile, is_online: false, last_seen_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
    });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText(/Visto hace/)).toBeTruthy();
  });

  it('shows Sin actividad when offline and no last_seen_at', async () => {
    usersApi.getUserPublicProfile.mockResolvedValue({
      data: { ...mockProfile, is_online: false, last_seen_at: null }
    });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Sin actividad')).toBeTruthy();
  });

  // ── formatTimeAgo edge cases ───────────────────────────────────────────────

  it('shows Visto hace X h when offline with hours-ago last_seen_at', async () => {
    usersApi.getUserPublicProfile.mockResolvedValue({
      data: { ...mockProfile, is_online: false, last_seen_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() }
    });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText(/Visto hace 3 h/)).toBeTruthy();
  });

  it('shows Visto hace X d when offline with days-ago last_seen_at', async () => {
    usersApi.getUserPublicProfile.mockResolvedValue({
      data: { ...mockProfile, is_online: false, last_seen_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
    });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText(/Visto hace 2 d/)).toBeTruthy();
  });

  // ── Handler error branches ─────────────────────────────────────────────────

  it('handles getFriendProfile error when status is friends (fallback empty history)', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    getFriendProfile.mockRejectedValueOnce(new Error('unavailable'));
    const { findByText } = render(<UserProfileScreen />);
    // Falls back to empty history
    expect(await findByText('Sin actividad reciente')).toBeTruthy();
  });

  it('handleRemove: shows alert on removeFriend error', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'friends' } });
    friendsApi.removeFriend.mockRejectedValueOnce({ response: { data: { error: 'No se puede' } } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Eliminar amigo');
    fireEvent.press(getByTestId('action-remove'));
    const [, , buttons] = spy.mock.calls[0];
    const confirm = buttons.find(b => b.text === 'Eliminar');
    await act(async () => { await confirm.onPress(); });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Error', 'No se puede'));
  });

  it('handleAccept: getFriendProfile fails during accept (fallback)', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_received' } });
    friendsApi.acceptRequest.mockResolvedValue({ data: {} });
    getFriendProfile.mockRejectedValueOnce(new Error('location unavailable'));
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Aceptar');
    fireEvent.press(getByTestId('action-accept'));
    await waitFor(() => expect(friendsApi.acceptRequest).toHaveBeenCalled());
    expect(await findByText('Sin actividad reciente')).toBeTruthy();
  });

  it('handleDecline: shows alert on error', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_received' } });
    friendsApi.declineRequest.mockRejectedValueOnce({ response: { data: { error: 'Fallo' } } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Rechazar');
    fireEvent.press(getByTestId('action-decline'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Error', 'Fallo'));
  });

  it('handleCancel: shows alert on error', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'pending_sent' } });
    friendsApi.cancelRequest.mockRejectedValueOnce({ response: { data: { error: 'No cancelable' } } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, getByTestId } = render(<UserProfileScreen />);
    await findByText('Cancelar solicitud');
    fireEvent.press(getByTestId('action-cancel'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Error', 'No cancelable'));
  });

  it('handleBlock: shows confirmation and blocks user on confirm', async () => {
    friendsApi.blockUser.mockResolvedValue({ data: {} });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText } = render(<UserProfileScreen />);
    await findByText('Bloquear usuario');
    fireEvent.press(await findByText('Bloquear usuario'));
    expect(spy).toHaveBeenCalledWith('Bloquear usuario', expect.any(String), expect.any(Array));
    const [, , buttons] = spy.mock.calls[0];
    const confirm = buttons.find(b => b.text === 'Bloquear');
    await act(async () => { await confirm.onPress(); });
    await waitFor(() => expect(friendsApi.blockUser).toHaveBeenCalledWith('user-1', 'juan'));
    expect(await findByText('Desbloquear usuario')).toBeTruthy();
  });

  it('handleBlock: shows alert on blockUser error', async () => {
    friendsApi.blockUser.mockRejectedValueOnce({ response: { data: { error: 'Error al bloquear' } } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText } = render(<UserProfileScreen />);
    await findByText('Bloquear usuario');
    fireEvent.press(await findByText('Bloquear usuario'));
    const [, , buttons] = spy.mock.calls[0];
    const confirm = buttons.find(b => b.text === 'Bloquear');
    await act(async () => { await confirm.onPress(); });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Error', 'Error al bloquear'));
  });

  it('handleUnblock: shows alert on unblockUser error', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'blocked' } });
    friendsApi.unblockUser.mockRejectedValueOnce({ response: { data: { error: 'No desbloqueable' } } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText } = render(<UserProfileScreen />);
    await findByText('Desbloquear usuario');
    fireEvent.press(await findByText('Desbloquear usuario'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Error', 'No desbloqueable'));
  });

  // ── H9: Denunciar usuario ────────────────────────────────────────────────────

  it('shows Denunciar usuario button when status is none', async () => {
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Denunciar usuario')).toBeTruthy();
  });

  it('shows Denunciar usuario button even when status is blocked', async () => {
    friendsApi.getRelationshipStatus.mockResolvedValue({ data: { status: 'blocked' } });
    const { findByText } = render(<UserProfileScreen />);
    expect(await findByText('Denunciar usuario')).toBeTruthy();
  });

  it('handleReportReason: opens reason picker and sends report on selection', async () => {
    friendsApi.reportUser.mockResolvedValue({ data: { message: 'Denuncia enviada' } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, findByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-harassment'));
    await waitFor(() =>
      expect(friendsApi.reportUser).toHaveBeenCalledWith('user-1', 'juan', 'harassment')
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Denuncia enviada', expect.any(String)));
  });

  it('handleReportReason: shows alert on reportUser error', async () => {
    friendsApi.reportUser.mockRejectedValueOnce({
      response: { data: { error: 'Ya reportaste a este usuario, podés volver a hacerlo en 24 horas' } },
    });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, findByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-spam'));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('Error', 'Ya reportaste a este usuario, podés volver a hacerlo en 24 horas')
    );
  });

  // apiClient (src/api/client.js) normaliza los errores de axios a un Error plano con
  // .message (sin .response) — este test reproduce esa forma real, no la forma cruda de axios.
  it('handleReportReason: muestra err.message cuando el error no trae err.response (forma real de apiClient)', async () => {
    friendsApi.reportUser.mockRejectedValueOnce(new Error('Network Error'));
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, findByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-spam'));
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Error', 'Network Error'));
  });

  it('report-cancel: closes the modal without sending a report', async () => {
    const { findByText, findByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-cancel'));
    expect(friendsApi.reportUser).not.toHaveBeenCalled();
  });

  // ── H9: motivo "Otro" con descripción libre ─────────────────────────────────

  it('tapping "Otro" shows the free-text input instead of sending immediately', async () => {
    const { findByText, findByTestId, queryByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-other'));

    expect(await findByTestId('report-other-input')).toBeTruthy();
    expect(friendsApi.reportUser).not.toHaveBeenCalled();
    expect(queryByTestId('report-reason-harassment')).toBeNull();
  });

  it('submit is disabled while the free-text field is empty', async () => {
    const { findByText, findByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-other'));

    fireEvent.press(await findByTestId('report-other-submit'));
    expect(friendsApi.reportUser).not.toHaveBeenCalled();
  });

  it('handleSubmitOtherReason: sends reportUser with reason "other" and the typed detail', async () => {
    friendsApi.reportUser.mockResolvedValue({ data: { message: 'Denuncia enviada' } });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, findByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-other'));

    fireEvent.changeText(await findByTestId('report-other-input'), '  Me mandó mensajes amenazantes  ');
    fireEvent.press(await findByTestId('report-other-submit'));

    await waitFor(() =>
      expect(friendsApi.reportUser).toHaveBeenCalledWith(
        'user-1', 'juan', 'other', 'Me mandó mensajes amenazantes'
      )
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith('Denuncia enviada', expect.any(String)));
  });

  it('handleSubmitOtherReason: shows alert on reportUser error', async () => {
    friendsApi.reportUser.mockRejectedValueOnce({
      response: { data: { error: 'Debés describir el motivo de la denuncia' } },
    });
    const spy = jest.spyOn(Alert, 'alert');
    const { findByText, findByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-other'));

    fireEvent.changeText(await findByTestId('report-other-input'), 'Detalle del caso');
    fireEvent.press(await findByTestId('report-other-submit'));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('Error', 'Debés describir el motivo de la denuncia')
    );
  });

  it('report-cancel from the free-text step resets back to the reason list on reopen', async () => {
    const { findByText, findByTestId, queryByTestId } = render(<UserProfileScreen />);
    fireEvent.press(await findByText('Denunciar usuario'));
    fireEvent.press(await findByTestId('report-reason-other'));
    fireEvent.changeText(await findByTestId('report-other-input'), 'texto que se debería perder');
    fireEvent.press(await findByTestId('report-cancel'));

    fireEvent.press(await findByText('Denunciar usuario'));
    expect(await findByTestId('report-reason-other')).toBeTruthy();
    expect(queryByTestId('report-other-input')).toBeNull();
    expect(friendsApi.reportUser).not.toHaveBeenCalled();
  });
});
