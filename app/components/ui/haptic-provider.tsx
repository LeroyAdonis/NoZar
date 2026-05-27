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

const HapticContext = createContext<NozarHaptics | null>(null);

export function HapticProvider({ children }: { children: React.ReactNode }) {
  const { trigger } = useWebHaptics();

  const value = useMemo<NozarHaptics>(
    () => ({
      lightTap: () => { trigger('light'); },
      selection: () => { trigger('selection'); },
      success: () => { trigger('success'); },
      warning: () => { trigger('warning'); },
      error: () => { trigger('error'); },
      medium: () => { trigger('medium'); },
    }),
    [trigger],
  );

  return (
    <HapticContext.Provider value={value}>{children}</HapticContext.Provider>
  );
}

export function useHaptics(): NozarHaptics {
  const ctx = useContext(HapticContext);
  if (ctx === null) {
    throw new Error(
      'useHaptics must be used within a <HapticProvider>. ' +
        'Wrap your component tree with <HapticProvider> in app/root.tsx.',
    );
  }
  return ctx;
}
