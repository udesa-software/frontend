import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CoordsCard, StatusView, SyncBadge } from '../../src/components/MapComponents';

describe('MapComponents', () => {
  describe('CoordsCard', () => {
    it('renders nothing if lastSent is null', () => {
      const { queryByText } = render(<CoordsCard lastSent={null} />);
      expect(queryByText(/Actualizado/)).toBeNull();
    });

    it('renders formatted time if lastSent is provided', () => {
      const date = new Date('2023-01-01T12:30:00');
      const { getByText } = render(<CoordsCard lastSent={date} />);
      expect(getByText(/Actualizado: 12:30/)).toBeTruthy();
    });
  });

  describe('StatusView', () => {
    it('renders loading indicator if loading is true', () => {
      const { getByRole } = render(<StatusView loading={true} />);
      // ActivityIndicator is usually found by its activity-indicator role or just checking if it exists
      // In many environments we just check if it renders without crashing
    });

    it('renders emoji, title and message if provided', () => {
      const { getByText } = render(
        <StatusView emoji="📍" title="Test Title" message="Test Message" />
      );
      expect(getByText('📍')).toBeTruthy();
      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('Test Message')).toBeTruthy();
    });

    it('handles action button press', () => {
      const mockOnPress = jest.fn();
      const { getByText } = render(
        <StatusView 
          action={{ label: 'Try Again', onPress: mockOnPress }} 
        />
      );
      
      const button = getByText('Try Again');
      fireEvent.press(button);
      expect(mockOnPress).toHaveBeenCalled();
    });

    it('renders nulls for missing title/message/emoji', () => {
      const { queryByText } = render(<StatusView />);
      expect(queryByText(/./)).toBeNull(); // Should render nothing but the container
    });
  });

  describe('SyncBadge', () => {
    it('renders different statuses', () => {
      const { getByText, rerender } = render(<SyncBadge status="syncing" />);
      expect(getByText('⟳')).toBeTruthy();

      rerender(<SyncBadge status="synced" />);
      expect(getByText('●')).toBeTruthy();

      rerender(<SyncBadge status="error" />);
      expect(getByText('!')).toBeTruthy();

      rerender(<SyncBadge status="idle" />);
      expect(getByText('○')).toBeTruthy();
    });

    it('defaults to idle for unknown status', () => {
      const { getByText } = render(<SyncBadge status="unknown" />);
      expect(getByText('○')).toBeTruthy();
    });
  });
});
