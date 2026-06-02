import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  TextInputProps,
  ViewStyle,
} from 'react-native';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export function FormInput({
  label,
  error,
  isPassword,
  containerStyle,
  ...props
}: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.focused, !!error && styles.errored]}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#9ca3af"
          secureTextEntry={isPassword && !visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
          autoCorrect={false}
          {...props}
        />
        {isPassword && (
          <Pressable onPress={() => setVisible((v) => !v)} style={styles.eye}>
            <Text style={styles.eyeText}>{visible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  focused: { borderColor: '#7c3aed', backgroundColor: '#fff' },
  errored: { borderColor: '#ef4444' },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
  },
  eye: { paddingHorizontal: 14 },
  eyeText: { fontSize: 13, color: '#7c3aed', fontWeight: '600' },
  error: { fontSize: 12, color: '#ef4444', marginTop: 2 },
});
