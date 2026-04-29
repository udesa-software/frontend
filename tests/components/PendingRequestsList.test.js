import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PendingRequestsList } from '../../src/components/PendingRequestsList';
import { friendsApi } from '../../src/api/friends';

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    getPendingRequests: jest.fn(),
    acceptRequest: jest.fn(),
    declineRequest: jest.fn(),
  }
}));

describe('PendingRequestsList', () => {
  const mockRequests = [
    { requester_id: '1', requester_username: 'user1', created_at: '2023-01-01T10:00:00Z' },
    { requester_id: '2', requester_username: 'user2', created_at: '2023-01-02T10:00:00Z' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    friendsApi.getPendingRequests.mockResolvedValue({
      data: {
        data: mockRequests,
        pagination: { page: 1, totalPages: 1 }
      }
    });
    friendsApi.acceptRequest.mockResolvedValue({ data: { message: 'Ok' } });
    friendsApi.declineRequest.mockResolvedValue({ data: { message: 'Ok' } });
  });

  it('renders requests correctly', async () => {
    const { findByText } = render(<PendingRequestsList />);

    expect(await findByText('user1')).toBeTruthy();
    expect(await findByText('user2')).toBeTruthy();
    expect(friendsApi.getPendingRequests).toHaveBeenCalledWith(1);
  });

  it('shows empty message when no requests', async () => {
    friendsApi.getPendingRequests.mockResolvedValueOnce({
      data: { data: [], pagination: { page: 1, totalPages: 0 } }
    });
    const { findByText } = render(<PendingRequestsList />);

    expect(await findByText('No tenés solicitudes pendientes.')).toBeTruthy();
  });

  it('handles accept request', async () => {
    const { findByTestId, queryByText, findByText } = render(<PendingRequestsList />);

    await findByText('user1');
    const acceptBtn = await findByTestId('accept-btn-1');
    fireEvent.press(acceptBtn);

    await waitFor(() => {
      expect(friendsApi.acceptRequest).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(queryByText('user1')).toBeNull();
    });
  });

  it('handles decline request', async () => {
    const { findByTestId, queryByText, findByText } = render(<PendingRequestsList />);

    await findByText('user1');
    const declineBtn = await findByTestId('decline-btn-1');
    fireEvent.press(declineBtn);

    await waitFor(() => {
      expect(friendsApi.declineRequest).toHaveBeenCalledWith('1');
    });

    await waitFor(() => {
      expect(queryByText('user1')).toBeNull();
    });
  });

  it('handles accept request error', async () => {
    const { findByTestId, findByText } = render(<PendingRequestsList />);

    await findByText('user1');
    friendsApi.acceptRequest.mockRejectedValueOnce(new Error('Network error'));

    const acceptBtn = await findByTestId('accept-btn-1');
    fireEvent.press(acceptBtn);

    await waitFor(() => {
      expect(friendsApi.acceptRequest).toHaveBeenCalledWith('1');
    });

    // Debería seguir estando en la lista porque falló
    expect(await findByText('user1')).toBeTruthy();
  });

  it('handles decline request error', async () => {
    const { findByTestId, findByText } = render(<PendingRequestsList />);

    await findByText('user1');
    friendsApi.declineRequest.mockRejectedValueOnce({ response: { data: { error: 'Backend error' } } });

    const declineBtn = await findByTestId('decline-btn-1');
    fireEvent.press(declineBtn);

    await waitFor(() => {
      expect(friendsApi.declineRequest).toHaveBeenCalledWith('1');
    });

    // Debería seguir estando en la lista porque falló
    expect(await findByText('user1')).toBeTruthy();
  });

  it('handles fetch requests error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    friendsApi.getPendingRequests.mockRejectedValueOnce(new Error('Fetch error'));
    const { queryByText, findByText } = render(<PendingRequestsList />);

    await waitFor(() => {
      expect(friendsApi.getPendingRequests).toHaveBeenCalledWith(1);
    });

    // No debería mostrar items porque falló la carga
    expect(queryByText('user1')).toBeNull();
    // Muestra mensaje de error inline
    expect(await findByText(/No se pudieron cargar/)).toBeTruthy();
    spy.mockRestore();
  });

  it('handles refresh', async () => {
    const { getByTestId, findByText, queryByText } = render(<PendingRequestsList />);
    await findByText('user1');

    friendsApi.getPendingRequests.mockResolvedValueOnce({
      data: {
        data: [{ requester_id: 'refresh1', requester_username: 'refresh_user', created_at: new Date().toISOString() }],
        pagination: { page: 1, totalPages: 1 }
      }
    });

    const flatList = getByTestId('pending-requests-list');
    await act(async () => {
      flatList.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(friendsApi.getPendingRequests).toHaveBeenCalledWith(1);
    });

    expect(await findByText('refresh_user')).toBeTruthy();
    expect(queryByText('user1')).toBeNull();
  });

  it('handles load more (onEndReached)', async () => {
    friendsApi.getPendingRequests.mockResolvedValueOnce({
      data: {
        data: [{ requester_id: 'user1', requester_username: 'user1', created_at: new Date().toISOString() }],
        pagination: { page: 1, totalPages: 2 }
      }
    });

    friendsApi.getPendingRequests.mockResolvedValueOnce({
      data: {
        data: [{ requester_id: 'loadmore1', requester_username: 'loadmore_user', created_at: new Date().toISOString() }],
        pagination: { page: 2, totalPages: 2 }
      }
    });

    const { getByTestId, findByText } = render(<PendingRequestsList />);
    await findByText('user1');

    const flatList = getByTestId('pending-requests-list');
    await act(async () => {
      flatList.props.onEndReached();
    });

    await waitFor(() => {
      expect(friendsApi.getPendingRequests).toHaveBeenCalledWith(2);
    });

    expect(await findByText('loadmore_user')).toBeTruthy();
  });
});
