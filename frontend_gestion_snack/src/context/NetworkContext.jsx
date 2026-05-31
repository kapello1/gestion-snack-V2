import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import { addPendingOrder, getPendingOrders, deletePendingOrder } from '../utils/offlineDB';

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const syncPending = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const pending = await getPendingOrders();
      if (!pending.length) return;
      let synced = 0;
      for (const order of pending) {
        const { tempId, ...data } = order;
        try {
          await api.post(API_ENDPOINTS.ORDERS.BASE, data);
          await deletePendingOrder(tempId);
          synced++;
        } catch {}
      }
      if (synced > 0) {
        setPendingCount(0);
        toast.success(`${synced} commande(s) synchronisée(s) avec succès`);
      }
    } catch {}
    finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      toast.info('Connexion rétablie', { autoClose: 2000 });
      syncPending();
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.warn('Mode hors ligne activé', { autoClose: 3000 });
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Service Worker message relay
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'SYNC_ORDERS') syncPending();
      });
    }

    // Load initial pending count
    getPendingOrders().then(p => setPendingCount(p.length)).catch(() => {});

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [syncPending]);

  // Queue or submit order depending on connectivity
  const queueOrder = useCallback(async (orderData) => {
    if (isOnline) {
      const res = await api.post(API_ENDPOINTS.ORDERS.BASE, orderData);
      return res.data;
    }
    const tempId = await addPendingOrder(orderData);
    setPendingCount(c => c + 1);
    toast.info('Commande enregistrée hors ligne – sera envoyée à la reconnexion', { autoClose: 4000 });
    return { offline: true, tempId };
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline, isSyncing, pendingCount, queueOrder, syncPending }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
};
