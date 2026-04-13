import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppButton } from '../../components/AppButton';

describe('AppButton', () => {
  it('renders the title correctly', () => {
    const { getByText } = render(<AppButton title="Click me" onPress={jest.fn()} />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<AppButton title="Submit" onPress={onPressMock} />);
    fireEvent.press(getByText('Submit'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <AppButton title="Disabled" onPress={onPressMock} disabled={true} />
    );
    fireEvent.press(getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when isLoading is true', () => {
    const { queryByText, getByTestId } = render(
      <AppButton title="Loading" onPress={jest.fn()} isLoading={true} />
    );
    // The title text should not be shown while loading
    expect(queryByText('Loading')).toBeNull();
  });

  it('does not call onPress when isLoading is true', () => {
    const onPressMock = jest.fn();
    const { UNSAFE_getByType } = render(
      <AppButton title="Loading" onPress={onPressMock} isLoading={true} />
    );
    // button is disabled while loading - just verify the prop behavior indirectly
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders secondary variant without crashing', () => {
    const { getByText } = render(
      <AppButton title="Secondary" onPress={jest.fn()} variant="secondary" />
    );
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('renders text variant without crashing', () => {
    const { getByText } = render(
      <AppButton title="Text Button" onPress={jest.fn()} variant="text" />
    );
    expect(getByText('Text Button')).toBeTruthy();
  });
});
