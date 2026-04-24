import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppInput } from '../../src/components/AppInput';

describe('AppInput', () => {
  it('renders with a label', () => {
    const { getByText } = render(
      <AppInput label="Email" value="" onChangeText={jest.fn()} />
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders without a label when not provided', () => {
    const { queryByText } = render(
      <AppInput value="" onChangeText={jest.fn()} />
    );
    // No label text element
    expect(queryByText('Email')).toBeNull();
  });

  it('calls onChangeText when user types', () => {
    const onChangeMock = jest.fn();
    const { getByPlaceholderText } = render(
      <AppInput
        label="Email"
        placeholder="Enter email"
        value=""
        onChangeText={onChangeMock}
      />
    );
    fireEvent.changeText(getByPlaceholderText('Enter email'), 'test@test.com');
    expect(onChangeMock).toHaveBeenCalledWith('test@test.com');
  });

  it('displays error message when error prop is set', () => {
    const { getByText } = render(
      <AppInput label="Email" value="" onChangeText={jest.fn()} error="Invalid email" />
    );
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('does not render error text when error is not set', () => {
    const { queryByText } = render(
      <AppInput label="Email" value="" onChangeText={jest.fn()} />
    );
    expect(queryByText('Invalid email')).toBeNull();
  });

  it('renders eye-toggle button when showToggle is true', () => {
    const { getByText } = render(
      <AppInput
        label="Password"
        value=""
        onChangeText={jest.fn()}
        secureTextEntry={true}
        showToggle={true}
        onToggleSecure={jest.fn()}
      />
    );
    // Shows eye emoji when secureTextEntry = true
    expect(getByText('👁')).toBeTruthy();
  });

  it('calls onToggleSecure when eye icon is pressed', () => {
    const toggleMock = jest.fn();
    const { getByText } = render(
      <AppInput
        label="Password"
        value=""
        onChangeText={jest.fn()}
        secureTextEntry={true}
        showToggle={true}
        onToggleSecure={toggleMock}
      />
    );
    fireEvent.press(getByText('👁'));
    expect(toggleMock).toHaveBeenCalledTimes(1);
  });

  it('shows monkey emoji when password is visible (secureTextEntry=false)', () => {
    const { getByText } = render(
      <AppInput
        label="Password"
        value=""
        onChangeText={jest.fn()}
        secureTextEntry={false}
        showToggle={true}
        onToggleSecure={jest.fn()}
      />
    );
    expect(getByText('🙈')).toBeTruthy();
  });

  it('does not render toggle when showToggle is false', () => {
    const { queryByText } = render(
      <AppInput
        label="Password"
        value=""
        onChangeText={jest.fn()}
        secureTextEntry={true}
        showToggle={false}
        onToggleSecure={jest.fn()}
      />
    );
    expect(queryByText('👁')).toBeNull();
    expect(queryByText('🙈')).toBeNull();
  });
});
