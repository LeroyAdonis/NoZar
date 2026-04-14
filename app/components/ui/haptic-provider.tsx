import { useEffect } from 'react';
import { WebHaptics } from 'web-haptics';

export function HapticProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const haptics = new WebHaptics();
    
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Trigger haptics on click of any button or link
      if (target.closest('button') || target.closest('a')) {
        haptics.trigger('medium');
      }
    };
    
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('click', handler);
      haptics.destroy();
    };
  }, []);
  
  return <>{children}</>;
}
