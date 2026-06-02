import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PREF_KEY = 'biometric_lock_enabled';

export function useBiometricLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Load preference and check hardware support
  useEffect(() => {
    async function init() {
      const [hasHardware, enrolled, pref] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(PREF_KEY),
      ]);
      const supported = hasHardware && enrolled;
      setIsSupported(supported);
      setIsEnabled(supported && pref === 'true');
    }
    init();
  }, []);

  // Lock on background → foreground transition
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      const nowActive = nextState === 'active';

      if (wasBackground && nowActive && isEnabled) {
        setIsLocked(true);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [isEnabled]);

  // Trigger auth when locked
  useEffect(() => {
    if (isLocked && !authenticating) {
      authenticate();
    }
  }, [isLocked]);

  const authenticate = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Manter',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        setIsLocked(false);
      }
    } finally {
      setAuthenticating(false);
    }
  }, [authenticating]);

  const toggleEnabled = useCallback(async (value: boolean) => {
    if (value && !isSupported) return;
    if (value) {
      // Require auth before enabling to confirm it works
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm biometric to enable lock',
      });
      if (!result.success) return;
    }
    await SecureStore.setItemAsync(PREF_KEY, value ? 'true' : 'false');
    setIsEnabled(value);
  }, [isSupported]);

  return { isLocked, isEnabled, isSupported, authenticating, authenticate, toggleEnabled };
}
