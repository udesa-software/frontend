import React from 'react';
import { TextInput, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSizes, radii } from '../theme';

export function AppInput({
  label,
  error,
  secureTextEntry,
  showToggle,
  onToggleSecure,
  wrapperStyle,
  ...props
}) {
  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          {...props}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggleSecure} style={styles.toggle}>
            <Text style={styles.toggleText}>{secureTextEntry ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.md,
    height: 50,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
  },
  toggle: {
    padding: spacing.xs,
  },
  toggleText: {
    fontSize: 16,
  },
});
