import { useEffect, useRef } from 'react';

/**
 * usePolling — Circuit-breaker polling silencieux.
 *
 * Comportement normal  : appel toutes les `interval` ms.
 * Quand le backend est down (3 erreurs consécutives) : ralentit à 30s.
 * Dès que le backend répond : retour à `interval`.
 *
 * - Une seule requête à la fois (pendingRef).
 * - Aucune erreur visible dans la console UI.
 */
const BACKOFF_MS   = 30_000; // 30s quand le backend est DOWN
const ERROR_THRESH = 3;       // nombre d'échecs avant le circuit-breaker

const usePolling = (callback, interval = 3000, enabled = true) => {
  const savedCallback = useRef(callback);
  const timerRef      = useRef(null);
  const pendingRef    = useRef(false);
  const errorCount    = useRef(0);
  const mountedRef    = useRef(true);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;
    errorCount.current = 0;
    pendingRef.current = false;

    const schedule = (delay) => {
      timerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;

        if (!pendingRef.current) {
          pendingRef.current = true;
          try {
            await savedCallback.current();
            errorCount.current = 0; // succès → reset
          } catch {
            errorCount.current++;
          } finally {
            pendingRef.current = false;
          }
        }

        // Circuit-breaker : si trop d'erreurs, on ralentit
        const nextDelay = errorCount.current >= ERROR_THRESH ? BACKOFF_MS : interval;
        if (mountedRef.current) schedule(nextDelay);
      }, delay);
    };

    schedule(interval);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = false;
      errorCount.current = 0;
    };
  }, [interval, enabled]);
};

export default usePolling;
