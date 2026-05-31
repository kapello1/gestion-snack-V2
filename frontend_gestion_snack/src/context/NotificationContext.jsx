import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

const NotificationContext = createContext(null);

const NOTIF_PREFIX = 'snack_notifs_';
const BROADCAST_KEY = 'snack_notifs_broadcast';

const uid2str = (uid) => String(uid ?? '');

const loadNotifs = (userId) => {
  try { return JSON.parse(localStorage.getItem(NOTIF_PREFIX + uid2str(userId)) || '[]'); } catch { return []; }
};
const saveNotifs = (userId, notifs) => {
  try { localStorage.setItem(NOTIF_PREFIX + uid2str(userId), JSON.stringify(notifs)); } catch {}
};
const loadBroadcasts = () => {
  try { return JSON.parse(localStorage.getItem(BROADCAST_KEY) || '[]'); } catch { return []; }
};
const saveBroadcasts = (b) => {
  try { localStorage.setItem(BROADCAST_KEY, JSON.stringify(b)); } catch {}
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const lastStatusRef = useRef({});

  const userId = uid2str(user?.userId || user?.customerId || '');

  const mergeAndSet = useCallback((uid) => {
    if (!uid) { setNotifications([]); return; }
    const personal = loadNotifs(uid);
    const broadcasts = loadBroadcasts().filter(b => !(b.readBy || []).map(uid2str).includes(uid2str(uid)));
    const all = [...personal, ...broadcasts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setNotifications(all);
  }, []);

  useEffect(() => {
    mergeAndSet(userId);
  }, [userId, mergeAndSet]);

  const addNotification = useCallback((notif) => {
    if (!userId) return;
    const newNotif = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notif,
    };
    setNotifications(prev => {
      const next = [newNotif, ...prev];
      saveNotifs(userId, next.filter(n => !n.isBroadcast));
      return next;
    });
  }, [userId]);

  const markAsRead = useCallback((notifId) => {
    if (!userId) return;
    setNotifications(prev => {
      const next = prev.map(n => n.id === notifId ? { ...n, read: true } : n);
      saveNotifs(userId, next.filter(n => !n.isBroadcast));
      const b = prev.find(n => n.id === notifId && n.isBroadcast);
      if (b) {
        const updated = loadBroadcasts().map(br =>
          br.id === notifId
            ? { ...br, readBy: [...new Set([...(br.readBy || []).map(uid2str), uid2str(userId)])] }
            : br
        );
        saveBroadcasts(updated);
      }
      return next;
    });
  }, [userId]);

  const markAllRead = useCallback(() => {
    if (!userId) return;
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveNotifs(userId, next.filter(n => !n.isBroadcast));
      const updated = loadBroadcasts().map(b => ({
        ...b,
        readBy: [...new Set([...(b.readBy || []).map(uid2str), uid2str(userId)])]
      }));
      saveBroadcasts(updated);
      return next;
    });
  }, [userId]);

  // Broadcast to all users
  const broadcastNotification = useCallback((message, title = 'Message de l\'administration') => {
    const notif = {
      id: Date.now() + Math.random(),
      title,
      message,
      timestamp: new Date().toISOString(),
      isBroadcast: true,
      type: 'admin_broadcast',
      readBy: [],
    };
    saveBroadcasts([...loadBroadcasts(), notif]);
    window.dispatchEvent(new StorageEvent('storage', { key: BROADCAST_KEY }));
  }, []);

  // Send to a specific user by their userId/customerId
  const sendToUser = useCallback((targetUserId, notif) => {
    if (!targetUserId) return;
    const tid = uid2str(targetUserId);
    const newNotif = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      type: 'admin_broadcast',
      ...notif,
    };
    const existing = loadNotifs(tid);
    saveNotifs(tid, [newNotif, ...existing]);
    // Trigger cross-tab sync for that user
    window.dispatchEvent(new StorageEvent('storage', { key: NOTIF_PREFIX + tid }));
  }, []);

  // Cross-tab sync
  useEffect(() => {
    if (!userId) return;
    const handle = (e) => {
      if (e.key === BROADCAST_KEY || e.key === NOTIF_PREFIX + userId) {
        mergeAndSet(userId);
      }
    };
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, [userId, mergeAndSet]);

  // Poll for order/reservation status changes (customers only)
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const custId = user?.customerId;
    if (!custId) return;

    const poll = async () => {
      try {
        const ordersRes = await api.get(API_ENDPOINTS.ORDERS.BY_CUSTOMER(custId));
        const orders = ordersRes.data || [];
        const statusLabels = {
          ACTIVE: 'En cours de préparation', CLOSED: 'Prête – en attente de service',
          SERVED: 'Servie', CANCELLED: 'Annulée', PAID: 'Payée',
        };
        orders.forEach(order => {
          const key = 'order_' + order.orderId;
          const prev = lastStatusRef.current[key];
          if (prev && prev !== order.status) {
            addNotification({
              type: 'order_status',
              title: '🍽️ Commande mise à jour',
              message: `Commande #${order.orderId} : ${statusLabels[order.status] || order.status}`,
            });
          }
          lastStatusRef.current[key] = order.status;
        });
      } catch {}

      try {
        const resaRes = await api.get(API_ENDPOINTS.RESERVATIONS.BY_CUSTOMER(custId));
        const reservations = resaRes.data || [];
        const statusLabels = { CONFIRMED: 'Confirmée', CANCELLED: 'Annulée', COMPLETED: 'Terminée' };
        reservations.forEach(resa => {
          const key = 'resa_' + resa.reservationId;
          const prev = lastStatusRef.current[key];
          if (prev && prev !== resa.status) {
            addNotification({
              type: 'reservation_status',
              title: '📅 Réservation mise à jour',
              message: `Réservation du ${new Date(resa.reservationDate).toLocaleDateString('fr-FR')} : ${statusLabels[resa.status] || resa.status}`,
            });
          }
          lastStatusRef.current[key] = resa.status;
        });
      } catch {}
    };

    const init = setTimeout(poll, 4000);
    const interval = setInterval(poll, 30000);
    return () => { clearTimeout(init); clearInterval(interval); };
  }, [isAuthenticated, userId, user, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount,
      addNotification, markAsRead, markAllRead,
      broadcastNotification, sendToUser,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
