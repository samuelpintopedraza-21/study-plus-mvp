'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const SESSION_KEY = 'studyplus_session_boot_v1';

export function AppBoot() {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const hasBooted = sessionStorage.getItem(SESSION_KEY);
        if (!hasBooted) {
          await fetch('/api/session/clear', { method: 'POST' });
          sessionStorage.setItem(SESSION_KEY, '1');
          if (!cancelled) {
            router.refresh();
          }
        }
      } catch (error) {
        console.error('[Study+] No se pudo limpiar la sesión inicial.', error);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (ready) return null;

  return (
    <div className="boot-overlay" role="status" aria-live="polite">
      <div className="boot-card">
        <div className="boot-logo">Study+</div>
        <h2>Preparando un espacio limpio</h2>
        <p>
          Reiniciando la información de la demo para que cada vez que abras la app empieces desde cero.
        </p>
      </div>
    </div>
  );
}
