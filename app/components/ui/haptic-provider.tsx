import { createContext, useContext, useMemo } from 'react';
import { useWebHaptics } from 'web-haptics/react';

export interface NozarHaptics {
  lightTap(): void;
  selection(): void;
  success(): void;
  warning(): void;
  error(): void;
  medium(): void;
}

export interface NozarHapticsReturn extends NozarHaptics {
  isSupported: boolean;
}

const HapticContext = createContext<NozarHapticsReturn | null>(null);

export function HapticProvider({ children }: { children: React.ReactNode }) {
  const { trigger, isSupported } = useWebHaptics({
    debug: import.meta.env.DEV, // Enable debug audio feedback in development
    showSwitch: import.meta.env.DEV // Show toggle switch in development
  });

  const value = useMemo<NozarHapticsReturn>(
    () => ({
      lightTap: () => { trigger?.('light'); },
      selection: () => { trigger?.('selection'); },
      success: () => { trigger?.('success'); },
      warning: () => { trigger?.('warning'); },
      error: () => { trigger?.('error'); },
      medium: () => { trigger?.('medium'); },
      isSupported
    }),
    [trigger, isSupported]
  );

  return (
    <HapticContext.Provider value={value}>{children}</HapticContext.Provider>
  );
}

export function useHaptics(): NozarHapticsReturn {
  const ctx = useContext(HapticContext);
  if (ctx === null) {
    throw new Error(
      'useHaptics must be used within a <HapticProvider>. ' +
        'Wrap your component tree with <HapticProvider> in app/root.tsx.',
    );
  }
  return ctx;
}